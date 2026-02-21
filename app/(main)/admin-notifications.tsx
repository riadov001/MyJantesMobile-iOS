import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";
import { adminSettingsApi } from "@/lib/api";

interface NotificationSettings {
  pushNewQuotes: boolean;
  pushNewClients: boolean;
  pushNewPayments: boolean;
  emailImportantEvents: boolean;
  emailNewQuotes: boolean;
  emailNewPayments: boolean;
  smsEnabled: boolean;
  smsUrgent: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushNewQuotes: true,
  pushNewClients: true,
  pushNewPayments: true,
  emailImportantEvents: true,
  emailNewQuotes: false,
  emailNewPayments: true,
  smsEnabled: false,
  smsUrgent: false,
};

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminSettingsApi.get();
      if (data?.notificationSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.notificationSettings });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.update({ notificationSettings: settings });
      showAlert({
        type: "success",
        title: "Enregistr\u00e9",
        message: "Les param\u00e8tres de notification ont \u00e9t\u00e9 mis \u00e0 jour.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } catch (error: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: error?.message || "Impossible de sauvegarder les param\u00e8tres.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#DC262620" }]}>
              <Ionicons name="notifications" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notifications push</Text>
          </View>

          <ToggleRow
            label="Nouveaux devis"
            description="Recevoir une notification pour chaque nouveau devis"
            value={settings.pushNewQuotes}
            onToggle={() => toggleSetting("pushNewQuotes")}
          />
          <ToggleRow
            label="Nouveaux clients"
            description="Recevoir une notification pour chaque inscription"
            value={settings.pushNewClients}
            onToggle={() => toggleSetting("pushNewClients")}
          />
          <ToggleRow
            label="Nouveaux paiements"
            description="Recevoir une notification pour chaque paiement re\u00e7u"
            value={settings.pushNewPayments}
            onToggle={() => toggleSetting("pushNewPayments")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#22C55E20" }]}>
              <Ionicons name="mail" size={20} color={Colors.success} />
            </View>
            <Text style={styles.sectionTitle}>Notifications email</Text>
          </View>

          <ToggleRow
            label="\u00c9v\u00e9nements importants"
            description="Alertes critiques et \u00e9v\u00e9nements majeurs"
            value={settings.emailImportantEvents}
            onToggle={() => toggleSetting("emailImportantEvents")}
          />
          <ToggleRow
            label="Nouveaux devis par email"
            description="Recevoir un email pour chaque nouveau devis"
            value={settings.emailNewQuotes}
            onToggle={() => toggleSetting("emailNewQuotes")}
          />
          <ToggleRow
            label="Paiements par email"
            description="Recevoir un email pour chaque paiement"
            value={settings.emailNewPayments}
            onToggle={() => toggleSetting("emailNewPayments")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#3B82F620" }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Notifications SMS</Text>
          </View>

          <ToggleRow
            label="Activer les SMS"
            description="Recevoir des notifications par SMS"
            value={settings.smsEnabled}
            onToggle={() => toggleSetting("smsEnabled")}
          />
          <ToggleRow
            label="Alertes urgentes uniquement"
            description="SMS uniquement pour les \u00e9v\u00e9nements critiques"
            value={settings.smsUrgent}
            onToggle={() => toggleSetting("smsUrgent")}
            disabled={!settings.smsEnabled}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            saving && styles.saveBtnDisabled,
            pressed && !saving && { opacity: 0.7 },
          ]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>
            {saving ? "Enregistrement..." : "Enregistrer les param\u00e8tres"}
          </Text>
        </Pressable>
      </ScrollView>
      {AlertComponent}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleLabel, disabled && styles.toggleLabelDisabled]}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.surfaceSecondary, true: Colors.primary }}
        thumbColor={value ? "#fff" : Colors.textTertiary}
        ios_backgroundColor={Colors.surfaceSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  toggleLabelDisabled: {
    color: Colors.textTertiary,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
