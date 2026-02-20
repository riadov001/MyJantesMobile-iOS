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
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

type AccountType = "client" | "client_professionnel";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [tvaNumber, setTvaNumber] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPostalCode, setCompanyPostalCode] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyCountry, setCompanyCountry] = useState("France");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!agreeTerms) {
      showAlert({ type: 'warning', title: 'Consentement requis', message: 'Veuillez accepter les mentions légales et la politique de confidentialité.', buttons: [{ text: 'OK', style: 'primary' }] });
      return;
    }
    if (!email.trim() || !password.trim()) {
      showAlert({ type: 'error', title: 'Erreur', message: 'Email et mot de passe sont obligatoires.', buttons: [{ text: 'OK', style: 'primary' }] });
      return;
    }
    if (password !== confirmPassword) {
      showAlert({ type: 'error', title: 'Erreur', message: 'Les mots de passe ne correspondent pas.', buttons: [{ text: 'OK', style: 'primary' }] });
      return;
    }
    if (password.length < 6) {
      showAlert({ type: 'error', title: 'Erreur', message: 'Le mot de passe doit contenir au moins 6 caractères.', buttons: [{ text: 'OK', style: 'primary' }] });
      return;
    }
    if (accountType === "client_professionnel") {
      if (!companyName.trim()) {
        showAlert({ type: 'error', title: 'Erreur', message: "Le nom de l'entreprise est obligatoire.", buttons: [{ text: 'OK', style: 'primary' }] });
        return;
      }
      if (!siret.trim() || siret.length !== 14) {
        showAlert({ type: 'error', title: 'Erreur', message: 'Le SIRET doit comporter 14 chiffres.', buttons: [{ text: 'OK', style: 'primary' }] });
        return;
      }
      if (!tvaNumber.trim()) {
        showAlert({ type: 'error', title: 'Erreur', message: 'Le numéro de TVA est obligatoire.', buttons: [{ text: 'OK', style: 'primary' }] });
        return;
      }
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        role: accountType,
        companyName: companyName.trim() || undefined,
        siret: siret.trim() || undefined,
        tvaNumber: tvaNumber.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        companyPostalCode: companyPostalCode.trim() || undefined,
        companyCity: companyCity.trim() || undefined,
        companyCountry: companyCountry.trim() || undefined,
      });
      setTimeout(() => {
        router.replace("/(main)/(tabs)" as any);
      }, 50);
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erreur', message: err.message || 'Impossible de créer le compte.', buttons: [{ text: 'OK', style: 'primary' }] });
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    opts: {
      placeholder?: string;
      keyboardType?: any;
      autoCapitalize?: any;
      required?: boolean;
      maxLength?: number;
    } = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
        {opts.required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={opts.placeholder || label}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={opts.keyboardType || "default"}
          autoCapitalize={opts.autoCapitalize || "sentences"}
          maxLength={opts.maxLength}
        />
      </View>
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Inscrivez-vous pour demander un devis</Text>

        <View style={styles.typeSelector}>
          <Pressable
            style={[styles.typeBtn, accountType === "client" && styles.typeBtnActive]}
            onPress={() => setAccountType("client")}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={accountType === "client" ? "#fff" : Colors.text}
            />
            <Text style={[styles.typeBtnText, accountType === "client" && styles.typeBtnTextActive]}>
              Particulier
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, accountType === "client_professionnel" && styles.typeBtnActive]}
            onPress={() => setAccountType("client_professionnel")}
          >
            <Ionicons
              name="business-outline"
              size={18}
              color={accountType === "client_professionnel" ? "#fff" : Colors.text}
            />
            <Text
              style={[
                styles.typeBtnText,
                accountType === "client_professionnel" && styles.typeBtnTextActive,
              ]}
            >
              Professionnel
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          {renderInput("Prénom", firstName, setFirstName, "person-outline", { placeholder: "Votre prénom" })}
          {renderInput("Nom", lastName, setLastName, "person-outline", { placeholder: "Votre nom" })}
          {renderInput("Téléphone", phone, setPhone, "call-outline", {
            placeholder: "06 XX XX XX XX",
            keyboardType: "phone-pad",
          })}
          {renderInput("Adresse", address, setAddress, "location-outline", { placeholder: "Votre adresse" })}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput("Code postal", postalCode, setPostalCode, "navigate-outline", {
                keyboardType: "numeric",
                maxLength: 5,
              })}
            </View>
            <View style={styles.halfInput}>
              {renderInput("Ville", city, setCity, "business-outline", { placeholder: "Ville" })}
            </View>
          </View>
        </View>

        {accountType === "client_professionnel" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations société</Text>
            {renderInput("Nom de l'entreprise", companyName, setCompanyName, "business-outline", {
              required: true,
              placeholder: "Nom de la société",
            })}
            {renderInput("SIRET", siret, setSiret, "document-text-outline", {
              placeholder: "N° SIRET",
              keyboardType: "numeric",
              maxLength: 14,
            })}
            {renderInput("N° TVA", tvaNumber, setTvaNumber, "receipt-outline", {
              required: true,
              placeholder: "N° TVA intracommunautaire (ex: FR...)",
            })}
            {renderInput("Adresse société", companyAddress, setCompanyAddress, "location-outline", {
              required: true,
              placeholder: "Adresse du siège social",
            })}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                {renderInput("CP société", companyPostalCode, setCompanyPostalCode, "navigate-outline", {
                  required: true,
                  keyboardType: "numeric",
                  maxLength: 5,
                })}
              </View>
              <View style={styles.halfInput}>
                {renderInput("Ville société", companyCity, setCompanyCity, "business-outline", { 
                  required: true,
                  placeholder: "Ville" 
                })}
              </View>
            </View>
            {renderInput("Pays société", companyCountry, setCompanyCountry, "globe-outline", {
              required: true,
              placeholder: "Pays",
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identifiants</Text>
          {renderInput("Email", email, setEmail, "mail-outline", {
            required: true,
            placeholder: "votre@email.com",
            keyboardType: "email-address",
            autoCapitalize: "none",
          })}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mot de passe<Text style={styles.required}> *</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 caractères"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirmer le mot de passe<Text style={styles.required}> *</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez votre mot de passe"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        <View style={styles.consentSection}>
          <Pressable 
            style={styles.checkboxContainer} 
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              J'ai lu et j'accepte les{" "}
              <Text style={styles.link} onPress={() => router.push("/legal")}>mentions légales</Text>
              {" "}et la{" "}
              <Text style={styles.link} onPress={() => router.push("/privacy")}>politique de confidentialité</Text>.
              Je reconnais être informé que les prochaines versions incluront le paiement Stripe.
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.registerBtn,
            pressed && styles.registerBtnPressed,
            loading && styles.registerBtnDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>Créer mon compte</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Déjà un compte ? Se connecter</Text>
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  typeBtnTextActive: {
    color: "#fff",
  },
  section: {
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
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
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    height: "100%",
  },
  eyeBtn: {
    height: "100%",
    width: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  consentSection: {
    marginVertical: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },
});
