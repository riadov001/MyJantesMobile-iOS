import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "@/lib/api";
import Colors from "@/constants/colors";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez saisir votre adresse email.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      Alert.alert(
        "Email envoyé",
        "Si un compte est associé à cet email, vous recevrez des instructions pour réinitialiser votre mot de passe.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert(
        "Service temporairement indisponible",
        "La réinitialisation du mot de passe est temporairement indisponible. Veuillez contacter le support à contact@myjantes.com pour une assistance.",
        [{ text: "Compris" }]
      );
    } finally {
      setLoading(false);
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
          {
            paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20,
            paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
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
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.resetBtn,
            pressed && styles.resetBtnPressed,
            loading && styles.resetBtnDisabled,
          ]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.resetBtnText}>Envoyer le lien</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    height: "100%",
  },
  resetBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  resetBtnDisabled: {
    opacity: 0.7,
  },
  resetBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
