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
import { adminExpensesApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

export default function AdminExpensesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: expensesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: adminExpensesApi.getAll,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ["admin-expense-categories"],
    queryFn: adminExpensesApi.getCategories,
  });

  const categories = useMemo(() => {
    if (Array.isArray(categoriesRaw)) return categoriesRaw;
    return [];
  }, [categoriesRaw]);

  const allExpenses = useMemo(() => Array.isArray(expensesRaw) ? expensesRaw : [], [expensesRaw]);

  const expenses = useMemo(() => {
    let list = allExpenses;
    if (filterCategory) {
      list = list.filter((e: any) => (e.category || "").toLowerCase() === filterCategory.toLowerCase());
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((e: any) => {
      const desc = (e.description || "").toLowerCase();
      const cat = (e.category || "").toLowerCase();
      const notes = (e.notes || "").toLowerCase();
      const amount = (e.amount || "").toString();
      return desc.includes(q) || cat.includes(q) || notes.includes(q) || amount.includes(q);
    });
  }, [allExpenses, search, filterCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allExpenses.forEach((e: any) => {
      const cat = e.category || "Autre";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allExpenses]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    allExpenses.forEach((e: any) => { if (e.category) cats.add(e.category); });
    if (Array.isArray(categories)) {
      categories.forEach((c: any) => {
        const name = typeof c === "string" ? c : c?.name || c?.label;
        if (name) cats.add(name);
      });
    }
    return Array.from(cats);
  }, [allExpenses, categories]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminExpensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "La dépense a été créée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer la dépense.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminExpensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      closeModal();
      showAlert({ type: "success", title: "Succès", message: "La dépense a été mise à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de mettre à jour.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminExpensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      showAlert({ type: "success", title: "Succès", message: "La dépense a été supprimée.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de supprimer.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingExpense(null);
    setFormDescription("");
    setFormAmount("");
    setFormCategory("");
    setFormDate("");
    setFormNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    setEditingExpense(null);
    setFormDescription("");
    setFormAmount("");
    setFormCategory(uniqueCategories[0] || "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setModalVisible(true);
  }, [uniqueCategories]);

  const handleEdit = useCallback((expense: any) => {
    setEditingExpense(expense);
    setFormDescription(expense.description || "");
    setFormAmount((expense.amount || "").toString());
    setFormCategory(expense.category || "");
    setFormDate(expense.date ? new Date(expense.date).toISOString().split("T")[0] : "");
    setFormNotes(expense.notes || "");
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formDescription.trim() || !formAmount.trim()) {
      showAlert({ type: "warning", title: "Champs requis", message: "La description et le montant sont obligatoires.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    const data = {
      description: formDescription.trim(),
      amount: parseFloat(formAmount),
      category: formCategory.trim() || undefined,
      date: formDate || undefined,
      notes: formNotes.trim() || undefined,
    };
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingExpense, formDescription, formAmount, formCategory, formDate, formNotes, updateMutation, createMutation, showAlert]);

  const handleDelete = useCallback(
    (expense: any) => {
      const label = expense.description || `#${expense.id}`;
      showAlert({
        type: "warning",
        title: "Supprimer la dépense",
        message: `Supprimer "${label}" ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          { text: "Supprimer", style: "primary", onPress: () => deleteMutation.mutate(expense.id) },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
  }, [expenses]);

  const renderExpense = useCallback(
    ({ item }: { item: any }) => {
      const date = item.date || item.createdAt;
      const dateStr = date ? new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const amount = parseFloat(item.amount || "0");

      return (
        <Pressable style={styles.card} onPress={() => handleEdit(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.descRow}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
              <Text style={styles.descText} numberOfLines={1}>{item.description || "Sans description"}</Text>
            </View>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardBody}>
            {dateStr ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{dateStr}</Text>
              </View>
            ) : null}
            {item.notes ? (
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={2}>{item.notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.totalValue}>{amount > 0 ? `${amount.toFixed(2)} €` : "—"}</Text>
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des dépenses</Text>
        <Pressable onPress={handleCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par description, catégorie..."
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
          <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>Toutes ({allExpenses.length})</Text>
        </Pressable>
        {uniqueCategories.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
            onPress={() => setFilterCategory(filterCategory === cat ? null : cat)}
          >
            <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
              {cat} ({categoryCounts[cat] || 0})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.summaryRow}>
        <Text style={styles.countText}>{expenses.length} dépense{expenses.length !== 1 ? "s" : ""}</Text>
        <Text style={styles.totalText}>Total: {totalExpenses.toFixed(2)} €</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search || filterCategory ? "Aucun résultat" : "Aucune dépense"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...expenses].sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())}
          renderItem={renderExpense}
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
                  <Text style={styles.modalTitle}>{editingExpense ? "Modifier la dépense" : "Nouvelle dépense"}</Text>
                  <Pressable onPress={closeModal}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Description de la dépense"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Montant (€) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Catégorie</Text>
                {uniqueCategories.length > 0 ? (
                  <View style={styles.categoryGrid}>
                    {uniqueCategories.map((cat) => (
                      <Pressable
                        key={cat}
                        style={[styles.categoryOption, formCategory === cat && styles.categoryOptionActive]}
                        onPress={() => setFormCategory(formCategory === cat ? "" : cat)}
                      >
                        <Text style={[styles.categoryOptionText, formCategory === cat && styles.categoryOptionTextActive]}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  style={styles.textInput}
                  value={formCategory}
                  onChangeText={setFormCategory}
                  placeholder="Ou saisir une catégorie"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Date (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="2025-01-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Notes supplémentaires..."
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
                    <Text style={styles.saveBtnText}>{editingExpense ? "Enregistrer" : "Créer"}</Text>
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
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 10, marginBottom: 4 },
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  totalText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.primary },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  descRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  descText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, flexShrink: 1 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.surfaceSecondary },
  categoryText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
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
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 8 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  categoryOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  categoryOptionTextActive: { color: "#fff" },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
