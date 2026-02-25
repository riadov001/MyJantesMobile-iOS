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
import { adminEngagementsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "active", label: "Actif", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "completed", label: "Terminé", color: "#3B82F6", bg: "#0F1D3D", icon: "checkmark-done-outline" as const },
  { value: "cancelled", label: "Annulé", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "ban-outline" as const },
  { value: "expired", label: "Expiré", color: Colors.rejected, bg: Colors.rejectedBg, icon: "alert-circle-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminEngagementsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formClient, setFormClient] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data: engagementsRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-engagements"],
    queryFn: adminEngagementsApi.getAll,
  });

  const { data: summaryRaw } = useQuery({
    queryKey: ["admin-engagements-summary"],
    queryFn: adminEngagementsApi.getSummary,
  });

  const allEngagements = useMemo(() => Array.isArray(engagementsRaw) ? engagementsRaw : [], [engagementsRaw]);
  const summary = summaryRaw || {};

  const engagements = useMemo(() => {
    let list = allEngagements;
    if (filterStatus) {
      list = list.filter((e: any) => e.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((e: any) => {
      const client = (e.clientName || e.client?.firstName || e.client?.lastName || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      const id = (e.id || "").toString().toLowerCase();
      return client.includes(q) || desc.includes(q) || id.includes(q);
    });
  }, [allEngagements, search, filterStatus]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminEngagementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-engagements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-engagements-summary"] });
      setModalVisible(false);
      resetForm();
      showAlert({ type: "success", title: "Succès", message: "L'engagement a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer l'engagement.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminEngagementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-engagements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-engagements-summary"] });
      setModalVisible(false);
      resetForm();
      showAlert({ type: "success", title: "Succès", message: "L'engagement a été mis à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const resetForm = useCallback(() => {
    setEditingItem(null);
    setFormClient("");
    setFormAmount("");
    setFormStatus("pending");
    setFormStartDate("");
    setFormEndDate("");
    setFormDescription("");
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const handleEdit = useCallback((item: any) => {
    setEditingItem(item);
    setFormClient(item.clientName || item.client?.firstName || "");
    setFormAmount((item.amount || item.totalAmount || "").toString());
    setFormStatus(item.status || "pending");
    setFormStartDate(item.startDate || item.dateDebut || "");
    setFormEndDate(item.endDate || item.dateFin || "");
    setFormDescription(item.description || item.notes || "");
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    const data: any = {
      clientName: formClient,
      amount: formAmount,
      status: formStatus,
      startDate: formStartDate,
      endDate: formEndDate,
      description: formDescription,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingItem, formClient, formAmount, formStatus, formStartDate, formEndDate, formDescription, updateMutation, createMutation]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEngagements.forEach((e: any) => {
      const s = e.status?.toLowerCase() || "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allEngagements]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderSummary = useCallback(() => {
    if (!summary || (!summary.total && !summary.totalAmount && !summary.count)) return null;
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="stats-chart-outline" size={18} color={Colors.primary} />
          <Text style={styles.summaryTitle}>Résumé des engagements</Text>
        </View>
        <View style={styles.summaryGrid}>
          {(summary.total !== undefined || summary.count !== undefined) && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.total ?? summary.count ?? 0}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          )}
          {summary.totalAmount !== undefined && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{parseFloat(summary.totalAmount || 0).toFixed(2)} €</Text>
              <Text style={styles.summaryLabel}>Montant</Text>
            </View>
          )}
          {summary.active !== undefined && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.accepted }]}>{summary.active}</Text>
              <Text style={styles.summaryLabel}>Actifs</Text>
            </View>
          )}
          {summary.pending !== undefined && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.pending }]}>{summary.pending}</Text>
              <Text style={styles.summaryLabel}>En attente</Text>
            </View>
          )}
          {summary.completed !== undefined && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#3B82F6" }]}>{summary.completed}</Text>
              <Text style={styles.summaryLabel}>Terminés</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [summary]);

  const renderEngagement = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const clientName = (item.clientName || `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim()) || "—";
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const amount = parseFloat(item.amount || item.totalAmount || "0");

      return (
        <Pressable style={styles.card} onPress={() => handleEdit(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.idRow}>
              <Ionicons name="briefcase-outline" size={16} color={Colors.primary} />
              <Text style={styles.idText}>#{item.id}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {clientName !== "—" && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{clientName}</Text>
              </View>
            )}
            {item.description ? (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={2}>{item.description}</Text>
              </View>
            ) : null}
            {(item.startDate || item.dateDebut) ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>
                  {new Date(item.startDate || item.dateDebut).toLocaleDateString("fr-FR")}
                  {(item.endDate || item.dateFin) ? ` - ${new Date(item.endDate || item.dateFin).toLocaleDateString("fr-FR")}` : ""}
                </Text>
              </View>
            ) : date ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{date}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.totalValue}>{amount > 0 ? `${amount.toFixed(2)} €` : "—"}</Text>
            <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); handleEdit(item); }}>
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [handleEdit]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Engagements</Text>
        <Pressable onPress={handleCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client, description..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allEngagements.length})</Text>
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

      <Text style={styles.countText}>{engagements.length} engagement{engagements.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[...engagements].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderEngagement}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderSummary}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="briefcase-outline" size={56} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun engagement"}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => { setModalVisible(false); resetForm(); }}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingItem ? "Modifier" : "Nouvel engagement"}</Text>
                  <Pressable onPress={() => { setModalVisible(false); resetForm(); }}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Client</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formClient}
                  onChangeText={setFormClient}
                  placeholder="Nom du client"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Montant (€)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Statut</Text>
                <View style={styles.statusGrid}>
                  {STATUS_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.statusOption, formStatus === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
                      onPress={() => setFormStatus(opt.value)}
                    >
                      <Ionicons name={opt.icon} size={16} color={formStatus === opt.value ? opt.color : Colors.textSecondary} />
                      <Text style={[styles.statusOptionText, formStatus === opt.value && { color: opt.color }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Date de début (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formStartDate}
                  onChangeText={setFormStartDate}
                  placeholder="2025-01-01"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Date de fin (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formEndDate}
                  onChangeText={setFormEndDate}
                  placeholder="2025-12-31"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Description de l'engagement..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingItem ? "Enregistrer" : "Créer"}</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryItem: { alignItems: "center", minWidth: 60, flex: 1 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
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
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  fieldInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, height: 44, marginBottom: 4 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
