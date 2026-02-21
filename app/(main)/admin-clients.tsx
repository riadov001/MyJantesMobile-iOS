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
  Linking,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClientsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.charAt(0)?.toUpperCase() || "";
  const l = lastName?.charAt(0)?.toUpperCase() || "";
  return f + l || "?";
}

function getRoleBadge(role?: string) {
  if (role === "client_professionnel") {
    return { label: "Professionnel", color: "#22C55E", bg: "rgba(34,197,94,0.15)" };
  }
  return { label: "Client", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" };
}

export default function AdminClientsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [search, setSearch] = useState("");

  const { data: clientsRaw, isLoading, refetch } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: adminClientsApi.getAll,
  });

  const clients = useMemo(() => {
    const list = Array.isArray(clientsRaw) ? clientsRaw : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((c: any) => {
      const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const company = (c.companyName || "").toLowerCase();
      return fullName.includes(q) || email.includes(q) || company.includes(q);
    });
  }, [clientsRaw, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminClientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      showAlert({
        type: "success",
        title: "Succès",
        message: "Le client a été supprimé avec succès.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    },
    onError: (err: any) => {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de supprimer le client.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    },
  });

  const handleDelete = useCallback(
    (client: any) => {
      const name = `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email;
      showAlert({
        type: "warning",
        title: "Supprimer le client",
        message: `Êtes-vous sûr de vouloir supprimer ${name} ? Cette action est irréversible.`,
        buttons: [
          { text: "Annuler" },
          {
            text: "Supprimer",
            style: "primary",
            onPress: () => deleteMutation.mutate(client.id),
          },
        ],
      });
    },
    [showAlert, deleteMutation]
  );

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleEmail = useCallback((email: string) => {
    Linking.openURL(`mailto:${email}`);
  }, []);

  const renderClient = useCallback(
    ({ item }: { item: any }) => {
      const initials = getInitials(item.firstName, item.lastName);
      const roleBadge = getRoleBadge(item.role);
      const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim();

      return (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.clientName} numberOfLines={1}>
                {fullName || "Sans nom"}
              </Text>
              {item.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.infoText} numberOfLines={1}>{item.email}</Text>
                </View>
              )}
              {item.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{item.phone}</Text>
                </View>
              )}
              {item.companyName && (
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.infoText} numberOfLines={1}>{item.companyName}</Text>
                </View>
              )}
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            {item.phone && (
              <Pressable style={styles.actionBtn} onPress={() => handleCall(item.phone)}>
                <Ionicons name="call" size={18} color="#3B82F6" />
              </Pressable>
            )}
            {item.email && (
              <Pressable style={styles.actionBtn} onPress={() => handleEmail(item.email)}>
                <Ionicons name="mail" size={18} color="#22C55E" />
              </Pressable>
            )}
            <Pressable style={styles.actionBtnDelete} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </Pressable>
          </View>
        </View>
      );
    },
    [handleCall, handleEmail, handleDelete]
  );

  const keyExtractor = useCallback((item: any) => item.id?.toString() || Math.random().toString(), []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestion des clients</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, email, société..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {!isLoading && (
        <Text style={styles.countText}>{clients.length} client{clients.length !== 1 ? "s" : ""}</Text>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : clients.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>
            {search ? "Aucun résultat" : "Aucun client"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search ? "Essayez avec d'autres termes de recherche." : "Il n'y a aucun client pour le moment."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClient}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {AlertComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    height: 44,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  clientName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.errorLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },
});
