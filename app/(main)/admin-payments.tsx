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
import { adminPaymentsApi, adminClientsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "paid", label: "Payé", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "failed", label: "Échoué", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const },
  { value: "refunded", label: "Remboursé", color: "#3B82F6", bg: "#0F1D3D", icon: "return-down-back-outline" as const },
  { value: "cancelled", label: "Annulé", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "ban-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "completed" || s === "success") return STATUS_OPTIONS[1];
  if (s === "error") return STATUS_OPTIONS[2];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [linkAmount, setLinkAmount] = useState("");
  const [linkClientId, setLinkClientId] = useState("");
  const [linkDescription, setLinkDescription] = useState("");

  const { data: paymentsRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: adminPaymentsApi.getAll,
  });

  const { data: clientsRaw } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: adminClientsApi.getAll,
  });

  const allPayments = useMemo(() => Array.isArray(paymentsRaw) ? paymentsRaw : [], [paymentsRaw]);
  const allClients = useMemo(() => Array.isArray(clientsRaw) ? clientsRaw : [], [clientsRaw]);

  const payments = useMemo(() => {
    let list = allPayments;
    if (filterStatus) {
      list = list.filter((p: any) => p.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((p: any) => {
      const ref = (p.reference || p.paymentNumber || p.id || "").toString().toLowerCase();
      const client = `${p.client?.firstName || p.firstName || ""} ${p.client?.lastName || p.lastName || ""}`.toLowerCase();
      const email = (p.client?.email || p.email || "").toLowerCase();
      const amount = (p.amount || p.totalTTC || "").toString().toLowerCase();
      return ref.includes(q) || client.includes(q) || email.includes(q) || amount.includes(q);
    });
  }, [allPayments, search, filterStatus]);

  const generateLinkMutation = useMutation({
    mutationFn: (data: any) => adminPaymentsApi.generateLink(data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      setGenerateModal(false);
      setLinkAmount("");
      setLinkClientId("");
      setLinkDescription("");
      const link = result?.paymentLink || result?.link || result?.url || "";
      showAlert({
        type: "success",
        title: "Lien généré",
        message: link ? `Lien de paiement créé avec succès.` : "Le lien de paiement a été généré.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    },
    onError: (err: any) => {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de générer le lien.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    },
  });

  const handleGenerateLink = useCallback(() => {
    if (!linkAmount || parseFloat(linkAmount) <= 0) {
      showAlert({
        type: "warning",
        title: "Montant requis",
        message: "Veuillez saisir un montant valide.",
        buttons: [{ text: "OK", style: "primary" }],
      });
      return;
    }
    generateLinkMutation.mutate({
      amount: parseFloat(linkAmount),
      clientId: linkClientId || undefined,
      description: linkDescription || undefined,
    });
  }, [linkAmount, linkClientId, linkDescription, generateLinkMutation, showAlert]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const s = p.status?.toLowerCase() || "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allPayments]);

  const renderPayment = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const clientName = `${item.client?.firstName || item.firstName || ""} ${item.client?.lastName || item.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const amount = parseFloat(item.amount || item.totalTTC || item.total || "0");

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.refRow}>
              <Ionicons name="card-outline" size={16} color={Colors.primary} />
              <Text style={styles.refNumber}>{item.reference || item.paymentNumber || `#${item.id}`}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {clientName ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{clientName}</Text>
              </View>
            ) : null}
            {(item.client?.email || item.email) ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.client?.email || item.email}</Text>
              </View>
            ) : null}
            {item.method || item.paymentMethod ? (
              <View style={styles.infoRow}>
                <Ionicons name="wallet-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.method || item.paymentMethod}</Text>
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
        <Text style={styles.headerTitle}>Gestion des paiements</Text>
        <Pressable onPress={() => setGenerateModal(true)} style={styles.headerBtn}>
          <Ionicons name="link-outline" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par référence, client, montant..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allPayments.length})</Text>
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

      <Text style={styles.countText}>{payments.length} paiement{payments.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="card-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun paiement"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...payments].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderPayment}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={generateModal} transparent animationType="fade" onRequestClose={() => setGenerateModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setGenerateModal(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Générer un lien de paiement</Text>
                <Pressable onPress={() => setGenerateModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Montant (€) *</Text>
              <TextInput
                style={styles.fieldInput}
                value={linkAmount}
                onChangeText={setLinkAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Client</Text>
              <ScrollView style={styles.clientPicker} nestedScrollEnabled>
                <Pressable
                  style={[styles.clientOption, !linkClientId && styles.clientOptionActive]}
                  onPress={() => setLinkClientId("")}
                >
                  <Text style={[styles.clientOptionText, !linkClientId && styles.clientOptionTextActive]}>Aucun (lien générique)</Text>
                </Pressable>
                {allClients.map((c: any) => (
                  <Pressable
                    key={c.id}
                    style={[styles.clientOption, linkClientId === c.id?.toString() && styles.clientOptionActive]}
                    onPress={() => setLinkClientId(c.id?.toString())}
                  >
                    <Text style={[styles.clientOptionText, linkClientId === c.id?.toString() && styles.clientOptionTextActive]} numberOfLines={1}>
                      {`${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.notesInput}
                value={linkDescription}
                onChangeText={setLinkDescription}
                placeholder="Description du paiement..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.saveBtn, generateLinkMutation.isPending && { opacity: 0.6 }]}
                onPress={handleGenerateLink}
                disabled={generateLinkMutation.isPending}
              >
                {generateLinkMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.saveBtnContent}>
                    <Ionicons name="link-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Générer le lien</Text>
                  </View>
                )}
              </Pressable>
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
  refRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  fieldInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  clientPicker: { maxHeight: 140, backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  clientOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  clientOptionActive: { backgroundColor: Colors.primary + "20" },
  clientOptionText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  clientOptionTextActive: { color: Colors.primary, fontFamily: "Inter_500Medium" },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 60 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
