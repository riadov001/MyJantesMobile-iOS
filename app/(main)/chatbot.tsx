import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiCall } from "@/lib/api";
import { useCustomAlert } from "@/components/CustomAlert";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  text: "Bonjour ! Je suis l'assistant MyJantes. Comment puis-je vous aider ?",
  isUser: false,
  timestamp: new Date(),
};

const QUICK_ACTIONS = [
  "Quels services proposez-vous ?",
  "Comment obtenir un devis ?",
  "Délais de rénovation ?",
  "Tarifs et paiement",
];

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasUserSent, setHasUserSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { showAlert, AlertComponent } = useCustomAlert();

  const generateId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      const userMessage: Message = {
        id: generateId(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      const currentMessages = [...messages, userMessage];
      setMessages(currentMessages);
      setInputText("");
      setIsSending(true);
      setHasUserSent(true);

      try {
        const response = await apiCall<{ response?: string; message?: string }>(
          "/api/ai/assistant",
          {
            method: "POST",
            body: { message: text.trim(), mode: "chat" },
          }
        );

        const botReply = response.response || response.message || "Désolé, je n'ai pas pu traiter votre demande.";

        const botMessage: Message = {
          id: generateId(),
          text: botReply,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages([...currentMessages, botMessage]);
      } catch (error: any) {
        const errorMessage: Message = {
          id: generateId(),
          text: "Désolé, une erreur est survenue. Veuillez réessayer.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages([...currentMessages, errorMessage]);

        showAlert({
          type: "error",
          title: "Erreur",
          message:
            error?.message || "Impossible de contacter l'assistant. Vérifiez votre connexion.",
          buttons: [{ text: "OK", style: "primary" }],
        });
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, showAlert]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage]
  );

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageBubbleWrapper,
          item.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
        ]}
      >
        {!item.isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            item.isUser ? styles.userBubble : styles.botBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.isUser ? styles.userMessageText : styles.botMessageText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  }, []);

  const renderTypingIndicator = useCallback(() => {
    if (!isSending) return null;
    return (
      <View style={[styles.messageBubbleWrapper, styles.botMessageWrapper]}>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={16} color={Colors.primary} />
        </View>
        <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
          <ActivityIndicator size="small" color={Colors.textSecondary} />
          <Text style={styles.typingText}>En train d'écrire...</Text>
        </View>
      </View>
    );
  }, [isSending]);

  const renderQuickActions = useCallback(() => {
    if (hasUserSent) return null;
    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Questions fréquentes</Text>
        {QUICK_ACTIONS.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionText}>{action}</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [hasUserSent, handleQuickAction]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Assistant MyJantes</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderTypingIndicator}
          ListFooterComponent={renderQuickActions}
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(bottomPadding, 8) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Posez votre question..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={1000}
              editable={!isSending}
              onSubmitEditing={() => sendMessage(inputText)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={20}
                color={!inputText.trim() || isSending ? Colors.textTertiary : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleWrapper: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "85%",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  botMessageWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-end",
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "100%",
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  botMessageText: {
    color: Colors.text,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  typingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },
  quickActionsContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: 10,
    paddingLeft: 4,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
});
