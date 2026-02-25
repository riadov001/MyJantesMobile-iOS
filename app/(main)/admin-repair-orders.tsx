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
import { adminRepairOrdersApi, adminClientsApi, adminServicesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "document-outline" as const },
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "in_progress", label: "En cours", color: "#8B5CF6", bg: "#1E1145", icon: "construct-outline" as const },
  { value: "completed", label: "Terminé", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-done-outline" as const },
  { value: "cancelled", label: "Annulé", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "en_attente") return STATUS_OPTIONS[1];
  if (s === "en_cours") return STATUS_OPTIONS[2];
  if (s === "terminé" || s === "termine") return STATUS_OPTIONS[3];
  if (s === "annulé" || s === "annule") return STATUS_OPTIONS[4];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminRepairOrdersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formClient, setFormClient] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formServices, setFormServices] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formNotes, setFormNotes] = useState("");
  const [formScheduledDate, setFormScheduledDate] = useState("");
  const [formEstimatedEndDate, setFormEstimatedEndDate] = useState("");

  const { data: ordersRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-repair-orders"],
    queryFn: adminRepairOrdersApi.getAll,
  });

  const { data: clientsRaw } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: adminClientsApi.getAll,
  });

  const allOrders = useMemo(() => Array.isArray(ordersRaw) ? ordersRaw : [], [ordersRaw]);
  const allClients = useMemo(() => Array.isArray(clientsRaw) ? clientsRaw : [], [clientsRaw]);

  const orders = useMemo(() => {
    let list = allOrders;
    if (filterStatus) {
      list = list.filter((o: any) => o.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((o: any) => {
      const ref = (o.orderNumber || o.reference || o.id || "").toString().toLowerCase();
      const client = `${o.client?.firstName || o.firstName || ""} ${o.client?.lastName || o.lastName || ""}`.toLowerCase();
      const vehicle = (o.vehicleInfo || o.vehicle || "").toString().toLowerCase();
      const notes = (o.notes || "").toLowerCase();
      return ref.includes(q) || client.includes(q) || vehicle.includes(q) || notes.includes(q);
    });
  }, [allOrders, search, filterStatus]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminRepairOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-orders"] });
      setEditModal(null);
      setIsCreating(false);
      resetForm();
      showAlert({ type: "success", title: "Succès", message: "L'ordre de réparation a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminRepairOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-orders"] });
      setEditModal(null);
      setIsCreating(false);
      resetForm();
      showAlert({ type: "success", title: "Succès", message: "L'ordre de réparation a été mis à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const resetForm = useCallback(() => {
    setFormClient("");
    setFormVehicle("");
    setFormServices("");
    setFormStatus("draft");
    setFormNotes("");
    setFormScheduledDate("");
    setFormEstimatedEndDate("");
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setIsCreating(true);
    setEditModal({});
  }, [resetForm]);

  const handleEdit = useCallback((order: any) => {
    setFormClient(order.clientId || order.client?.id || "");
    setFormVehicle(typeof order.vehicleInfo === "string" ? order.vehicleInfo : JSON.stringify(order.vehicleInfo || ""));
    setFormServices(Array.isArray(order.services) ? order.services.map((s: any) => s.name || s).join(", ") : (order.services || ""));
    setFormStatus(order.status || "draft");
    setFormNotes(order.notes || "");
    setFormScheduledDate(order.scheduledDate ? new Date(order.scheduledDate).toISOString().split("T")[0] : "");
    setFormEstimatedEndDate(order.estimatedEndDate ? new Date(order.estimatedEndDate).toISOString().split("T")[0] : "");
    setIsCreating(false);
    setEditModal(order);
  }, []);

  const handleSave = useCallback(() => {
    if (!editModal) return;
    const data: any = {
      clientId: formClient || undefined,
      vehicleInfo: formVehicle || undefined,
      services: formServices || undefined,
      status: formStatus,
      notes: formNotes || undefined,
      scheduledDate: formScheduledDate || undefined,
      estimatedEndDate: formEstimatedEndDate || undefined,
    };
    if (isCreating) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: editModal.id, data });
    }
  }, [editModal, formClient, formVehicle, formServices, formStatus, formNotes, formScheduledDate, formEstimatedEndDate, isCreating, createMutation, updateMutation]);

  const handleCloseModal = useCallback(() => {
    setEditModal(null);
    setIsCreating(false);
    resetForm();
  }, [resetForm]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allOrders.forEach((o: any) => {
      const s = o.status?.toLowerCase() || "draft";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allOrders]);

  const renderOrder = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const clientName = `${item.client?.firstName || item.firstName || ""} ${item.client?.lastName || item.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const scheduledDate = item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const vehicle = typeof item.vehicleInfo === "object" ? `${item.vehicleInfo?.brand || ""} ${item.vehicleInfo?.model || ""}`.trim() : (item.vehicleInfo || "");

      return (
        <Pressable style={styles.card} onPress={() => handleEdit(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.orderIdRow}>
              <Ionicons name="build-outline" size={16} color={Colors.primary} />
              <Text style={styles.orderNumber}>{item.orderNumber || item.reference || `OR-${item.id}`}</Text>
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
            {vehicle ? (
              <View style={styles.infoRow}>
                <Ionicons name="car-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{vehicle}</Text>
              </View>
            ) : null}
            {scheduledDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{scheduledDate}</Text>
              </View>
            ) : null}
            {date ? (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Créé le {date}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }} />
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); handleEdit(item); }}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleEdit]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ordres de réparation</Text>
        <Pressable onPress={handleCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par référence, client, véhicule..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allOrders.length})</Text>
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

      <Text style={styles.countText}>{orders.length} ordre{orders.length !== 1 ? "s" : ""} de réparation</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="build-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun ordre de réparation"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...orders].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderOrder}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={!!editModal} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{isCreating ? "Nouvel ordre de réparation" : "Modifier l'ordre"}</Text>
                  <Pressable onPress={handleCloseModal}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                {!isCreating && editModal?.orderNumber && (
                  <Text style={styles.modalSubtitle}>{editModal.orderNumber || editModal.reference || `OR-${editModal.id}`}</Text>
                )}

                <Text style={styles.fieldLabel}>Client</Text>
                {allClients.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                    {allClients.slice(0, 20).map((c: any) => (
                      <Pressable
                        key={c.id}
                        style={[styles.clientChip, formClient === c.id?.toString() && styles.clientChipActive]}
                        onPress={() => setFormClient(c.id?.toString())}
                      >
                        <Text style={[styles.clientChipText, formClient === c.id?.toString() && styles.clientChipTextActive]} numberOfLines={1}>
                          {`${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    value={formClient}
                    onChangeText={setFormClient}
                    placeholder="ID du client"
                    placeholderTextColor={Colors.textTertiary}
                  />
                )}

                <Text style={styles.fieldLabel}>Véhicule</Text>
                <TextInput
                  style={styles.textInput}
                  value={formVehicle}
                  onChangeText={setFormVehicle}
                  placeholder="Marque, modèle, immatriculation..."
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Services</Text>
                <TextInput
                  style={styles.textInput}
                  value={formServices}
                  onChangeText={setFormServices}
                  placeholder="Services à effectuer..."
                  placeholderTextColor={Colors.textTertiary}
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

                <Text style={styles.fieldLabel}>Date prévue (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formScheduledDate}
                  onChangeText={setFormScheduledDate}
                  placeholder="2025-01-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Date de fin estimée (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formEstimatedEndDate}
                  onChangeText={setFormEstimatedEndDate}
                  placeholder="2025-01-20"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Notes internes..."
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
                    <Text style={styles.saveBtnText}>{isCreating ? "Créer" : "Enregistrer"}</Text>
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
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderNumber: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 12, height: 44 },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  clientChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
  clientChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  clientChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, maxWidth: 120 },
  clientChipTextActive: { color: "#fff" },
});
