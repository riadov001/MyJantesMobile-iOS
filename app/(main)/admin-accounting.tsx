import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAccountingApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

type TabKey = "pnl" | "tva" | "cashflow" | "entries";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "pnl", label: "P&L", icon: "trending-up-outline" },
  { key: "tva", label: "TVA", icon: "receipt-outline" },
  { key: "cashflow", label: "Trésorerie", icon: "wallet-outline" },
  { key: "entries", label: "Journal", icon: "list-outline" },
];

const PERIODS = [
  { key: "month", label: "Ce mois" },
  { key: "quarter", label: "Ce trimestre" },
  { key: "year", label: "Cette année" },
  { key: "all", label: "Tout" },
];

function formatCurrency(value: any): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0,00 \u20AC";
  return num.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr || "-";
  }
}

export default function AdminAccountingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [activeTab, setActiveTab] = useState<TabKey>("pnl");
  const [period, setPeriod] = useState("year");
  const [exporting, setExporting] = useState(false);

  const periodParam = period !== "all" ? `period=${period}` : "";

  const { data: pnlData, isLoading: loadingPnl, isError: errorPnl } = useQuery({
    queryKey: ["admin-accounting-pnl", period],
    queryFn: () => adminAccountingApi.getProfitLoss(periodParam),
    enabled: activeTab === "pnl",
  });

  const { data: tvaData, isLoading: loadingTva, isError: errorTva } = useQuery({
    queryKey: ["admin-accounting-tva", period],
    queryFn: () => adminAccountingApi.getTvaReport(periodParam),
    enabled: activeTab === "tva",
  });

  const { data: cashFlowData, isLoading: loadingCashFlow, isError: errorCashFlow } = useQuery({
    queryKey: ["admin-accounting-cashflow", period],
    queryFn: () => adminAccountingApi.getCashFlow(periodParam),
    enabled: activeTab === "cashflow",
  });

  const { data: entriesData, isLoading: loadingEntries, isError: errorEntries } = useQuery({
    queryKey: ["admin-accounting-entries", period],
    queryFn: () => adminAccountingApi.getEntries(periodParam),
    enabled: activeTab === "entries",
  });

  const isLoading =
    (activeTab === "pnl" && loadingPnl) ||
    (activeTab === "tva" && loadingTva) ||
    (activeTab === "cashflow" && loadingCashFlow) ||
    (activeTab === "entries" && loadingEntries);

  const hasError =
    (activeTab === "pnl" && errorPnl) ||
    (activeTab === "tva" && errorTva) ||
    (activeTab === "cashflow" && errorCashFlow) ||
    (activeTab === "entries" && errorEntries);

  const handleExportFec = async () => {
    setExporting(true);
    try {
      await adminAccountingApi.exportFec(periodParam);
      showAlert({
        type: "success",
        title: "Export FEC",
        message: "L'export FEC a été généré avec succès.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de générer l'export FEC.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-accounting-pnl", period] });
    queryClient.invalidateQueries({ queryKey: ["admin-accounting-tva", period] });
    queryClient.invalidateQueries({ queryKey: ["admin-accounting-cashflow", period] });
    queryClient.invalidateQueries({ queryKey: ["admin-accounting-entries", period] });
  };

  const renderStatCard = (label: string, value: any, color?: string) => (
    <View style={styles.statCard} key={label}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );

  const renderPnl = () => {
    if (!pnlData) return null;
    const revenue = pnlData.revenue ?? pnlData.totalRevenue ?? pnlData.chiffreAffaires ?? 0;
    const expenses = pnlData.expenses ?? pnlData.totalExpenses ?? pnlData.charges ?? 0;
    const profit = pnlData.profit ?? pnlData.netProfit ?? pnlData.resultat ?? (parseFloat(revenue) - parseFloat(expenses));
    const profitNum = parseFloat(profit) || 0;

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Compte de résultat</Text>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard("Chiffre d'affaires", revenue, Colors.success)}
          {renderStatCard("Charges", expenses, Colors.error)}
          {renderStatCard("Résultat net", profit, profitNum >= 0 ? Colors.success : Colors.error)}
        </View>

        {pnlData.details && Array.isArray(pnlData.details) && (
          <View style={styles.detailsList}>
            <Text style={styles.detailsTitle}>Détail</Text>
            {pnlData.details.map((item: any, i: number) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label || item.category || item.name || `Ligne ${i + 1}`}</Text>
                <Text style={styles.detailValue}>{formatCurrency(item.amount || item.value || 0)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTva = () => {
    if (!tvaData) return null;
    const collected = tvaData.tvaCollected ?? tvaData.tvaCollectee ?? tvaData.collected ?? 0;
    const deductible = tvaData.tvaDeductible ?? tvaData.deductible ?? 0;
    const due = tvaData.tvaDue ?? tvaData.tvaADeclarer ?? tvaData.due ?? (parseFloat(collected) - parseFloat(deductible));

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Déclaration de TVA</Text>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard("TVA collectée", collected, Colors.warning)}
          {renderStatCard("TVA déductible", deductible, Colors.success)}
          {renderStatCard("TVA à déclarer", due, Colors.primary)}
        </View>

        {tvaData.details && Array.isArray(tvaData.details) && (
          <View style={styles.detailsList}>
            <Text style={styles.detailsTitle}>Détail par taux</Text>
            {tvaData.details.map((item: any, i: number) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.rate ?? item.taux ?? "-"}%</Text>
                <Text style={styles.detailValue}>{formatCurrency(item.amount || item.montant || 0)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCashFlow = () => {
    if (!cashFlowData) return null;
    const inflow = cashFlowData.inflow ?? cashFlowData.encaissements ?? cashFlowData.totalIn ?? 0;
    const outflow = cashFlowData.outflow ?? cashFlowData.decaissements ?? cashFlowData.totalOut ?? 0;
    const balance = cashFlowData.balance ?? cashFlowData.solde ?? cashFlowData.net ?? (parseFloat(inflow) - parseFloat(outflow));
    const balanceNum = parseFloat(balance) || 0;

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Flux de trésorerie</Text>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard("Encaissements", inflow, Colors.success)}
          {renderStatCard("Décaissements", outflow, Colors.error)}
          {renderStatCard("Solde net", balance, balanceNum >= 0 ? Colors.success : Colors.error)}
        </View>

        {cashFlowData.movements && Array.isArray(cashFlowData.movements) && (
          <View style={styles.detailsList}>
            <Text style={styles.detailsTitle}>Mouvements</Text>
            {cashFlowData.movements.map((item: any, i: number) => (
              <View key={i} style={styles.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>{item.description || item.label || `Mouvement ${i + 1}`}</Text>
                  {item.date && <Text style={styles.detailDate}>{formatDate(item.date)}</Text>}
                </View>
                <Text style={[styles.detailValue, { color: parseFloat(item.amount) >= 0 ? Colors.success : Colors.error }]}>
                  {formatCurrency(item.amount || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEntries = () => {
    const entries = Array.isArray(entriesData) ? entriesData : [];

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Écritures comptables</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune écriture comptable</Text>
          </View>
        ) : (
          entries.map((entry: any, i: number) => (
            <View key={entry.id || i} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryRef}>
                  {entry.reference || entry.journalCode || entry.pieceRef || `#${i + 1}`}
                </Text>
                <Text style={styles.entryDate}>
                  {formatDate(entry.date || entry.ecritureDate || entry.createdAt)}
                </Text>
              </View>
              <Text style={styles.entryLabel} numberOfLines={2}>
                {entry.label || entry.ecritureLib || entry.description || "-"}
              </Text>
              <View style={styles.entryAmounts}>
                {(entry.debit != null || entry.montantDebit != null) && (
                  <View style={styles.entryAmountItem}>
                    <Text style={styles.entryAmountLabel}>Débit</Text>
                    <Text style={[styles.entryAmountValue, { color: Colors.error }]}>
                      {formatCurrency(entry.debit ?? entry.montantDebit ?? 0)}
                    </Text>
                  </View>
                )}
                {(entry.credit != null || entry.montantCredit != null) && (
                  <View style={styles.entryAmountItem}>
                    <Text style={styles.entryAmountLabel}>Crédit</Text>
                    <Text style={[styles.entryAmountValue, { color: Colors.success }]}>
                      {formatCurrency(entry.credit ?? entry.montantCredit ?? 0)}
                    </Text>
                  </View>
                )}
                {entry.amount != null && entry.debit == null && entry.credit == null && (
                  <View style={styles.entryAmountItem}>
                    <Text style={styles.entryAmountLabel}>Montant</Text>
                    <Text style={styles.entryAmountValue}>
                      {formatCurrency(entry.amount)}
                    </Text>
                  </View>
                )}
              </View>
              {entry.compteNum && (
                <Text style={styles.entryAccount}>Compte: {entry.compteNum} {entry.compteLib ? `- ${entry.compteLib}` : ""}</Text>
              )}
            </View>
          ))
        )}
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
        <Text style={styles.headerTitle}>Comptabilité</Text>
        <Pressable
          onPress={handleExportFec}
          style={styles.exportButton}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="download-outline" size={22} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodContainer}
      >
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={40} color={Colors.warning} />
          <Text style={styles.errorText}>Impossible de charger les données.</Text>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {activeTab === "pnl" && renderPnl()}
          {activeTab === "tva" && renderTva()}
          {activeTab === "cashflow" && renderCashFlow()}
          {activeTab === "entries" && renderEntries()}
        </ScrollView>
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
  exportButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
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
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  periodContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: Colors.primary + "20",
    borderColor: Colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.primary,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionContent: {
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
  statsGrid: {
    gap: 10,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  detailsList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  detailsTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  detailDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryRef: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  entryDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  entryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  entryAmounts: {
    flexDirection: "row",
    gap: 16,
  },
  entryAmountItem: {
    gap: 2,
  },
  entryAmountLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  entryAmountValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  entryAccount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
