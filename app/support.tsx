import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supportApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

const CATEGORIES = [
  { value: "question", label: "Question générale" },
  { value: "devis", label: "Devis / Facturation" },
  { value: "reservation", label: "Réservation" },
  { value: "technique", label: "Problème technique" },
  { value: "autre", label: "Autre" },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const fullName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
  const [name, setName] = useState(fullName);
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !category || !subject.trim() || !message.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setSending(true);
    try {
      const result = await supportApi.contact({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      
      console.log("DEBUG: Support result", result);
      
      Alert.alert(
        "Message envoyé",
        "Votre demande a bien été transmise. Nous reviendrons vers vous rapidement.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error("Support error:", err);
      Alert.alert(
        "Service temporairement indisponible",
        "Le formulaire de contact rencontre un problème technique. Veuillez nous contacter directement par email à contact@myjantes.com ou par téléphone.",
        [{ text: "Compris" }]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 100 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubbles" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Besoin d'aide ?</Text>
          <Text style={styles.subtitle}>
            Envoyez-nous votre question, nous vous répondrons dans les meilleurs délais.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom complet"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat.value)}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    )}
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sujet *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Objet de votre demande"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Décrivez votre question ou votre besoin..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
              sending && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>Envoyer</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.contactInfo}>
          <Ionicons name="mail-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.contactText}>contact@myjantes.com</Text>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 80,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top" as any,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 40,
  },
  sendBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  contactInfo: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  contactText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
