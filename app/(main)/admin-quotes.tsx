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
import { adminQuotesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "accepted", label: "Accepté", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "rejected", label: "Refusé", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const },
  { value: "completed", label: "Terminé", color: "#3B82F6", bg: "#0F1D3D", icon: "checkmark-done-outline" as const },
  { value: "in_progress", label: "En cours", color: "#8B5CF6", bg: "#1E1145", icon: "construct-outline" as const },
  { value: "cancelled", label: "Annulé", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "ban-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "en_attente") return STATUS_OPTIONS[0];
  if (s === "accepté" || s === "accepte") return STATUS_OPTIONS[1];
  if (s === "refusé" || s === "refuse") return STATUS_OPTIONS[2];
  if (s === "terminé" || s === "termine") return STATUS_OPTIONS[3];
  if (s === "en_cours") return STATUS_OPTIONS[4];
  if (s === "annulé" || s === "annule") return STATUS_OPTIONS[5];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminQuotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: quotesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: adminQuotesApi.getAll,
  });

  const allQuotes = useMemo(() => Array.isArray(quotesRaw) ? quotesRaw : [], [quotesRaw]);

  const quotes = useMemo(() => {
    let list = allQuotes;
    if (filterStatus) {
      list = list.filter((q: any) => q.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((c: any) => {
      const num = (c.quoteNumber || c.id || "").toString().toLowerCase();
      const client = `${c.client?.firstName || c.firstName || ""} ${c.client?.lastName || c.lastName || ""}`.toLowerCase();
      const email = (c.client?.email || c.email || "").toLowerCase();
      const service = (c.serviceName || c.service?.name || "").toLowerCase();
      return num.includes(q) || client.includes(q) || email.includes(q) || service.includes(q);
    });
  }, [allQuotes, search, filterStatus]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminQuotesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      setEditModal(null);
      showAlert({ type: "success", title: "Succès", message: "Le devis a été mis à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminQuotesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      showAlert({ type: "success", title: "Succès", message: "Le devis a été supprimé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const handleEdit = useCallback((quote: any) => {
    setEditStatus(quote.status || "pending");
    setEditNotes(quote.adminNotes || quote.notes || "");
    setEditModal(quote);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editModal) return;
    updateMutation.mutate({ id: editModal.id, data: { status: editStatus, adminNotes: editNotes } });
  }, [editModal, editStatus, editNotes, updateMutation]);

  const handleDelete = useCallback(
    (quote: any) => {
      const label = quote.quoteNumber || `#${quote.id}`;
      showAlert({
        type: "warning",
        title: "Supprimer le devis",
        message: `Supprimer le devis ${label} ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(quote.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const handleViewDetail = useCallback((quote: any) => {
    router.push({ pathname: "/(main)/quote-detail", params: { id: quote.id } });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allQuotes.forEach((q: any) => {
      const s = q.status?.toLowerCase() || "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allQuotes]);

  const renderQuote = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const clientName = `${item.client?.firstName || item.firstName || ""} ${item.client?.lastName || item.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const total = parseFloat(item.totalTTC || item.totalIncludingTax || item.total || "0");

      return (
        <Pressable style={styles.card} onPress={() => handleViewDetail(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.quoteIdRow}>
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
              <Text style={styles.quoteNumber}>{item.quoteNumber || `#${item.id}`}</Text>
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
            {(item.serviceName || item.service?.name) ? (
              <View style={styles.infoRow}>
                <Ionicons name="construct-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.serviceName || item.service?.name}</Text>
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
            <Text style={styles.totalValue}>{total > 0 ? `${total.toFixed(2)} €` : "—"}</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); handleEdit(item); }}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </Pressable>
              <Pressable style={styles.actionBtnDanger} onPress={(e) => { e.stopPropagation?.(); handleDelete(item); }}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleViewDetail, handleEdit, handleDelete]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des devis</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par numéro, client, service..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allQuotes.length})</Text>
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

      <Text style={styles.countText}>{quotes.length} devis</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : quotes.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun devis"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...quotes].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderQuote}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={!!editModal} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier le devis</Text>
                <Pressable onPress={() => setEditModal(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>{editModal?.quoteNumber || `#${editModal?.id}`}</Text>

              <Text style={styles.fieldLabel}>Statut</Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.statusOption, editStatus === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
                    onPress={() => setEditStatus(opt.value)}
                  >
                    <Ionicons name={opt.icon} size={16} color={editStatus === opt.value ? opt.color : Colors.textSecondary} />
                    <Text style={[styles.statusOptionText, editStatus === opt.value && { color: opt.color }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Notes admin</Text>
              <TextInput
                style={styles.notesInput}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Notes internes..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
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
  quoteIdRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  quoteNumber: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  actionBtnDanger: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.errorLight, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
