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
import { adminReviewsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const RATING_FILTERS = [
  { value: null, label: "Tous" },
  { value: 5, label: "5" },
  { value: 4, label: "4" },
  { value: 3, label: "3" },
  { value: 2, label: "2" },
  { value: 1, label: "1" },
];

function renderStars(rating: number, size: number = 14) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
        size={size}
        color={i <= rating ? "#F59E0B" : Colors.textTertiary}
      />
    );
  }
  return stars;
}

export default function AdminReviewsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [editVisible, setEditVisible] = useState(true);
  const [editStatus, setEditStatus] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");

  const { data: reviewsRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: adminReviewsApi.getAll,
  });

  const allReviews = useMemo(() => Array.isArray(reviewsRaw) ? reviewsRaw : [], [reviewsRaw]);

  const reviews = useMemo(() => {
    let list = allReviews;
    if (filterRating !== null) {
      list = list.filter((r: any) => Math.round(r.rating || 0) === filterRating);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((r: any) => {
      const clientName = `${r.client?.firstName || r.firstName || ""} ${r.client?.lastName || r.lastName || ""}`.toLowerCase();
      const email = (r.client?.email || r.email || "").toLowerCase();
      const comment = (r.comment || r.content || r.message || "").toLowerCase();
      return clientName.includes(q) || email.includes(q) || comment.includes(q);
    });
  }, [allReviews, search, filterRating]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    allReviews.forEach((r: any) => {
      const rating = Math.round(r.rating || 0);
      counts[rating] = (counts[rating] || 0) + 1;
    });
    return counts;
  }, [allReviews]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminReviewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setEditModal(null);
      showAlert({ type: "success", title: "Succes", message: "L'avis a ete mis a jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre a jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminReviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      showAlert({ type: "success", title: "Succes", message: "L'avis a ete supprime.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const handleEdit = useCallback((review: any) => {
    setEditVisible(review.isVisible !== false);
    setEditStatus(review.status || "published");
    setEditAdminNotes(review.adminNotes || "");
    setEditModal(review);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editModal) return;
    updateMutation.mutate({
      id: editModal.id,
      data: { isVisible: editVisible, status: editStatus, adminNotes: editAdminNotes },
    });
  }, [editModal, editVisible, editStatus, editAdminNotes, updateMutation]);

  const handleDelete = useCallback(
    (review: any) => {
      const clientName = `${review.client?.firstName || review.firstName || ""} ${review.client?.lastName || review.lastName || ""}`.trim();
      showAlert({
        type: "warning",
        title: "Supprimer l'avis",
        message: `Supprimer l'avis de ${clientName || "ce client"} ? Cette action est irreversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(review.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return 0;
    const sum = allReviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
    return sum / allReviews.length;
  }, [allReviews]);

  const renderReview = useCallback(
    ({ item }: { item: any }) => {
      const clientName = `${item.client?.firstName || item.firstName || ""} ${item.client?.lastName || item.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const comment = item.comment || item.content || item.message || "";
      const rating = item.rating || 0;
      const isHidden = item.isVisible === false;

      return (
        <View style={[styles.card, isHidden && styles.cardHidden]}>
          <View style={styles.cardHeader}>
            <View style={styles.ratingRow}>
              {renderStars(rating, 16)}
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            </View>
            {isHidden && (
              <View style={styles.hiddenBadge}>
                <Ionicons name="eye-off-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.hiddenText}>Masque</Text>
              </View>
            )}
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
            {date ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{date}</Text>
              </View>
            ) : null}
          </View>

          {comment ? (
            <Text style={styles.commentText} numberOfLines={3}>{comment}</Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View />
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

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const STATUS_OPTIONS = [
    { value: "published", label: "Publie" },
    { value: "pending", label: "En attente" },
    { value: "rejected", label: "Rejete" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des avis</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{allReviews.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
          </View>
          <Text style={styles.statLabel}>Moyenne</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{ratingCounts[5] || 0}</Text>
          <Text style={styles.statLabel}>5 etoiles</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client, commentaire..."
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
        {RATING_FILTERS.map((opt) => (
          <Pressable
            key={opt.label}
            style={[styles.filterChip, filterRating === opt.value && styles.filterChipActive]}
            onPress={() => setFilterRating(filterRating === opt.value ? null : opt.value)}
          >
            <Text style={[styles.filterChipText, filterRating === opt.value && styles.filterChipTextActive]}>
              {opt.value !== null ? (
                `${opt.label} (${ratingCounts[opt.value] || 0})`
              ) : (
                `${opt.label} (${allReviews.length})`
              )}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{reviews.length} avis</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterRating !== null ? "Aucun resultat" : "Aucun avis"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...reviews].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderReview}
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
                <Text style={styles.modalTitle}>Modifier l'avis</Text>
                <Pressable onPress={() => setEditModal(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              {editModal && (
                <View style={styles.modalReviewInfo}>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {renderStars(editModal.rating || 0, 18)}
                  </View>
                  <Text style={styles.modalSubtitle}>
                    {`${editModal.client?.firstName || editModal.firstName || ""} ${editModal.client?.lastName || editModal.lastName || ""}`.trim() || "Client"}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Visibilite</Text>
              <View style={styles.visibilityRow}>
                <Text style={styles.visibilityText}>{editVisible ? "Visible" : "Masque"}</Text>
                <Switch
                  value={editVisible}
                  onValueChange={setEditVisible}
                  trackColor={{ false: Colors.surfaceSecondary, true: Colors.success }}
                  thumbColor={Colors.white}
                />
              </View>

              <Text style={styles.fieldLabel}>Statut</Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.statusOption, editStatus === opt.value && styles.statusOptionActive]}
                    onPress={() => setEditStatus(opt.value)}
                  >
                    <Text style={[styles.statusOptionText, editStatus === opt.value && styles.statusOptionTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Notes admin</Text>
              <TextInput
                style={styles.notesInput}
                value={editAdminNotes}
                onChangeText={setEditAdminNotes}
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
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
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
  cardHidden: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#F59E0B", marginLeft: 4 },
  hiddenBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: Colors.surfaceSecondary },
  hiddenText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, marginTop: 10, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  actionBtnDanger: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.errorLight, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalReviewInfo: { alignItems: "center", gap: 6, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  visibilityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  visibilityText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  statusOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  statusOptionTextActive: { color: "#fff" },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
