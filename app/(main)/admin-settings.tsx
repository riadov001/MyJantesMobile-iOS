import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { adminSettingsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

interface SettingsForm {
  tvaRate: string;
  defaultDiscount: string;
  quoteValidityDays: string;
  paymentTermDays: string;
  laborRate: string;
  currency: string;
  quotePrefix: string;
  invoicePrefix: string;
  autoNumbering: string;
  [key: string]: string;
}

interface GarageLegalForm {
  garageName: string;
  siret: string;
  tvaNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  legalForm: string;
  capital: string;
  rcs: string;
  ape: string;
  [key: string]: string;
}

const SETTINGS_FIELDS: { key: keyof SettingsForm; label: string; placeholder: string; keyboardType?: "numeric" | "default" }[] = [
  { key: "tvaRate", label: "Taux de TVA (%)", placeholder: "20", keyboardType: "numeric" },
  { key: "defaultDiscount", label: "Remise par défaut (%)", placeholder: "0", keyboardType: "numeric" },
  { key: "quoteValidityDays", label: "Validité devis (jours)", placeholder: "30", keyboardType: "numeric" },
  { key: "paymentTermDays", label: "Délai de paiement (jours)", placeholder: "30", keyboardType: "numeric" },
  { key: "laborRate", label: "Taux horaire main d'oeuvre", placeholder: "45", keyboardType: "numeric" },
  { key: "currency", label: "Devise", placeholder: "EUR" },
  { key: "quotePrefix", label: "Préfixe devis", placeholder: "DEV-" },
  { key: "invoicePrefix", label: "Préfixe facture", placeholder: "FAC-" },
];

const LEGAL_FIELDS: { key: keyof GarageLegalForm; label: string; placeholder: string }[] = [
  { key: "garageName", label: "Nom du garage", placeholder: "Mon Garage" },
  { key: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
  { key: "tvaNumber", label: "Numéro de TVA", placeholder: "FR12345678901" },
  { key: "address", label: "Adresse", placeholder: "123 rue Example" },
  { key: "postalCode", label: "Code postal", placeholder: "75000" },
  { key: "city", label: "Ville", placeholder: "Paris" },
  { key: "country", label: "Pays", placeholder: "France" },
  { key: "phone", label: "Téléphone", placeholder: "01 23 45 67 89" },
  { key: "email", label: "Email", placeholder: "contact@garage.fr" },
  { key: "website", label: "Site web", placeholder: "https://www.garage.fr" },
  { key: "legalForm", label: "Forme juridique", placeholder: "SARL" },
  { key: "capital", label: "Capital social", placeholder: "10 000" },
  { key: "rcs", label: "RCS", placeholder: "Paris B 123 456 789" },
  { key: "ape", label: "Code APE", placeholder: "4520A" },
];

const DEFAULT_SETTINGS: SettingsForm = {
  tvaRate: "",
  defaultDiscount: "",
  quoteValidityDays: "",
  paymentTermDays: "",
  laborRate: "",
  currency: "",
  quotePrefix: "",
  invoicePrefix: "",
  autoNumbering: "",
};

const DEFAULT_LEGAL: GarageLegalForm = {
  garageName: "",
  siret: "",
  tvaNumber: "",
  address: "",
  postalCode: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  legalForm: "",
  capital: "",
  rcs: "",
  ape: "",
};

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [settings, setSettings] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [legal, setLegal] = useState<GarageLegalForm>(DEFAULT_LEGAL);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingLegal, setSavingLegal] = useState(false);
  const [activeSection, setActiveSection] = useState<"settings" | "legal">("settings");

  const { data: settingsData, isLoading: loadingSettings, isError: settingsError } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: adminSettingsApi.get,
  });

  const { data: legalData, isLoading: loadingLegal, isError: legalError } = useQuery({
    queryKey: ["admin-garage-legal"],
    queryFn: adminSettingsApi.getGarageLegal,
  });

  useEffect(() => {
    if (settingsData && typeof settingsData === "object") {
      setSettings((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(prev)) {
          if (settingsData[key] !== undefined && settingsData[key] !== null) {
            updated[key] = String(settingsData[key]);
          }
        }
        return updated;
      });
    }
  }, [settingsData]);

  useEffect(() => {
    if (legalData && typeof legalData === "object") {
      setLegal((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(prev)) {
          if (legalData[key] !== undefined && legalData[key] !== null) {
            updated[key] = String(legalData[key]);
          }
        }
        return updated;
      });
    }
  }, [legalData]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (value !== "") {
          const numericKeys = ["tvaRate", "defaultDiscount", "quoteValidityDays", "paymentTermDays", "laborRate"];
          payload[key] = numericKeys.includes(key) ? parseFloat(value) || value : value;
        }
      }
      await adminSettingsApi.update(payload);
      showAlert({
        type: "success",
        title: "Succès",
        message: "Les paramètres du simulateur ont été mis à jour.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de sauvegarder les paramètres.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveLegal = async () => {
    setSavingLegal(true);
    try {
      await adminSettingsApi.updateGarageLegal(legal);
      showAlert({
        type: "success",
        title: "Succès",
        message: "Les informations légales ont été mises à jour.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de sauvegarder les informations légales.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setSavingLegal(false);
    }
  };

  const isLoading = loadingSettings || loadingLegal;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramétrage simulateur</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeSection === "settings" && styles.tabActive]}
          onPress={() => setActiveSection("settings")}
        >
          <Ionicons
            name="settings-outline"
            size={16}
            color={activeSection === "settings" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSection === "settings" && styles.tabTextActive]}>
            Simulateur
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeSection === "legal" && styles.tabActive]}
          onPress={() => setActiveSection("legal")}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={activeSection === "legal" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSection === "legal" && styles.tabTextActive]}>
            Infos légales
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeSection === "settings" && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calculator-outline" size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Paramètres du simulateur de devis</Text>
                </View>

                {settingsError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={styles.errorBannerText}>
                      Impossible de charger les paramètres. Les valeurs par défaut sont affichées.
                    </Text>
                  </View>
                )}

                {SETTINGS_FIELDS.map((field) => (
                  <View key={field.key} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={settings[field.key]}
                      onChangeText={(text) =>
                        setSettings((prev) => ({ ...prev, [field.key]: text }))
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType={field.keyboardType || "default"}
                    />
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    pressed && styles.saveButtonPressed,
                    savingSettings && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Enregistrer les paramètres</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {activeSection === "legal" && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Informations légales du garage</Text>
                </View>

                {legalError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={styles.errorBannerText}>
                      Impossible de charger les informations légales.
                    </Text>
                  </View>
                )}

                {LEGAL_FIELDS.map((field) => (
                  <View key={field.key} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={legal[field.key]}
                      onChangeText={(text) =>
                        setLegal((prev) => ({ ...prev, [field.key]: text }))
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    pressed && styles.saveButtonPressed,
                    savingLegal && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveLegal}
                  disabled={savingLegal}
                >
                  {savingLegal ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Enregistrer les infos légales</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "30",
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
    flex: 1,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
