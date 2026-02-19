import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi, ChatConversation, ChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  const senderName = isMe
    ? "Vous"
    : message.sender
      ? `${message.sender.firstName} ${message.sender.lastName}`
      : "Inconnu";

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{message.content}</Text>
        <Text style={[styles.timeText, isMe && styles.timeTextMe]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: chatApi.getConversations,
  });

  const conversation = Array.isArray(conversations)
    ? conversations.find((c: ChatConversation) => c.id === id)
    : undefined;

  const { data: messagesRaw = [], isLoading } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => chatApi.getMessages(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const messages = Array.isArray(messagesRaw)
    ? [...messagesRaw].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || sendMutation.isPending) return;
    setMessageText("");
    sendMutation.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {conversation?.title || "Conversation"}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMe={item.senderId === user?.id} />
          )}
          inverted={!!messages.length}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun message</Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.inputContainer,
          { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 8) },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Votre message..."
          placeholderTextColor={Colors.textTertiary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            (!messageText.trim() || sendMutation.isPending) && styles.sendButtonDisabled,
            pressed && !!messageText.trim() && styles.sendButtonPressed,
          ]}
          disabled={!messageText.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#FFFFFF",
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextMe: {
    color: "rgba(255,255,255,0.7)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  sendButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
