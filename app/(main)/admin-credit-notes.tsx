import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminCreditNotesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "document-outline" as const },
  { value: "issued", label: "Émis", color: "#3B82F6", bg: "#0F1D3D", icon: "checkmark-circle-outline" as const },
  { value: "applied", label: "Appliqué", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-done-outline" as const },
  { value: "cancelled", label: "Annulé", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminCreditNotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [formInvoiceRef, setFormInvoiceRef] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: creditNotesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-credit-notes"],
    queryFn: adminCreditNotesApi.getAll,
  });

  const allCreditNotes = useMemo(() => Array.isArray(creditNotesRaw) ? creditNotesRaw : [], [creditNotesRaw]);

  const creditNotes = useMemo(() => {
    let list = allCreditNotes;
    if (filterStatus) {
      list = list.filter((c: any) => c.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((c: any) => {
      const ref = (c.creditNoteNumber || c.reference || c.id || "").toString().toLowerCase();
      const invoiceRef = (c.invoiceNumber || c.invoiceReference || c.invoiceId || "").toString().toLowerCase();
      const reason = (c.reason || c.description || "").toLowerCase();
      const client = `${c.client?.firstName || ""} ${c.client?.lastName || ""}`.toLowerCase();
      return ref.includes(q) || invoiceRef.includes(q) || reason.includes(q) || client.includes(q);
    });
  }, [allCreditNotes, search, filterStatus]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminCreditNotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credit-notes"] });
      setCreateModal(false);
      resetForm();
      showAlert({ type: "success", title: "Succès", message: "L'avoir a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer l'avoir.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const resetForm = useCallback(() => {
    setFormInvoiceRef("");
    setFormAmount("");
    setFormReason("");
    setFormDate(new Date().toISOString().split("T")[0]);
  }, []);

  const handleCreate = useCallback(() => {
    if (!formAmount.trim()) {
      showAlert({ type: "warning", title: "Champ requis", message: "Veuillez saisir un montant.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    createMutation.mutate({
      invoiceReference: formInvoiceRef.trim(),
      amount: parseFloat(formAmount),
      reason: formReason.trim(),
      date: formDate,
    });
  }, [formInvoiceRef, formAmount, formReason, formDate, createMutation, showAlert]);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setCreateModal(true);
  }, [resetForm]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allCreditNotes.forEach((c: any) => {
      const s = c.status?.toLowerCase() || "draft";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allCreditNotes]);

  const renderCreditNote = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const clientName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const amount = parseFloat(item.amount || item.totalAmount || "0");
      const ref = item.creditNoteNumber || item.reference || `#${item.id}`;
      const invoiceRef = item.invoiceNumber || item.invoiceReference || item.invoiceId || "";

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.idRow}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
              <Text style={styles.refNumber}>{ref}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {invoiceRef ? (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>Facture: {invoiceRef}</Text>
              </View>
            ) : null}
            {clientName ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{clientName}</Text>
              </View>
            ) : null}
            {(item.reason || item.description) ? (
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={2}>{item.reason || item.description}</Text>
              </View>
            ) : null}
            {date ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{date}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.totalValue}>{amount > 0 ? `${amount.toFixed(2)} €` : "—"}</Text>
          </View>
        </View>
      );
    },
    []
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Avoirs</Text>
        <Pressable onPress={handleOpenCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par référence, facture, motif..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
        <Pressable
          style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allCreditNotes.length})</Text>
        </Pressable>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
            onPress={() => setFilterStatus(filterStatus === opt.value ? null : opt.value)}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && { color: opt.color }]}>
              {opt.label} ({statusCounts[opt.value] || 0})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{creditNotes.length} avoir{creditNotes.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : creditNotes.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun avoir"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...creditNotes].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderCreditNote}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => setCreateModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModal(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvel avoir</Text>
                <Pressable onPress={() => setCreateModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>Créer un avoir (note de crédit)</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Référence facture</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formInvoiceRef}
                  onChangeText={setFormInvoiceRef}
                  placeholder="N° de facture associée..."
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Montant (€) *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Motif</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formReason}
                  onChangeText={setFormReason}
                  placeholder="Raison de l'avoir..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Pressable
                  style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Créer l'avoir</Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {AlertComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, height: 44, padding: 0 },
  filterRow: { maxHeight: 44, marginTop: 10 },
  filterRowContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginHorizontal: 16, marginTop: 10, marginBottom: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  refNumber: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  fieldInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, height: 44, marginBottom: 4 },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80, marginBottom: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
