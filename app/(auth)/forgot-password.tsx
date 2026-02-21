import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
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
import { useCustomAlert } from "@/components/CustomAlert";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez saisir votre adresse email.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez saisir une adresse email valide.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(trimmedEmail);
      showAlert({
        type: "success",
        title: "Code envoyé",
        message: "Si un compte est associé à cet email, vous recevrez un code de réinitialisation par email.",
        buttons: [{ text: "Continuer", style: "primary", onPress: () => setStep("code") }],
      });
    } catch (err: any) {
      if (err.message?.includes("404") || err.message?.includes("Not Found")) {
        showAlert({
          type: "success",
          title: "Vérifiez votre email",
          message: "Si un compte est associé à cet email, vous recevrez un code de réinitialisation.",
          buttons: [{ text: "Saisir le code", style: "primary", onPress: () => setStep("code") }],
        });
      } else {
        showAlert({
          type: "warning",
          title: "Information",
          message: "Si un compte est associé à cet email, un lien de réinitialisation sera envoyé. Vérifiez également vos spams.",
          buttons: [
            { text: "Saisir le code", style: "primary", onPress: () => setStep("code") },
            { text: "Contacter le support", onPress: () => router.push("/support") },
          ],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez saisir le code reçu par email.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    if (code.trim().length < 4) {
      showAlert({ type: "error", title: "Erreur", message: "Le code doit contenir au moins 4 caractères.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    setResetToken(code.trim());
    setStep("newPassword");
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showAlert({ type: "error", title: "Erreur", message: "Veuillez remplir les deux champs.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    if (newPassword.length < 8) {
      showAlert({ type: "error", title: "Mot de passe trop court", message: "Le mot de passe doit contenir au moins 8 caractères.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({ type: "error", title: "Erreur", message: "Les mots de passe ne correspondent pas.", buttons: [{ text: "OK", style: "primary" }] });
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), resetToken, newPassword);
      showAlert({
        type: "success",
        title: "Mot de passe modifié",
        message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
        buttons: [{ text: "Se connecter", style: "primary", onPress: () => router.replace("/(auth)/login") }],
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err.message || "Impossible de réinitialiser le mot de passe. Le code est peut-être expiré.",
        buttons: [
          { text: "Réessayer", style: "primary" },
          { text: "Contacter le support", onPress: () => router.push("/support") },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step === "email" && styles.stepDotActive]} />
      <View style={styles.stepLine} />
      <View style={[styles.stepDot, step === "code" && styles.stepDotActive]} />
      <View style={styles.stepLine} />
      <View style={[styles.stepDot, step === "newPassword" && styles.stepDotActive]} />
    </View>
  );

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
        <Pressable onPress={() => { if (step === "email") router.back(); else if (step === "code") setStep("email"); else setStep("code"); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        {renderStepIndicator()}

        {step === "email" && (
          <>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={32} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Saisissez votre adresse email pour recevoir un code de réinitialisation.
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
                  autoComplete="email"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed, loading && styles.actionBtnDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Envoyer le code</Text>}
            </Pressable>
          </>
        )}

        {step === "code" && (
          <>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="key-outline" size={32} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Saisir le code</Text>
            <Text style={styles.subtitle}>
              Entrez le code de vérification envoyé à {email}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Code de vérification</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="Entrez le code"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={handleVerifyCode}
            >
              <Text style={styles.actionBtnText}>Valider le code</Text>
            </Pressable>

            <Pressable style={styles.resendBtn} onPress={handleSendCode} disabled={loading}>
              <Text style={styles.resendBtnText}>
                {loading ? "Envoi en cours..." : "Renvoyer le code"}
              </Text>
            </Pressable>
          </>
        )}

        {step === "newPassword" && (
          <>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed-outline" size={32} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisissez un mot de passe sécurisé (8 caractères minimum).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthRow}>
                  <Ionicons name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassword.length >= 8 ? Colors.success : Colors.textTertiary} />
                  <Text style={[styles.strengthText, newPassword.length >= 8 && styles.strengthTextValid]}>8 caractères minimum</Text>
                </View>
                <View style={styles.strengthRow}>
                  <Ionicons name={/[A-Z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} size={16} color={/[A-Z]/.test(newPassword) ? Colors.success : Colors.textTertiary} />
                  <Text style={[styles.strengthText, /[A-Z]/.test(newPassword) && styles.strengthTextValid]}>Une majuscule</Text>
                </View>
                <View style={styles.strengthRow}>
                  <Ionicons name={/[0-9]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} size={16} color={/[0-9]/.test(newPassword) ? Colors.success : Colors.textTertiary} />
                  <Text style={[styles.strengthText, /[0-9]/.test(newPassword) && styles.strengthTextValid]}>Un chiffre</Text>
                </View>
                <View style={styles.strengthRow}>
                  <Ionicons name={newPassword === confirmPassword && confirmPassword.length > 0 ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassword === confirmPassword && confirmPassword.length > 0 ? Colors.success : Colors.textTertiary} />
                  <Text style={[styles.strengthText, newPassword === confirmPassword && confirmPassword.length > 0 && styles.strengthTextValid]}>Mots de passe identiques</Text>
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed, loading && styles.actionBtnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Réinitialiser le mot de passe</Text>}
            </Pressable>
          </>
        )}

        <Pressable style={styles.supportLink} onPress={() => router.push("/support")}>
          <Ionicons name="help-circle-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.supportLinkText}>Besoin d'aide ? Contacter le support</Text>
        </Pressable>
      </ScrollView>
      {AlertComponent}
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
    marginBottom: 8,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
  },
  iconHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 28,
    textAlign: "center",
    lineHeight: 20,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 16,
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
  codeInput: {
    letterSpacing: 4,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  eyeBtn: {
    height: "100%",
    width: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  actionBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  actionBtnDisabled: {
    opacity: 0.7,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  resendBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  strengthContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  strengthText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  strengthTextValid: {
    color: Colors.success,
  },
  supportLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
    paddingVertical: 8,
  },
  supportLinkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
