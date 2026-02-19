import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { invoicesApi, Invoice } from "@/lib/api";
import Colors from "@/constants/colors";

const API_BASE = "https://appmyjantes.mytoolsgroup.eu";

function getInvoiceStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "paid" || s === "payée" || s === "payé")
    return { label: "Payée", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const };
  if (s === "pending" || s === "en_attente")
    return { label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const };
  if (s === "overdue" || s === "en_retard")
    return { label: "En retard", color: Colors.rejected, bg: Colors.rejectedBg, icon: "alert-circle-outline" as const };
  if (s === "sent" || s === "envoyée" || s === "envoyee")
    return { label: "Envoyée", color: "#3B82F6", bg: "#0F1D3D", icon: "send-outline" as const };
  if (s === "cancelled" || s === "annulée" || s === "annulee")
    return { label: "Annulée", color: Colors.textTertiary, bg: Colors.surfaceSecondary, icon: "close-circle-outline" as const };
  if (s === "draft" || s === "brouillon")
    return { label: "Brouillon", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "create-outline" as const };
  return { label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

function parseItems(items: any): any[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function InvoiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: allInvoicesRaw = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: invoicesApi.getAll,
    retry: 1,
  });

  const allInvoices = Array.isArray(allInvoicesRaw) ? allInvoicesRaw : [];
  const invoice = allInvoices.find((inv) => inv.id === id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Facture introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusInfo = getInvoiceStatusInfo(invoice.status);
  const createdDate = new Date(invoice.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const invoiceItems = parseItems(invoice.items);
  const viewToken = (invoice as any).viewToken as string | undefined;
  const paymentLink = (invoice as any).paymentLink || (invoice as any).payment_url || (invoice as any).stripe_url;
  const displayRef = invoice.invoiceNumber || invoice.id;

  const totalIncludingTax = (invoice as any).totalIncludingTax;
  const totalTTC_Display = totalIncludingTax ? parseFloat(totalIncludingTax) : parseFloat(invoice.totalTTC || "0");

  const statusLower = invoice.status?.toLowerCase() || "";
  const isUnpaid = statusLower === "pending" || statusLower === "en_attente"
    || statusLower === "overdue" || statusLower === "en_retard"
    || statusLower === "sent" || statusLower === "envoyee" || statusLower === "envoyée";

  const pdfUrl = viewToken ? `${API_BASE}/api/public/invoices/${viewToken}/pdf` : null;

  const handleDownloadPdf = async () => {
    if (!pdfUrl) return;
    try {
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch {
      Linking.openURL(pdfUrl);
    }
  };

  const handlePayOnline = async () => {
    const url = paymentLink || `${API_BASE}/client/invoices`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url);
    }
  };

  const handleConsultExternal = async () => {
    const url = `${API_BASE}/client/invoices`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Détail facture</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.bg }]}>
            <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
            <Text style={[styles.statusTextLarge, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <Text style={styles.invoiceNumber}>{displayRef}</Text>
          <Text style={styles.invoiceDate}>{createdDate}</Text>
          {(invoice as any).totalIncludingTax && parseFloat((invoice as any).totalIncludingTax) > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {parseFloat((invoice as any).totalIncludingTax).toFixed(2)} €
              </Text>
            </View>
          )}
        </View>

        {invoiceItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Lignes de la facture</Text>
            </View>
            {invoiceItems.map((item: any, idx: number) => {
              const qty = item.quantity ? parseFloat(item.quantity) : 1;
              const unitPrice = item.unitPrice || item.price || item.priceHT || null;
              const lineTotal = item.total || item.totalHT || (unitPrice ? (parseFloat(unitPrice) * qty).toString() : null);
              const serviceDetails = item.serviceDetails || item.details || item.notes;
              return (
                <View key={idx} style={styles.lineItemCard}>
                  <Text style={styles.lineItemName}>{item.description || item.name || item.label || `Ligne ${idx + 1}`}</Text>
                  {serviceDetails && (
                    <Text style={styles.lineItemDetailsText}>{serviceDetails}</Text>
                  )}
                  <View style={styles.lineItemDetails}>
                    {unitPrice && (
                      <Text style={styles.lineItemMeta}>
                        {parseFloat(unitPrice).toFixed(2)} € x {qty}
                      </Text>
                    )}
                    {!unitPrice && qty > 1 && (
                      <Text style={styles.lineItemMeta}>Qté : {qty}</Text>
                    )}
                    {lineTotal && (
                      <Text style={styles.lineItemTotal}>
                        {parseFloat(lineTotal).toFixed(2)} €
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.amountsCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Montant HT</Text>
            <Text style={styles.amountHT}>{parseFloat(invoice.totalHT || "0").toFixed(2)} €</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>TVA ({parseFloat(invoice.tvaRate || "20")}%)</Text>
            <Text style={styles.amountTVA}>{parseFloat(invoice.tvaAmount || "0").toFixed(2)} €</Text>
          </View>
          <View style={[styles.amountRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalValue}>{totalTTC_Display.toFixed(2)} €</Text>
          </View>
        </View>

        {invoice.dueDate && (
          <View style={styles.infoCard}>
            <Ionicons name="hourglass-outline" size={18} color={Colors.pending} />
            <View>
              <Text style={styles.infoCardLabel}>Date d'échéance</Text>
              <Text style={styles.infoCardValue}>
                {new Date(invoice.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </View>
          </View>
        )}

        {invoice.paidAt && (
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.accepted} />
            <View>
              <Text style={styles.infoCardLabel}>Payée le</Text>
              <Text style={styles.infoCardValue}>
                {new Date(invoice.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </View>
          </View>
        )}

        {invoice.notes ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <Pressable style={styles.btnExternal} onPress={handleConsultExternal}>
            <Ionicons name="eye-outline" size={18} color={Colors.text} />
            <Text style={styles.btnExternalText}>Consulter les détails complets</Text>
          </Pressable>

          {isUnpaid && paymentLink && (
            <Pressable style={styles.btnPay} onPress={handlePayOnline}>
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnPayText}>Payer en ligne</Text>
            </Pressable>
          )}

          {viewToken && (
            <Pressable style={styles.btnPdf} onPress={handleDownloadPdf}>
              <Ionicons name="document-outline" size={18} color="#3B82F6" />
              <Text style={styles.btnPdfText}>Télécharger PDF</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  statusCard: { alignItems: "center", marginBottom: 20, gap: 8 },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  statusTextLarge: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  invoiceNumber: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  invoiceDate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  totalBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  totalBadgeText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  lineItemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineItemName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 4,
  },
  lineItemDetailsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  lineItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineItemMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  lineItemTotal: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  amountsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  amountHT: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  amountTVA: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  totalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.primary },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  infoCardValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  notesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 12 },
  backLink: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  backLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  footerActions: {
    marginTop: 8,
    gap: 12,
    marginBottom: 20,
  },
  btnPay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accepted,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnPayText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  btnPdf: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  btnPdfText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#3B82F6",
  },
  btnExternal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnExternalText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
