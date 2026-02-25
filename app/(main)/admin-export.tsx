import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { adminExportApi, adminAuditLogsApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

export default function AdminExportScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [activeSection, setActiveSection] = useState<"export" | "audit">("export");
  const [exportingData, setExportingData] = useState(false);
  const [exportingDb, setExportingDb] = useState(false);

  const {
    data: auditLogs,
    isLoading: loadingLogs,
    isError: logsError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: adminAuditLogsApi.getAll,
  });

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const result = await adminExportApi.exportData({ format: "json" });
      showAlert({
        type: "success",
        title: "Export réussi",
        message: result?.message || "Les données ont été exportées avec succès.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible d'exporter les données.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setExportingData(false);
    }
  };

  const handleExportDatabase = async () => {
    showAlert({
      type: "warning",
      title: "Export base de données",
      message: "Cette opération peut prendre du temps. Voulez-vous continuer ?",
      buttons: [
        { text: "Annuler", style: "default" },
        {
          text: "Exporter",
          style: "primary",
          onPress: async () => {
            setExportingDb(true);
            try {
              const result = await adminExportApi.exportDatabase();
              showAlert({
                type: "success",
                title: "Export réussi",
                message: result?.message || "La base de données a été exportée avec succès.",
                buttons: [{ text: "OK", style: "primary" }],
              });
            } catch (err: any) {
              showAlert({
                type: "error",
                title: "Erreur",
                message: err?.message || "Impossible d'exporter la base de données.",
                buttons: [{ text: "OK", style: "primary" }],
              });
            } finally {
              setExportingDb(false);
            }
          },
        },
      ],
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionColor = (action: string) => {
    const a = (action || "").toLowerCase();
    if (a.includes("delete") || a.includes("supprim")) return Colors.error;
    if (a.includes("create") || a.includes("créa") || a.includes("ajout")) return Colors.success;
    if (a.includes("update") || a.includes("modif")) return Colors.warning;
    return Colors.primary;
  };

  const getActionIcon = (action: string): string => {
    const a = (action || "").toLowerCase();
    if (a.includes("delete") || a.includes("supprim")) return "trash-outline";
    if (a.includes("create") || a.includes("créa") || a.includes("ajout")) return "add-circle-outline";
    if (a.includes("update") || a.includes("modif")) return "create-outline";
    if (a.includes("login") || a.includes("connexion")) return "log-in-outline";
    if (a.includes("logout") || a.includes("déconnexion")) return "log-out-outline";
    if (a.includes("export")) return "download-outline";
    return "ellipse-outline";
  };

  const renderAuditItem = ({ item }: { item: any }) => {
    const actionColor = getActionColor(item.action || "");
    const actionIcon = getActionIcon(item.action || "");

    return (
      <View style={styles.auditItem}>
        <View style={[styles.auditIconContainer, { backgroundColor: actionColor + "15" }]}>
          <Ionicons name={actionIcon as any} size={18} color={actionColor} />
        </View>
        <View style={styles.auditContent}>
          <Text style={styles.auditAction} numberOfLines={2}>
            {item.action || "Action inconnue"}
          </Text>
          <View style={styles.auditMeta}>
            {item.userName || item.userEmail ? (
              <View style={styles.auditMetaRow}>
                <Ionicons name="person-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.auditMetaText}>
                  {item.userName || item.userEmail || "Inconnu"}
                </Text>
              </View>
            ) : null}
            {item.createdAt && (
              <View style={styles.auditMetaRow}>
                <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.auditMetaText}>{formatDate(item.createdAt)}</Text>
              </View>
            )}
          </View>
          {item.details && (
            <Text style={styles.auditDetails} numberOfLines={1}>
              {typeof item.details === "string" ? item.details : JSON.stringify(item.details)}
            </Text>
          )}
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Export & Journal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeSection === "export" && styles.tabActive]}
          onPress={() => setActiveSection("export")}
        >
          <Ionicons
            name="cloud-download-outline"
            size={16}
            color={activeSection === "export" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSection === "export" && styles.tabTextActive]}>
            Export
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeSection === "audit" && styles.tabActive]}
          onPress={() => setActiveSection("audit")}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeSection === "audit" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeSection === "audit" && styles.tabTextActive]}>
            Journal d'audit
          </Text>
        </Pressable>
      </View>

      {activeSection === "export" && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-download-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Export des données</Text>
            </View>

            <View style={styles.exportCard}>
              <View style={styles.exportCardIcon}>
                <Ionicons name="document-text-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.exportCardTitle}>Exporter les données</Text>
              <Text style={styles.exportCardDesc}>
                Exporte toutes les données (clients, devis, factures, réservations) au format JSON.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.exportButton,
                  pressed && styles.exportButtonPressed,
                  exportingData && styles.exportButtonDisabled,
                ]}
                onPress={handleExportData}
                disabled={exportingData}
              >
                {exportingData ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.exportButtonText}>Exporter les données</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.exportCard}>
              <View style={styles.exportCardIcon}>
                <Ionicons name="server-outline" size={32} color={Colors.warning} />
              </View>
              <Text style={styles.exportCardTitle}>Export base de données</Text>
              <Text style={styles.exportCardDesc}>
                Exporte l'intégralité de la base de données. Cette opération peut prendre du temps.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.exportButton,
                  styles.exportButtonWarning,
                  pressed && styles.exportButtonWarningPressed,
                  exportingDb && styles.exportButtonDisabled,
                ]}
                onPress={handleExportDatabase}
                disabled={exportingDb}
              >
                {exportingDb ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.exportButtonText}>Exporter la base</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {activeSection === "audit" && (
        <View style={{ flex: 1 }}>
          {loadingLogs ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : logsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={40} color={Colors.warning} />
              <Text style={styles.errorText}>Impossible de charger le journal d'audit.</Text>
              <Pressable style={styles.retryButton} onPress={() => refetchLogs()}>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucune entrée</Text>
              <Text style={styles.emptySubtitle}>
                Le journal d'audit est vide pour le moment.
              </Text>
            </View>
          ) : (
            <FlatList
              data={auditLogs}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              renderItem={renderAuditItem}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 4,
                paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
              }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={auditLogs.length > 0}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
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
    gap: 16,
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
  exportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  exportCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  exportCardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  exportCardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 6,
    width: "100%",
  },
  exportButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  exportButtonWarning: {
    backgroundColor: Colors.warning,
  },
  exportButtonWarningPressed: {
    backgroundColor: "#D97706",
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  auditItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  auditIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  auditContent: {
    flex: 1,
    gap: 4,
  },
  auditAction: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  auditMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  auditMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  auditMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  auditDetails: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
