import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { chatApi, ChatConversation } from "@/lib/api";
import Colors from "@/constants/colors";
import { FloatingSupport } from "@/components/FloatingSupport";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Hier";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function ConversationCard({ conversation }: { conversation: ChatConversation }) {
  const hasUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/(main)/chat-detail", params: { id: conversation.id } })
      }
    >
      <View style={styles.avatarContainer}>
        <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, hasUnread && styles.cardTitleUnread]} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text style={[styles.cardDate, hasUnread && styles.cardDateUnread]}>
            {formatDate(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardPreview} numberOfLines={1}>
            {conversation.lastMessage?.content || "Aucun message"}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversationsRaw = [], isLoading, refetch } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: chatApi.getConversations,
    refetchInterval: 15000,
  });

  const conversations = Array.isArray(conversationsRaw)
    ? [...conversationsRaw].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )
    : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationCard conversation={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 100 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun message</Text>
              <Text style={styles.emptyText}>
                Vos conversations apparaîtront ici.
              </Text>
            </View>
          }
        />
      )}
      <FloatingSupport />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: {
    fontFamily: "Inter_600SemiBold",
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  cardDateUnread: {
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPreview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
