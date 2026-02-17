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
import { servicesApi, quotesApi, invoicesApi, reservationsApi, Service } from "@/lib/api";
import Colors from "@/constants/colors";
import { FloatingSupport } from "@/components/FloatingSupport";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: services = [], isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const { data: quotesRaw = [], refetch: refetchQuotes } = useQuery({
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchServices(), refetchQuotes(), refetchInvoices(), refetchReservations()]);
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
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.welcomeText}>Bienvenue sur MyJantes</Text>
          </View>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.headerLogo}
            contentFit="contain"
          />
        </View>

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
});
