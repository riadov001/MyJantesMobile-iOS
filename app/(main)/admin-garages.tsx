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
import { superAdminApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const STATUS_OPTIONS = [
  { value: "active", label: "Actif", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const },
  { value: "inactive", label: "Inactif", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "pause-circle-outline" as const },
  { value: "suspended", label: "Suspendu", color: Colors.rejected, bg: Colors.rejectedBg, icon: "ban-outline" as const },
];

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  const found = STATUS_OPTIONS.find((o) => o.value === s);
  if (found) return found;
  if (s === "actif") return STATUS_OPTIONS[0];
  if (s === "inactif") return STATUS_OPTIONS[1];
  if (s === "suspendu") return STATUS_OPTIONS[2];
  return { value: s, label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

const EMPTY_FORM = {
  name: "",
  address: "",
  phone: "",
  email: "",
  siret: "",
  status: "active",
};

export default function AdminGaragesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGarage, setEditingGarage] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: garagesRaw, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-garages"],
    queryFn: superAdminApi.getGarages,
  });

  const allGarages = useMemo(() => Array.isArray(garagesRaw) ? garagesRaw : [], [garagesRaw]);

  const garages = useMemo(() => {
    let list = allGarages;
    if (filterStatus) {
      list = list.filter((g: any) => g.status?.toLowerCase() === filterStatus);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((g: any) => {
      const name = (g.name || "").toLowerCase();
      const email = (g.email || "").toLowerCase();
      const phone = (g.phone || "").toLowerCase();
      const siret = (g.siret || "").toLowerCase();
      const address = (g.address || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || siret.includes(q) || address.includes(q);
    });
  }, [allGarages, search, filterStatus]);

  const createMutation = useMutation({
    mutationFn: (data: any) => superAdminApi.createGarage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-garages"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "Le garage a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer le garage.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => superAdminApi.updateGarage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-garages"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "Le garage a été mis à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteGarage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-garages"] });
      showAlert({ type: "success", title: "Succès", message: "Le garage a été supprimé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingGarage(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  const handleCreate = useCallback(() => {
    setEditingGarage(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((garage: any) => {
    setEditingGarage(garage);
    setForm({
      name: garage.name || "",
      address: garage.address || "",
      phone: garage.phone || "",
      email: garage.email || "",
      siret: garage.siret || "",
      status: garage.status || "active",
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      showAlert({ type: "warning", title: "Champ requis", message: "Le nom du garage est obligatoire.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    if (editingGarage) {
      updateMutation.mutate({ id: editingGarage.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }, [editingGarage, form, updateMutation, createMutation, showAlert]);

  const handleDelete = useCallback(
    (garage: any) => {
      const label = garage.name || `#${garage.id}`;
      showAlert({
        type: "warning",
        title: "Supprimer le garage",
        message: `Supprimer "${label}" ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(garage.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allGarages.forEach((g: any) => {
      const s = g.status?.toLowerCase() || "active";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allGarages]);

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const renderGarage = useCallback(
    ({ item }: { item: any }) => {
      const statusInfo = getStatusInfo(item.status);
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.garageIdRow}>
              <Ionicons name="business-outline" size={16} color={Colors.primary} />
              <Text style={styles.garageName} numberOfLines={1}>{item.name || `Garage #${item.id}`}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {item.email ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.email}</Text>
              </View>
            ) : null}
            {item.phone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.phone}</Text>
              </View>
            ) : null}
            {item.address ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
              </View>
            ) : null}
            {item.siret ? (
              <View style={styles.infoRow}>
                <Ionicons name="document-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>SIRET: {item.siret}</Text>
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
            <View style={{ flex: 1 }} />
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </Pressable>
              <Pressable style={styles.actionBtnDanger} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [handleEdit, handleDelete]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des garages</Text>
        <Pressable onPress={handleCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, email, SIRET..."
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
          <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>Tous ({allGarages.length})</Text>
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

      <Text style={styles.countText}>{garages.length} garage{garages.length !== 1 ? "s" : ""}</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : garages.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="business-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterStatus ? "Aucun résultat" : "Aucun garage"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...garages].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderGarage}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingGarage ? "Modifier le garage" : "Nouveau garage"}</Text>
                  <Pressable onPress={closeModal}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                {editingGarage && (
                  <Text style={styles.modalSubtitle}>{editingGarage.name || `#${editingGarage.id}`}</Text>
                )}

                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.name}
                  onChangeText={(v) => updateField("name", v)}
                  placeholder="Nom du garage"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Adresse</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.address}
                  onChangeText={(v) => updateField("address", v)}
                  placeholder="Adresse complète"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Téléphone</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.phone}
                  onChangeText={(v) => updateField("phone", v)}
                  placeholder="Numéro de téléphone"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.email}
                  onChangeText={(v) => updateField("email", v)}
                  placeholder="Email du garage"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>SIRET</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.siret}
                  onChangeText={(v) => updateField("siret", v)}
                  placeholder="Numéro SIRET"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>Statut</Text>
                <View style={styles.statusGrid}>
                  {STATUS_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.statusOption, form.status === opt.value && { backgroundColor: opt.bg, borderColor: opt.color }]}
                      onPress={() => updateField("status", opt.value)}
                    >
                      <Ionicons name={opt.icon} size={16} color={form.status === opt.value ? opt.color : Colors.textSecondary} />
                      <Text style={[styles.statusOptionText, form.status === opt.value && { color: opt.color }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingGarage ? "Enregistrer" : "Créer"}</Text>
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
  garageIdRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 },
  garageName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, flexShrink: 1 },
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
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 4 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
