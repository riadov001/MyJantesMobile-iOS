import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { quotesApi, apiCall, Quote } from "@/lib/api";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";

const API_BASE = "https://appmyjantes.mytoolsgroup.eu";

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "pending" || s === "en_attente")
    return { label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const };
  if (s === "accepted" || s === "accepté" || s === "approved")
    return { label: "Accepté", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const };
  if (s === "rejected" || s === "refusé" || s === "refused")
    return { label: "Refusé", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const };
  if (s === "completed" || s === "terminé")
    return { label: "Terminé", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-done-outline" as const };
  if (s === "in_progress" || s === "en_cours")
    return { label: "En cours", color: "#3B82F6", bg: "#0F1D3D", icon: "hourglass-outline" as const };
  return { label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

function parseVehicleInfo(vehicleInfo: any) {
  if (!vehicleInfo) return null;
  if (typeof vehicleInfo === "string") {
    try {
      return JSON.parse(vehicleInfo);
    } catch {
      return null;
    }
  }
  if (typeof vehicleInfo === "object") return vehicleInfo;
  return null;
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon as any} size={16} color={Colors.textSecondary} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const { data: allQuotesRaw, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: quotesApi.getAll,
  });

  const allQuotes = Array.isArray(allQuotesRaw) ? allQuotesRaw : [];
  const quote = allQuotes.find((q) => q.id === id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Devis introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const date = new Date(quote.createdAt);
  const formattedDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const vehicleInfo = parseVehicleInfo((quote as any).vehicleInfo);
  const quoteItems = parseItems((quote as any).items);
  const quoteServices = Array.isArray((quote as any).services) ? (quote as any).services : [];
  const quotePhotos = Array.isArray((quote as any).photos) ? (quote as any).photos : [];
  const quoteNotes = (quote as any).notes || "";
  const totalAmount = (quote as any).quoteAmount || (quote as any).totalIncludingTax || (quote as any).totalAmount || "0";
  const totalHT = (quote as any).totalHT || (quote as any).amountHT;
  const tvaRate = (quote as any).tvaRate || (quote as any).taxRate || "20";
  const tvaAmount = (quote as any).tvaAmount || (quote as any).taxAmount;
  const viewToken = (quote as any).viewToken as string | undefined;
  const expiryDate = (quote as any).expiryDate || (quote as any).validUntil;
  const displayRef = (quote as any).reference || (quote as any).quoteNumber || quote.id;

  const statusLower = quote.status?.toLowerCase() || "";
  const canRespond = (statusLower === "pending" || statusLower === "approved") && !!viewToken;

  const pdfUrl = viewToken ? `${API_BASE}/api/public/quotes/${viewToken}/pdf` : null;

  const handleDownloadPdf = async () => {
    if (!pdfUrl) return;
    try {
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch {
      Linking.openURL(pdfUrl);
    }
  };

  const handleConsultExternal = async () => {
    if (!viewToken) return;
    const url = `${API_BASE}/public/quotes/${viewToken}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url);
    }
  };

  const handleAccept = async () => {
    if (!viewToken) return;
    setAccepting(true);
    try {
      await apiCall(`/api/public/quotes/${viewToken}/accept`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      showAlert({ type: 'success', title: 'Devis accepté', message: 'Le devis a bien été accepté.', buttons: [{ text: 'OK', style: 'primary' }] });
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erreur', message: err?.message || "Impossible d'accepter le devis.", buttons: [{ text: 'OK', style: 'primary' }] });
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!viewToken) return;
    showAlert({
      type: 'warning',
      title: 'Refuser le devis',
      message: 'Êtes-vous sûr de vouloir refuser ce devis ?',
      buttons: [
        { text: 'Annuler' },
        {
          text: 'Refuser',
          style: 'primary',
          onPress: async () => {
            setRejecting(true);
            try {
              await apiCall(`/api/public/quotes/${viewToken}/reject`, { method: "POST" });
              queryClient.invalidateQueries({ queryKey: ["quotes"] });
              showAlert({ type: 'success', title: 'Devis refusé', message: 'Le devis a bien été refusé.', buttons: [{ text: 'OK', style: 'primary' }] });
            } catch (err: any) {
              showAlert({ type: 'error', title: 'Erreur', message: err?.message || "Impossible de refuser le devis.", buttons: [{ text: 'OK', style: 'primary' }] });
            } finally {
              setRejecting(false);
            }
          },
        },
      ],
    });
  };

  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const totalHTNum = totalHT ? parseFloat(totalHT) : 0;
  const tvaAmountNum = tvaAmount ? parseFloat(tvaAmount) : 0;
  const totalTTCNum = parseFloat(totalAmount) || (totalHTNum + tvaAmountNum) || 0;

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
        <Text style={styles.headerTitle}>Détail du devis</Text>
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
          <Text style={styles.quoteNumber}>{displayRef}</Text>
          <Text style={styles.quoteDate}>{formattedDate}</Text>
          {formattedExpiry && (
            <Text style={styles.expiryText}>Valide jusqu'au {formattedExpiry}</Text>
          )}
        </View>

        {quoteItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Lignes du devis</Text>
            </View>
            {quoteItems.map((item: any, idx: number) => {
              const qty = item.quantity ? parseFloat(item.quantity) : 1;
              const unitPrice = item.unitPrice || item.price || item.priceHT || null;
              const lineTotal = item.total || item.totalHT || (unitPrice ? (parseFloat(unitPrice) * qty).toString() : null);
              return (
                <View key={idx} style={styles.lineItemCard}>
                  <Text style={styles.lineItemName}>{item.description || item.name || item.label || `Prestation ${idx + 1}`}</Text>
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

        {(totalHTNum > 0 || totalTTCNum > 0) && (
          <View style={styles.amountsCard}>
            {totalHTNum > 0 && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Montant HT</Text>
                <Text style={styles.amountHT}>{totalHTNum.toFixed(2)} €</Text>
              </View>
            )}
            {tvaAmountNum > 0 && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>TVA ({parseFloat(tvaRate)}%)</Text>
                <Text style={styles.amountTVA}>{tvaAmountNum.toFixed(2)} €</Text>
              </View>
            )}
          <View style={[styles.amountRow, (totalHTNum > 0 || tvaAmountNum > 0) ? styles.totalRow : undefined]}>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalValue}>{totalTTCNum.toFixed(2)} €</Text>
          </View>
          {totalAmount && parseFloat(totalAmount) > 0 && parseFloat(totalAmount) !== totalTTCNum && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                Total payé : {parseFloat(totalAmount).toFixed(2)} €
              </Text>
            </View>
          )}
        </View>
        )}

        {quoteServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Services demandés</Text>
            </View>
            {quoteServices.map((service: any, idx: number) => {
              const serviceName = typeof service === "string" ? service : service?.name || service?.id || `Service ${idx + 1}`;
              return (
                <View key={idx} style={styles.serviceRow}>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="checkmark" size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.serviceName}>{serviceName}</Text>
                </View>
              );
            })}
          </View>
        )}

        {vehicleInfo && typeof vehicleInfo === "object" && Object.keys(vehicleInfo).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Véhicule</Text>
            </View>
            {vehicleInfo.marque && <InfoRow icon="car-outline" label="Marque" value={vehicleInfo.marque} />}
            {vehicleInfo.modele && <InfoRow icon="car-sport-outline" label="Modèle" value={vehicleInfo.modele} />}
            {vehicleInfo.immatriculation && <InfoRow icon="card-outline" label="Immatriculation" value={vehicleInfo.immatriculation} />}
            {vehicleInfo.annee && <InfoRow icon="calendar-outline" label="Année" value={vehicleInfo.annee} />}
            {vehicleInfo.vin && <InfoRow icon="barcode-outline" label="VIN" value={vehicleInfo.vin} />}
            {vehicleInfo.couleur && <InfoRow icon="color-palette-outline" label="Couleur" value={vehicleInfo.couleur} />}
          </View>
        )}

        {quotePhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Photos ({quotePhotos.length})</Text>
            </View>
            <View style={styles.photosGrid}>
              {quotePhotos.map((photo: any, idx: number) => (
                <View key={idx} style={styles.photoThumb}>
                  <Image 
                    source={{ uri: (photo as any).url || (photo as any).uri || photo }} 
                    style={styles.photoImage} 
                    contentFit="cover"
                  />
                  <Text style={styles.photoLabel}>Photo {idx + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {quoteNotes ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{quoteNotes}</Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          {viewToken && (
            <>
              <Pressable style={styles.btnExternal} onPress={handleConsultExternal}>
                <Ionicons name="eye-outline" size={18} color={Colors.text} />
                <Text style={styles.btnExternalText}>Consulter les détails complets</Text>
              </Pressable>
              
              <Pressable style={styles.btnPdf} onPress={handleDownloadPdf}>
                <Ionicons name="document-outline" size={18} color="#3B82F6" />
                <Text style={styles.btnPdfText}>Télécharger PDF</Text>
              </Pressable>
            </>
          )}

          {canRespond && (
            <View style={styles.responseRow}>
              <Pressable
                style={[styles.btnAccept, accepting && styles.btnDisabled]}
                onPress={handleAccept}
                disabled={accepting || rejecting}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.btnAcceptText}>Accepter</Text>
              </Pressable>

              <Pressable
                style={[styles.btnReject, rejecting && styles.btnDisabled]}
                onPress={handleReject}
                disabled={accepting || rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color={Colors.rejected} />
                ) : (
                  <Ionicons name="close-circle-outline" size={18} color={Colors.rejected} />
                )}
                <Text style={styles.btnRejectText}>Refuser</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      {AlertComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  statusTextLarge: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  quoteNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  quoteDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  expiryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  amountsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  amountHT: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  amountTVA: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  totalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  totalBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  totalBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accepted,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
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
    marginBottom: 6,
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
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.acceptedBg,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoLabel: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "#fff",
    fontSize: 9,
    textAlign: "center",
    borderRadius: 4,
    paddingVertical: 2,
  },
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
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 12,
  },
  backLink: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  footerActions: {
    marginTop: 8,
    gap: 12,
    marginBottom: 20,
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
  responseRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnAccept: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accepted,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnAcceptText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  btnReject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.rejected,
  },
  btnRejectText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.rejected,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
