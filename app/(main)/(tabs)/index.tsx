import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { servicesApi, quotesApi, invoicesApi, reservationsApi, notificationsApi, adminAnalyticsApi, Service } from "@/lib/api";
import Colors from "@/constants/colors";
import { FloatingSupport } from "@/components/FloatingSupport";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: servicesRaw, isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const services = Array.isArray(servicesRaw) ? servicesRaw : [];

  const { data: quotesRaw, refetch: refetchQuotes } = useQuery({
    queryKey: ["quotes"],
    queryFn: quotesApi.getAll,
  });

  const quotes = Array.isArray(quotesRaw) ? quotesRaw : [];

  const { data: invoicesRaw = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: invoicesApi.getAll,
    retry: 1,
  });

  const { data: reservationsRaw = [], refetch: refetchReservations } = useQuery({
    queryKey: ["reservations"],
    queryFn: reservationsApi.getAll,
    retry: 1,
  });

  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
  const reservations = Array.isArray(reservationsRaw) ? reservationsRaw : [];

  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "superadmin";

  const { data: analyticsData, refetch: refetchAnalytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: adminAnalyticsApi.get,
    enabled: isAdmin,
  });

  const { data: notificationsRaw = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.getAll,
    refetchInterval: 30000,
  });
  const notifList = Array.isArray(notificationsRaw) ? notificationsRaw : [];
  const unreadCount = notifList.filter((n: any) => !n.isRead).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const refetches = [refetchServices(), refetchQuotes(), refetchInvoices(), refetchReservations()];
    if (isAdmin) refetches.push(refetchAnalytics());
    await Promise.all(refetches);
    setRefreshing(false);
  }, []);

  const pendingQuotes = quotes.filter((q) => q.status === "pending" || q.status === "en_attente");
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted" || q.status === "accepté");
  const unpaidInvoices = invoices.filter((i) => {
    const s = i.status?.toLowerCase();
    return s === "pending" || s === "en_attente" || s === "sent" || s === "envoyée" || s === "overdue" || s === "en_retard";
  });
  const upcomingReservations = reservations.filter((r) => {
    const s = r.status?.toLowerCase();
    return (s === "confirmed" || s === "confirmée" || s === "confirmé" || s === "pending" || s === "en_attente") && new Date(r.date) >= new Date();
  });
  const greeting = user?.firstName ? `Bonjour ${user.firstName}` : "Bonjour";

  const calculatedRevenue = invoices
    .filter((i: any) => { const s = i.status?.toLowerCase(); return s === 'paid' || s === 'payée' || s === 'payé'; })
    .reduce((sum: number, i: any) => sum + parseFloat(i.totalIncludingTax || i.totalTTC || '0'), 0);
  const displayRevenue = (() => {
    const rev = analyticsData?.totalRevenue ?? analyticsData?.revenue;
    const num = typeof rev === "number" ? rev : 0;
    return num > 0 ? num : calculatedRevenue;
  })();

  const quoteStatusCounts = {
    pending: quotes.filter((q: any) => q.status === 'pending' || q.status === 'en_attente').length,
    accepted: quotes.filter((q: any) => q.status === 'accepted' || q.status === 'accepté').length,
    rejected: quotes.filter((q: any) => q.status === 'rejected' || q.status === 'refusé').length,
    completed: quotes.filter((q: any) => q.status === 'completed' || q.status === 'terminé').length,
  };
  const maxQuoteCount = Math.max(quoteStatusCounts.pending, quoteStatusCounts.accepted, quoteStatusCounts.rejected, quoteStatusCounts.completed, 1);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 100 : insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.welcomeText}>Bienvenue sur MyJantes</Text>
          </View>
          <Pressable
            style={styles.notifBtn}
            onPress={() => router.push("/(main)/(tabs)/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.headerLogo}
            contentFit="contain"
          />
        </View>

        {isAdmin && (
          <View style={styles.adminDashboard}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Tableau de bord</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            </View>

            <View style={styles.adminStatsGrid}>
              <View style={styles.adminStatCard}>
                <Ionicons name="people-outline" size={20} color={Colors.primary} />
                <Text style={[styles.adminStatNumber, { color: Colors.primary }]}>
                  {typeof analyticsData?.totalClients === "number" ? analyticsData.totalClients : (typeof analyticsData?.clients === "number" ? analyticsData.clients : (Array.isArray(analyticsData?.clients) ? analyticsData.clients.length : 0))}
                </Text>
                <Text style={styles.adminStatLabel}>Clients</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Ionicons name="documents-outline" size={20} color={Colors.primary} />
                <Text style={[styles.adminStatNumber, { color: Colors.primary }]}>
                  {typeof analyticsData?.totalQuotes === "number" ? analyticsData.totalQuotes : (typeof analyticsData?.quotes === "number" ? analyticsData.quotes : (Array.isArray(analyticsData?.quotes) ? analyticsData.quotes.length : 0))}
                </Text>
                <Text style={styles.adminStatLabel}>Devis</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
                <Text style={[styles.adminStatNumber, { color: Colors.primary }]}>
                  {typeof analyticsData?.totalInvoices === "number" ? analyticsData.totalInvoices : (typeof analyticsData?.invoices === "number" ? analyticsData.invoices : (Array.isArray(analyticsData?.invoices) ? analyticsData.invoices.length : 0))}
                </Text>
                <Text style={styles.adminStatLabel}>Factures</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Ionicons name="cash-outline" size={20} color={Colors.accepted} />
                <Text style={[styles.adminStatNumber, { color: Colors.accepted }]}>
                  {displayRevenue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                </Text>
                <Text style={styles.adminStatLabel}>CA</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Ionicons name="time-outline" size={20} color={Colors.pending} />
                <Text style={[styles.adminStatNumber, { color: Colors.pending }]}>
                  {typeof analyticsData?.pendingQuotes === "number" ? analyticsData.pendingQuotes : 0}
                </Text>
                <Text style={styles.adminStatLabel}>En attente</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={[styles.adminStatNumber, { color: Colors.primary }]}>
                  {typeof analyticsData?.activeReservations === "number" ? analyticsData.activeReservations : 0}
                </Text>
                <Text style={styles.adminStatLabel}>RDV actifs</Text>
              </View>
            </View>

            <View style={styles.chartSection}>
              <Text style={styles.chartSectionTitle}>Activité récente</Text>

              <Text style={styles.chartSubTitle}>Répartition des devis</Text>
              {[
                { label: "En attente", count: quoteStatusCounts.pending, color: Colors.pending },
                { label: "Acceptés", count: quoteStatusCounts.accepted, color: Colors.accepted },
                { label: "Refusés", count: quoteStatusCounts.rejected, color: Colors.rejected },
                { label: "Terminés", count: quoteStatusCounts.completed, color: Colors.primary },
              ].map((item) => (
                <View key={item.label} style={styles.chartBarRow}>
                  <Text style={styles.chartBarLabel}>{item.label}</Text>
                  <View style={styles.chartBarTrack}>
                    <View style={[styles.chartBarFill, { width: `${(item.count / maxQuoteCount) * 100}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.chartBarValue}>{item.count}</Text>
                </View>
              ))}

              <View style={styles.revenueIndicator}>
                <View style={styles.revenueIndicatorLeft}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.accepted} />
                  <Text style={styles.revenueIndicatorLabel}>CA factures payées</Text>
                </View>
                <Text style={styles.revenueIndicatorValue}>
                  {calculatedRevenue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                </Text>
              </View>
            </View>

            <View style={styles.adminActions}>
              <Pressable
                style={({ pressed }) => [styles.adminActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/(main)/admin-clients" as any)}
              >
                <Ionicons name="people" size={18} color={Colors.primary} />
                <Text style={styles.adminActionText}>Gérer les clients</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.adminActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/(main)/admin-users" as any)}
              >
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                <Text style={styles.adminActionText}>Gérer les utilisateurs</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.adminActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/(main)/admin-settings" as any)}
              >
                <Ionicons name="settings-outline" size={18} color={Colors.primary} />
                <Text style={styles.adminActionText}>Paramètres</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.adminActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/(main)/ocr-scanner" as any)}
              >
                <Ionicons name="scan" size={18} color={Colors.primary} />
                <Text style={styles.adminActionText}>Scanner OCR</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.adminActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/(main)/admin-notifications" as any)}
              >
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
                <Text style={styles.adminActionText}>Notifications admin</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.ctaCard, pressed && styles.ctaCardPressed]}
          onPress={() => router.push("/(main)/new-quote")}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaIconContainer}>
              <Ionicons name="add-circle" size={32} color="#fff" />
            </View>
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Demander un devis</Text>
              <Text style={styles.ctaSubtitle}>Gratuit et sans engagement</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <View style={styles.statsRow}>
          <Pressable
            style={[styles.statCard, { backgroundColor: Colors.pendingBg }]}
            onPress={() => router.push("/(main)/(tabs)/quotes")}
          >
            <Ionicons name="time-outline" size={22} color={Colors.pending} />
            <Text style={[styles.statNumber, { color: Colors.pending }]}>{pendingQuotes.length}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </Pressable>
          <Pressable
            style={[styles.statCard, { backgroundColor: Colors.acceptedBg }]}
            onPress={() => router.push("/(main)/(tabs)/quotes")}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={Colors.accepted} />
            <Text style={[styles.statNumber, { color: Colors.accepted }]}>{acceptedQuotes.length}</Text>
            <Text style={styles.statLabel}>Acceptés</Text>
          </Pressable>
          <Pressable
            style={[styles.statCard, { backgroundColor: Colors.surfaceSecondary }]}
            onPress={() => router.push("/(main)/(tabs)/quotes")}
          >
            <Ionicons name="documents-outline" size={22} color={Colors.primary} />
            <Text style={[styles.statNumber, { color: Colors.primary }]}>{quotes.length}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </Pressable>
        </View>

        {(unpaidInvoices.length > 0 || invoices.length > 0 || upcomingReservations.length > 0) && (
          <View style={styles.statsRow}>
            <Pressable
              style={[styles.statCard, { backgroundColor: unpaidInvoices.length > 0 ? Colors.pendingBg : Colors.surfaceSecondary }]}
              onPress={() => router.push("/(main)/(tabs)/invoices")}
            >
              <Ionicons name="receipt-outline" size={22} color={unpaidInvoices.length > 0 ? Colors.pending : Colors.textSecondary} />
              <Text style={[styles.statNumber, { color: unpaidInvoices.length > 0 ? Colors.pending : Colors.textSecondary }]}>
                {invoices.length}
              </Text>
              <Text style={styles.statLabel}>Factures</Text>
            </Pressable>
            <Pressable
              style={[styles.statCard, { backgroundColor: upcomingReservations.length > 0 ? "#0F1D3D" : Colors.surfaceSecondary }]}
              onPress={() => router.push("/(main)/(tabs)/reservations")}
            >
              <Ionicons name="calendar-outline" size={22} color={upcomingReservations.length > 0 ? "#3B82F6" : Colors.textSecondary} />
              <Text style={[styles.statNumber, { color: upcomingReservations.length > 0 ? "#3B82F6" : Colors.textSecondary }]}>
                {upcomingReservations.length}
              </Text>
              <Text style={styles.statLabel}>RDV à venir</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nos services</Text>
          <Text style={styles.sectionCount}>{(Array.isArray(services) ? services : []).length} disponibles</Text>
        </View>

        {loadingServices ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.servicesGrid}>
            {(Array.isArray(services) ? services : []).filter((s: Service) => s.isActive).map((service: Service) => (
              <Pressable
                key={service.id}
                style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]}
                onPress={() => router.push({ pathname: "/(main)/new-quote", params: { serviceId: service.id } })}
              >
                <View style={styles.serviceIconContainer}>
                  <Ionicons name="construct-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {(service.name || "").trim()}
                </Text>
                {parseFloat(service.basePrice || "0") > 0 && (
                  <Text style={styles.servicePrice}>
                    à partir de {parseFloat(service.basePrice).toFixed(0)}€
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <FloatingSupport />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerLogo: {
    width: 90,
    height: 40,
  },
  ctaCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  ctaCardPressed: {
    backgroundColor: Colors.primaryDark,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  ctaSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  loader: {
    marginTop: 20,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCard: {
    width: "48%" as any,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    flexBasis: "48%",
  },
  serviceCardPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  serviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 18,
  },
  servicePrice: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  adminDashboard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  adminTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  adminBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  adminStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  adminStatCard: {
    width: "31%" as any,
    flexBasis: "31%",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  adminStatNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  adminStatLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  adminActions: {
    gap: 8,
  },
  adminActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  adminActionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  chartSection: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  chartSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  chartSubTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  chartBarRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  chartBarLabel: {
    width: 75,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  chartBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 7,
    overflow: "hidden" as const,
  },
  chartBarFill: {
    height: 14,
    borderRadius: 7,
    minWidth: 4,
  },
  chartBarValue: {
    width: 28,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "right" as const,
  },
  revenueIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  revenueIndicatorLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  revenueIndicatorLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  revenueIndicatorValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.accepted,
  },
});
