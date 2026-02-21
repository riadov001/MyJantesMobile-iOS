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
import { adminInvoicesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const INVOICE_STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "paid", label: "Payée", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "sent", label: "Envoyée", color: "#3B82F6", bg: "#0F1D3D", icon: "send-outline" as const },
  { value: "overdue", label: "En retard", color: Colors.rejected, bg: Colors.rejectedBg, icon: "alert-circle-outline" as const },
  { value: "draft", label: "Brouillon", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "create-outline" as const },
  { value: "cancelled", label: "Annulée", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "close-circle-outline" as const },
];

function getInvoiceStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = INVOICE_STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "en_attente") return INVOICE_STATUS_OPTIONS[0];
  if (s === "payée" || s === "payé") return INVOICE_STATUS_OPTIONS[1];
  if (s === "envoyée") return INVOICE_STATUS_OPTIONS[2];
  if (s === "en_retard") return INVOICE_STATUS_OPTIONS[3];
  if (s === "brouillon") return INVOICE_STATUS_OPTIONS[4];
  if (s === "annulée") return INVOICE_STATUS_OPTIONS[5];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminInvoicesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: invoicesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: adminInvoicesApi.getAll,
  });

  const allInvoices = useMemo(() => Array.isArray(invoicesRaw) ? invoicesRaw : [], [invoicesRaw]);

  const invoices = useMemo(() => {
    let list = allInvoices;
    if (filterStatus) {
      list = list.filter((inv: any) => {
        const s = inv.status?.toLowerCase() || "";
        return s === filterStatus || (filterStatus === "paid" && (s === "payée" || s === "payé")) || (filterStatus === "pending" && s === "en_attente");
      });
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((inv: any) => {
      const num = (inv.invoiceNumber || inv.id || "").toString().toLowerCase();
      const client = `${inv.client?.firstName || ""} ${inv.client?.lastName || ""}`.toLowerCase();
      const email = (inv.client?.email || "").toLowerCase();
      return num.includes(q) || client.includes(q) || email.includes(q);
    });
  }, [allInvoices, search, filterStatus]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminInvoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      setEditModal(null);
      showAlert({ type: "success", title: "Succès", message: "La facture a été mise à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminInvoicesApi.createDirect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      setCreateModal(false);
      setNewClientId("");
      setNewAmount("");
      setNewNotes("");
      showAlert({ type: "success", title: "Succès", message: "La facture a été créée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer la facture.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminInvoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      showAlert({ type: "success", title: "Succès", message: "La facture a été supprimée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const handleEdit = useCallback((invoice: any) => {
    setEditStatus(invoice.status || "pending");
    setEditNotes(invoice.notes || "");
    setEditDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "");
    setEditModal(invoice);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editModal) return;
    const data: any = { status: editStatus, notes: editNotes };
    if (editDueDate) data.dueDate = editDueDate;
    updateMutation.mutate({ id: editModal.id, data });
  }, [editModal, editStatus, editNotes, editDueDate, updateMutation]);

  const handleCreate = useCallback(() => {
    if (!newAmount) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez renseigner un montant.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    createMutation.mutate({ clientId: newClientId || undefined, totalTTC: parseFloat(newAmount), notes: newNotes });
  }, [newClientId, newAmount, newNotes, createMutation, showAlert]);

  const handleDelete = useCallback(
    (invoice: any) => {
      const label = invoice.invoiceNumber || `#${invoice.id}`;
      showAlert({
        type: "warning",
        title: "Supprimer la facture",
        message: `Supprimer la facture ${label} ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(invoice.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allInvoices.forEach((inv: any) => {
      let s = inv.status?.toLowerCase() || "pending";
      if (s === "payée" || s === "payé") s = "paid";
      if (s === "en_attente") s = "pending";
      if (s === "envoyée") s = "sent";
      if (s === "en_retard") s = "overdue";
      if (s === "brouillon") s = "draft";
      if (s === "annulée") s = "cancelled";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allInvoices]);

  const totalRevenue = useMemo(() => {
    return allInvoices
      .filter((inv: any) => { const s = inv.status?.toLowerCase(); return s === "paid" || s === "payée" || s === "payé"; })
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalIncludingTax || inv.totalTTC || "0"), 0);
  }, [allInvoices]);

  const renderInvoice = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getInvoiceStatusInfo(item.status);
      const clientName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const total = parseFloat(item.totalIncludingTax || item.totalTTC || item.total || "0");

      return (
        <Pressable style={styles.card} onPress={() => router.push({ pathname: "/(main)/invoice-detail", params: { id: item.id } })}>
          <View style={styles.cardHeader}>
            <View style={styles.idRow}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
              <Text style={styles.idText}>{item.invoiceNumber || `#${item.id}`}</Text>
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
            {date ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{date}</Text>
              </View>
            ) : null}
            {item.dueDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="hourglass-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Éch. {new Date(item.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</Text>
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
    [handleEdit, handleDelete]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des factures</Text>
        <Pressable onPress={() => setCreateModal(true)} style={styles.headerBtn}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.revenueBar}>
        <View style={styles.revenueLeft}>
          <Ionicons name="wallet-outline" size={18} color={Colors.accepted} />
          <Text style={styles.revenueLabel}>CA encaissé</Text>
        </View>
        <Text style={styles.revenueValue}>{totalRevenue.toFixed(2)} €</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par numéro, client..."
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
        <Pressable style={[styles.filterChip, !filterStatus && styles.filterChipActive]} onPress={() => setFilterStatus(null)}>
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Toutes ({allInvoices.length})</Text>
        </Pressable>
        {INVOICE_STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
            onPress={() => setFilterStatus(filterStatus === opt.value ? null : opt.value)}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && { color: opt.color }]}>{opt.label} ({statusCounts[opt.value] || 0})</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{invoices.length} facture{invoices.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : invoices.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucune facture"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...invoices].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderInvoice}
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
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Modifier la facture</Text>
                  <Pressable onPress={() => setEditModal(null)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                <Text style={styles.modalSubtitle}>{editModal?.invoiceNumber || `#${editModal?.id}`}</Text>

                <Text style={styles.fieldLabel}>Statut</Text>
                <View style={styles.statusGrid}>
                  {INVOICE_STATUS_OPTIONS.map((opt) => (
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

                <Text style={styles.fieldLabel}>Date d'échéance (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="2026-03-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Notes..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => setCreateModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModal(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nouvelle facture</Text>
                  <Pressable onPress={() => setCreateModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>ID Client (optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newClientId}
                  onChangeText={setNewClientId}
                  placeholder="ID du client"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Montant TTC (€)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  placeholder="150.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  placeholder="Description de la facture..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Créer la facture</Text>}
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
  revenueBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.acceptedBg, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  revenueLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  revenueLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.accepted },
  revenueValue: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.accepted },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, height: 44 },
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
  idText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
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
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 8 },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
