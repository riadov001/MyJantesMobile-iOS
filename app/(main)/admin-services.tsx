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
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminServicesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const CATEGORY_OPTIONS = [
  { value: "montage", label: "Montage", icon: "construct-outline" as const },
  { value: "equilibrage", label: "Equilibrage", icon: "speedometer-outline" as const },
  { value: "reparation", label: "Réparation", icon: "build-outline" as const },
  { value: "diagnostic", label: "Diagnostic", icon: "search-outline" as const },
  { value: "entretien", label: "Entretien", icon: "settings-outline" as const },
  { value: "autre", label: "Autre", icon: "ellipsis-horizontal-outline" as const },
];

function getCategoryInfo(category: string) {
  const c = category?.toLowerCase() || "";
  const found = CATEGORY_OPTIONS.find((o) => o.value === c);
  if (found) return found;
  return { value: c, label: category || "Autre", icon: "ellipsis-horizontal-outline" as const };
}

export default function AdminServicesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("montage");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: servicesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-services"],
    queryFn: adminServicesApi.getAll,
  });

  const allServices = useMemo(() => Array.isArray(servicesRaw) ? servicesRaw : [], [servicesRaw]);

  const services = useMemo(() => {
    let list = allServices;
    if (filterCategory) {
      list = list.filter((s: any) => s.category?.toLowerCase() === filterCategory);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((s: any) => {
      const name = (s.name || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      const cat = (s.category || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [allServices, search, filterCategory]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminServicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "Le service a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer le service.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminServicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "Le service a été mis à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminServicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      showAlert({ type: "success", title: "Succès", message: "Le service a été supprimé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const openCreateModal = useCallback(() => {
    setEditingService(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategory("montage");
    setFormIsActive(true);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((service: any) => {
    setEditingService(service);
    setFormName(service.name || "");
    setFormDescription(service.description || "");
    setFormPrice(service.basePrice || service.price || "");
    setFormCategory(service.category || "montage");
    setFormIsActive(service.isActive !== false);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingService(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!formName.trim()) {
      showAlert({ type: "warning", title: "Champ requis", message: "Le nom du service est obligatoire.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    const data = {
      name: formName.trim(),
      description: formDescription.trim(),
      basePrice: formPrice.trim() || "0",
      category: formCategory,
      isActive: formIsActive,
    };
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingService, formName, formDescription, formPrice, formCategory, formIsActive, updateMutation, createMutation, showAlert]);

  const handleDelete = useCallback(
    (service: any) => {
      showAlert({
        type: "warning",
        title: "Supprimer le service",
        message: `Supprimer "${service.name}" ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(service.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allServices.forEach((s: any) => {
      const c = s.category?.toLowerCase() || "autre";
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [allServices]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderService = useCallback(
    ({ item }: { item: any }) => {
      const catInfo = getCategoryInfo(item.category);
      const price = parseFloat(item.basePrice || item.price || "0");
      const isActive = item.isActive !== false;

      return (
        <Pressable style={styles.card} onPress={() => openEditModal(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.serviceIdRow}>
              <Ionicons name={catInfo.icon} size={16} color={Colors.primary} />
              <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? Colors.acceptedBg : Colors.rejectedBg }]}>
              <Ionicons name={isActive ? "checkmark-circle-outline" : "close-circle-outline"} size={12} color={isActive ? Colors.accepted : Colors.rejected} />
              <Text style={[styles.statusText, { color: isActive ? Colors.accepted : Colors.rejected }]}>{isActive ? "Actif" : "Inactif"}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {item.description ? (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={2}>{item.description}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{catInfo.label}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.totalValue}>{price > 0 ? `${price.toFixed(2)} €` : "—"}</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); openEditModal(item); }}>
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
    [openEditModal, handleDelete]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des services</Text>
        <Pressable onPress={openCreateModal} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, description..."
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
          style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
          onPress={() => setFilterCategory(null)}
        >
          <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>Tous ({allServices.length})</Text>
        </Pressable>
        {CATEGORY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.filterChip, filterCategory === opt.value && styles.filterChipActive]}
            onPress={() => setFilterCategory(filterCategory === opt.value ? null : opt.value)}
          >
            <Text style={[styles.filterChipText, filterCategory === opt.value && styles.filterChipTextActive]}>
              {opt.label} ({categoryCounts[opt.value] || 0})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{services.length} services</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="construct-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterCategory ? "Aucun résultat" : "Aucun service"}</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderService}
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
                  <Text style={styles.modalTitle}>{editingService ? "Modifier le service" : "Nouveau service"}</Text>
                  <Pressable onPress={closeModal}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Nom</Text>
                <TextInput
                  style={styles.textInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Nom du service"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Description du service..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Prix (€)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Catégorie</Text>
                <View style={styles.statusGrid}>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.statusOption, formCategory === opt.value && { backgroundColor: Colors.primary + "20", borderColor: Colors.primary }]}
                      onPress={() => setFormCategory(opt.value)}
                    >
                      <Ionicons name={opt.icon} size={16} color={formCategory === opt.value ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.statusOptionText, formCategory === opt.value && { color: Colors.primary }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.fieldLabel}>Service actif</Text>
                  <Switch
                    value={formIsActive}
                    onValueChange={setFormIsActive}
                    trackColor={{ false: Colors.surfaceSecondary, true: Colors.accepted + "60" }}
                    thumbColor={formIsActive ? Colors.accepted : Colors.textSecondary}
                  />
                </View>

                <Pressable
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingService ? "Enregistrer" : "Créer"}</Text>
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
  serviceIdRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 },
  serviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, flexShrink: 1 },
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, height: 44, marginBottom: 8 },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80, marginBottom: 8 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
