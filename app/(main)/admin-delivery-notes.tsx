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
import { adminDeliveryNotesApi, adminClientsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

export default function AdminDeliveryNotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [formClient, setFormClient] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formItems, setFormItems] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: notesRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-delivery-notes"],
    queryFn: adminDeliveryNotesApi.getAll,
  });

  const { data: clientsRaw } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: adminClientsApi.getAll,
  });

  const allNotes = useMemo(() => (Array.isArray(notesRaw) ? notesRaw : []), [notesRaw]);
  const clients = useMemo(() => (Array.isArray(clientsRaw) ? clientsRaw : []), [clientsRaw]);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return allNotes;
    const q = search.toLowerCase().trim();
    return allNotes.filter((n: any) => {
      const ref = (n.reference || n.noteNumber || n.id || "").toString().toLowerCase();
      const client = `${n.client?.firstName || ""} ${n.client?.lastName || ""}`.toLowerCase();
      const email = (n.client?.email || "").toLowerCase();
      return ref.includes(q) || client.includes(q) || email.includes(q);
    });
  }, [allNotes, search]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminDeliveryNotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-notes"] });
      resetForm();
      setCreateModal(false);
      showAlert({ type: "success", title: "Succès", message: "Le bon de livraison a été créé.", buttons: [{ text: "OK", style: "primary" }] });
    },
    onError: (err: any) => {
      showAlert({ type: "error", title: "Erreur", message: err?.message || "Impossible de créer le bon de livraison.", buttons: [{ text: "OK", style: "primary" }] });
    },
  });

  const resetForm = useCallback(() => {
    setFormClient("");
    setFormReference("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormItems("");
    setFormNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!formClient) {
      showAlert({ type: "warning", title: "Champ requis", message: "Veuillez sélectionner un client.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    createMutation.mutate({
      clientId: formClient,
      reference: formReference || undefined,
      date: formDate,
      items: formItems || undefined,
      notes: formNotes || undefined,
    });
  }, [formClient, formReference, formDate, formItems, formNotes, createMutation, showAlert]);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setCreateModal(true);
  }, [resetForm]);

  const renderNote = useCallback(
    ({ item }: { item: any }) => {
      const clientName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
      const ref = item.reference || item.noteNumber || `#${item.id}`;

      return (
        <Pressable style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.refRow}>
              <Ionicons name="document-outline" size={16} color={Colors.primary} />
              <Text style={styles.refText}>{ref}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle-outline" size={12} color={Colors.accepted} />
              <Text style={[styles.statusText, { color: Colors.accepted }]}>BL</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {clientName ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{clientName}</Text>
              </View>
            ) : null}
            {(item.client?.email) ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{item.client.email}</Text>
              </View>
            ) : null}
            {date ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{date}</Text>
              </View>
            ) : null}
            {item.items ? (
              <View style={styles.infoRow}>
                <Ionicons name="list-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {typeof item.items === "string" ? item.items : Array.isArray(item.items) ? `${item.items.length} article(s)` : "Articles"}
                </Text>
              </View>
            ) : null}
          </View>

          {item.notes ? (
            <View style={styles.cardFooter}>
              <Text style={styles.notesPreview} numberOfLines={1}>{item.notes}</Text>
            </View>
          ) : null}
        </Pressable>
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
        <Text style={styles.headerTitle}>Bons de livraison</Text>
        <Pressable onPress={handleOpenCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par référence, client..."
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

      <Text style={styles.countText}>{filteredNotes.length} bon(s) de livraison</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredNotes.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{search ? "Aucun résultat" : "Aucun bon de livraison"}</Text>
        </View>
      ) : (
        <FlatList
          data={[...filteredNotes].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())}
          renderItem={renderNote}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => setCreateModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModal(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nouveau bon de livraison</Text>
                  <Pressable onPress={() => setCreateModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Client *</Text>
                <View style={styles.clientPickerContainer}>
                  <ScrollView style={styles.clientPicker} nestedScrollEnabled>
                    {clients.map((c: any) => (
                      <Pressable
                        key={c.id}
                        style={[styles.clientOption, formClient === c.id && styles.clientOptionActive]}
                        onPress={() => setFormClient(c.id)}
                      >
                        <Text style={[styles.clientOptionText, formClient === c.id && styles.clientOptionTextActive]}>
                          {`${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                        </Text>
                      </Pressable>
                    ))}
                    {clients.length === 0 && (
                      <Text style={styles.noClientsText}>Aucun client disponible</Text>
                    )}
                  </ScrollView>
                </View>

                <Text style={styles.fieldLabel}>Référence</Text>
                <TextInput
                  style={styles.formInput}
                  value={formReference}
                  onChangeText={setFormReference}
                  placeholder="Réf. bon de livraison"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.fieldLabel}>Articles / Description</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formItems}
                  onChangeText={setFormItems}
                  placeholder="Détail des articles livrés..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Notes internes..."
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
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Créer le bon de livraison</Text>
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
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginHorizontal: 16, marginTop: 10, marginBottom: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  refRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  refText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.acceptedBg },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
  cardFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  notesPreview: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, fontStyle: "italic" },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  formInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 8 },
  notesInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 80, marginBottom: 8 },
  clientPickerContainer: { maxHeight: 150, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary, overflow: "hidden" },
  clientPicker: { padding: 4 },
  clientOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  clientOptionActive: { backgroundColor: Colors.primary },
  clientOptionText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  clientOptionTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  noClientsText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", padding: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
