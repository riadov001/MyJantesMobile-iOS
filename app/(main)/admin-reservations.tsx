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
import { adminReservationsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const RESERVATION_STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const },
  { value: "confirmed", label: "Confirmée", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "in_progress", label: "En cours", color: "#8B5CF6", bg: "#1E1145", icon: "construct-outline" as const },
  { value: "completed", label: "Terminée", color: "#3B82F6", bg: "#0F1D3D", icon: "checkmark-done-outline" as const },
  { value: "cancelled", label: "Annulée", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "close-circle-outline" as const },
  { value: "no_show", label: "Absent", color: Colors.rejected, bg: Colors.rejectedBg, icon: "alert-circle-outline" as const },
];

function getReservationStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = RESERVATION_STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "en_attente") return RESERVATION_STATUS_OPTIONS[0];
  if (s === "confirmée" || s === "confirmee") return RESERVATION_STATUS_OPTIONS[1];
  if (s === "en_cours") return RESERVATION_STATUS_OPTIONS[2];
  if (s === "terminée" || s === "terminee") return RESERVATION_STATUS_OPTIONS[3];
  if (s === "annulée" || s === "annulee") return RESERVATION_STATUS_OPTIONS[4];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

export default function AdminReservationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newService, setNewService] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: reservationsRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: adminReservationsApi.getAll,
  });

  const allReservations = useMemo(() => Array.isArray(reservationsRaw) ? reservationsRaw : [], [reservationsRaw]);

  const reservations = useMemo(() => {
    let list = allReservations;
    if (filterStatus) {
      list = list.filter((r: any) => r.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((r: any) => {
      const client = `${r.client?.firstName || r.firstName || ""} ${r.client?.lastName || r.lastName || ""}`.toLowerCase();
      const email = (r.client?.email || r.email || "").toLowerCase();
      const service = (r.serviceName || r.service?.name || r.service || "").toLowerCase();
      const id = (r.id || "").toString().toLowerCase();
      return client.includes(q) || email.includes(q) || service.includes(q) || id.includes(q);
    });
  }, [allReservations, search, filterStatus]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminReservationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      setEditModal(null);
      showAlert({ type: "success", title: "Succès", message: "La réservation a été mise à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminReservationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      setCreateModal(false);
      setNewClientId("");
      setNewDate("");
      setNewTime("");
      setNewService("");
      setNewNotes("");
      showAlert({ type: "success", title: "Succès", message: "La réservation a été créée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer la réservation.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminReservationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      showAlert({ type: "success", title: "Succès", message: "La réservation a été supprimée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const handleEdit = useCallback((reservation: any) => {
    setEditStatus(reservation.status || "pending");
    setEditNotes(reservation.notes || "");
    setEditModal(reservation);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editModal) return;
    updateMutation.mutate({ id: editModal.id, data: { status: editStatus, notes: editNotes } });
  }, [editModal, editStatus, editNotes, updateMutation]);

  const handleCreate = useCallback(() => {
    if (!newDate) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez renseigner une date.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    createMutation.mutate({
      clientId: newClientId || undefined,
      date: newDate,
      time: newTime || undefined,
      serviceName: newService || undefined,
      notes: newNotes || undefined,
    });
  }, [newClientId, newDate, newTime, newService, newNotes, createMutation, showAlert]);

  const handleDelete = useCallback(
    (reservation: any) => {
      showAlert({
        type: "warning",
        title: "Supprimer la réservation",
        message: `Supprimer la réservation #${reservation.id} ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(reservation.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allReservations.forEach((r: any) => {
      const s = r.status?.toLowerCase() || "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allReservations]);

  const renderReservation = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getReservationStatusInfo(item.status);
      const clientName = `${item.client?.firstName || item.firstName || ""} ${item.client?.lastName || item.lastName || ""}`.trim();
      const date = item.date ? new Date(item.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
      const time = item.time || item.timeSlot || "";
      const service = item.serviceName || item.service?.name || item.service || "";

      return (
        <Pressable style={styles.card} onPress={() => router.push({ pathname: "/(main)/reservation-detail" as any, params: { id: item.id } })}>
          <View style={styles.cardHeader}>
            <View style={styles.idRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.idText}>#{item.id}</Text>
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
                <Ionicons name="calendar" size={14} color={Colors.primary} />
                <Text style={[styles.infoText, { color: Colors.text }]}>{date}{time ? ` à ${time}` : ""}</Text>
              </View>
            ) : null}
            {service ? (
              <View style={styles.infoRow}>
                <Ionicons name="construct-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{service}</Text>
              </View>
            ) : null}
            {item.notes ? (
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <View />
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
        <Text style={styles.headerTitle}>Gestion des réservations</Text>
        <Pressable onPress={() => setCreateModal(true)} style={styles.headerBtn}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client, service..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Toutes ({allReservations.length})</Text>
        </Pressable>
        {RESERVATION_STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
            onPress={() => setFilterStatus(filterStatus === opt.value ? null : opt.value)}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && { color: opt.color }]}>{opt.label} ({statusCounts[opt.value] || 0})</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{reservations.length} réservation{reservations.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : reservations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucune réservation"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...reservations].sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())}
          renderItem={renderReservation}
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
                  <Text style={styles.modalTitle}>Modifier la réservation</Text>
                  <Pressable onPress={() => setEditModal(null)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                <Text style={styles.modalSubtitle}>#{editModal?.id}</Text>

                <Text style={styles.fieldLabel}>Statut</Text>
                <View style={styles.statusGrid}>
                  {RESERVATION_STATUS_OPTIONS.map((opt) => (
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
                  <Text style={styles.modalTitle}>Nouvelle réservation</Text>
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

                <Text style={styles.fieldLabel}>Date (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholder="2026-03-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Heure (optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="10:00"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Service (optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newService}
                  onChangeText={setNewService}
                  placeholder="Nom du service"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  placeholder="Détails de la réservation..."
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
                  {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Créer la réservation</Text>}
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
  idText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
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
