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
    return { label: "Pay\u00e9e", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const };
  if (s === "pending" || s === "en_attente")
    return { label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const };
  if (s === "overdue" || s === "en_retard")
    return { label: "En retard", color: Colors.rejected, bg: Colors.rejectedBg, icon: "alert-circle-outline" as const };
  if (s === "sent" || s === "envoyée" || s === "envoyee")
    return { label: "Envoy\u00e9e", color: "#3B82F6", bg: "#0F1D3D", icon: "send-outline" as const };
  if (s === "cancelled" || s === "annul\u00e9e" || s === "annulee")
    return { label: "Annul\u00e9e", color: Colors.textTertiary, bg: Colors.surfaceSecondary, icon: "close-circle-outline" as const };
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

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  });

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
    month: "long",
    year: "numeric",
  });

  const invoiceItems = parseItems(invoice.items);
  const viewToken = (invoice as any).viewToken as string | undefined;
  const paymentLink = (invoice as any).paymentLink as string | undefined;

  const statusLower = invoice.status?.toLowerCase() || "";
  const isUnpaid = statusLower === "pending" || statusLower === "en_attente"
    || statusLower === "overdue" || statusLower === "en_retard"
    || statusLower === "sent" || statusLower === "envoyee" || statusLower === "envoyée";

  const publicUrl = viewToken ? `${API_BASE}/api/public/invoices/${viewToken}` : null;
  const pdfUrl = viewToken ? `${API_BASE}/api/public/invoices/${viewToken}/pdf` : null;

  const handleConsultOnline = async () => {
    if (!publicUrl) return;
    try {
      await WebBrowser.openBrowserAsync(publicUrl);
    } catch {
      Linking.openURL(publicUrl);
    }
  };

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
        <Text style={styles.headerTitle}>Detail facture</Text>
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
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber || "Facture"}</Text>
          <Text style={styles.invoiceDate}>{createdDate}</Text>
        </View>

        <View style={styles.amountsCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Montant HT</Text>
            <Text style={styles.amountHT}>{parseFloat(invoice.totalHT || "0").toFixed(2)} EUR</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>TVA ({parseFloat(invoice.tvaRate || "20")}%)</Text>
            <Text style={styles.amountTVA}>{parseFloat(invoice.tvaAmount || "0").toFixed(2)} EUR</Text>
          </View>
          <View style={[styles.amountRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalValue}>{parseFloat(invoice.totalTTC || "0").toFixed(2)} EUR</Text>
          </View>
        </View>

        {invoice.dueDate && (
          <View style={styles.infoCard}>
            <Ionicons name="hourglass-outline" size={18} color={Colors.pending} />
            <View>
              <Text style={styles.infoCardLabel}>Date d'echeance</Text>
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
              <Text style={styles.infoCardLabel}>Payee le</Text>
              <Text style={styles.infoCardValue}>
                {new Date(invoice.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </View>
          </View>
        )}

        {invoiceItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Detail</Text>
            </View>
            {invoiceItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.description || item.name || `Ligne ${idx + 1}`}</Text>
                  {item.quantity && <Text style={styles.itemQty}>x{item.quantity}</Text>}
                </View>
                {(item.unitPrice || item.total) && (
                  <Text style={styles.itemPrice}>
                    {parseFloat(item.total || item.unitPrice || "0").toFixed(2)} EUR
                  </Text>
                )}
              </View>
            ))}
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
          {isUnpaid && paymentLink && (
            <Pressable style={styles.btnPay} onPress={handlePayOnline}>
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnPayText}>Payer en ligne</Text>
            </Pressable>
          )}

          {viewToken && (
            <>
              <Pressable style={styles.btnConsult} onPress={handleConsultOnline}>
                <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnConsultText}>Consulter en ligne</Text>
              </Pressable>

              <Pressable style={styles.btnPdf} onPress={handleDownloadPdf}>
                <Ionicons name="document-outline" size={18} color="#3B82F6" />
                <Text style={styles.btnPdfText}>Telecharger PDF</Text>
              </Pressable>
            </>
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
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1 },
  itemQty: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  itemPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary, marginLeft: 12 },
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
  btnConsult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnConsultText: {
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
});
