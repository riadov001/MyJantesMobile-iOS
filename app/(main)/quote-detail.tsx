import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { quotesApi, apiCall, Quote } from "@/lib/api";
import Colors from "@/constants/colors";

const API_BASE = "https://appmyjantes.mytoolsgroup.eu";

function getStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "pending" || s === "en_attente")
    return { label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const };
  if (s === "accepted" || s === "accepté" || s === "approved")
    return { label: "Accept\u00e9", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const };
  if (s === "rejected" || s === "refus\u00e9" || s === "refused")
    return { label: "Refus\u00e9", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const };
  if (s === "completed" || s === "termin\u00e9")
    return { label: "Termin\u00e9", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-done-outline" as const };
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
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["quotes", id],
    queryFn: () => quotesApi.getById(id!),
    enabled: !!id,
  });

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const vehicleInfo = parseVehicleInfo((quote as any).vehicleInfo);
  const quoteItems = (quote as any).items || [];
  const quoteServices = (quote as any).services || [];
  const quotePhotos = (quote as any).photos || [];
  const quoteNotes = (quote as any).notes || "";
  const totalAmount = (quote as any).quoteAmount || (quote as any).totalAmount || "0";
  const viewToken = (quote as any).viewToken as string | undefined;
  const expiryDate = (quote as any).expiryDate || (quote as any).validUntil;
  const displayRef = (quote as any).reference || (quote as any).quoteNumber || `Devis #${quote.id.slice(0, 8).toUpperCase()}`;

  const statusLower = quote.status?.toLowerCase() || "";
  const canRespond = (statusLower === "pending" || statusLower === "approved") && !!viewToken;

  const publicUrl = viewToken ? `${API_BASE}/api/public/quotes/${viewToken}` : null;
  const pdfUrl = viewToken ? `${API_BASE}/api/public/quotes/${viewToken}/pdf` : null;

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

  const handleAccept = async () => {
    if (!viewToken) return;
    setAccepting(true);
    try {
      await apiCall(`/api/public/quotes/${viewToken}/accept`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      Alert.alert("Devis accepte", "Le devis a bien ete accepte.");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible d'accepter le devis.");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!viewToken) return;
    Alert.alert(
      "Refuser le devis",
      "Etes-vous sur de vouloir refuser ce devis ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Refuser",
          style: "destructive",
          onPress: async () => {
            setRejecting(true);
            try {
              await apiCall(`/api/public/quotes/${viewToken}/reject`, { method: "POST" });
              queryClient.invalidateQueries({ queryKey: ["quotes"] });
              queryClient.invalidateQueries({ queryKey: ["quotes", id] });
              Alert.alert("Devis refuse", "Le devis a bien ete refuse.");
            } catch (err: any) {
              Alert.alert("Erreur", err?.message || "Impossible de refuser le devis.");
            } finally {
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

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
        <Text style={styles.headerTitle}>Detail du devis</Text>
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

        {totalAmount && parseFloat(totalAmount) > 0 && (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Montant total</Text>
            <Text style={styles.amountValue}>{parseFloat(totalAmount).toFixed(2)} EUR</Text>
          </View>
        )}

        {quoteItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Detail des prestations</Text>
            </View>
            {quoteItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.description || item.name || `Prestation ${idx + 1}`}</Text>
                  {item.quantity && <Text style={styles.itemQty}>x{item.quantity}</Text>}
                </View>
                {(item.unitPrice || item.price || item.total) && (
                  <Text style={styles.itemPrice}>
                    {parseFloat(item.total || item.unitPrice || item.price || "0").toFixed(2)} EUR
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {quoteServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Services demandes</Text>
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
              <Text style={styles.sectionTitle}>Vehicule</Text>
            </View>
            {vehicleInfo.marque && <InfoRow icon="car-outline" label="Marque" value={vehicleInfo.marque} />}
            {vehicleInfo.modele && <InfoRow icon="car-sport-outline" label="Modele" value={vehicleInfo.modele} />}
            {vehicleInfo.immatriculation && <InfoRow icon="card-outline" label="Immatriculation" value={vehicleInfo.immatriculation} />}
            {vehicleInfo.annee && <InfoRow icon="calendar-outline" label="Annee" value={vehicleInfo.annee} />}
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
                  <Ionicons name="image" size={24} color={Colors.textTertiary} />
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

        {viewToken && (
          <View style={styles.footerActions}>
            <Pressable style={styles.btnConsult} onPress={handleConsultOnline}>
              <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnConsultText}>Consulter en ligne</Text>
            </Pressable>

            <Pressable style={styles.btnPdf} onPress={handleDownloadPdf}>
              <Ionicons name="document-outline" size={18} color="#3B82F6" />
              <Text style={styles.btnPdfText}>Telecharger PDF</Text>
            </Pressable>

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
        )}
      </ScrollView>
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
  amountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 4,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
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
  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginLeft: 12,
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  photoLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
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
