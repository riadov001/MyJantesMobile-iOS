import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { reservationsApi, Reservation } from "@/lib/api";
import Colors from "@/constants/colors";
import { FloatingSupport } from "@/components/FloatingSupport";

function getReservationStatusInfo(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "confirmed" || s === "confirmée" || s === "confirmé")
    return { label: "Confirmée", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-circle-outline" as const };
  if (s === "pending" || s === "en_attente")
    return { label: "En attente", color: Colors.pending, bg: Colors.pendingBg, icon: "time-outline" as const };
  if (s === "cancelled" || s === "annulée")
    return { label: "Annulée", color: Colors.rejected, bg: Colors.rejectedBg, icon: "close-circle-outline" as const };
  if (s === "completed" || s === "terminée" || s === "terminé")
    return { label: "Terminée", color: Colors.accepted, bg: Colors.acceptedBg, icon: "checkmark-done-outline" as const };
  if (s === "in_progress" || s === "en_cours")
    return { label: "En cours", color: "#3B82F6", bg: "#0F1D3D", icon: "hourglass-outline" as const };
  return { label: status || "Inconnu", color: Colors.textSecondary, bg: Colors.surfaceSecondary, icon: "help-outline" as const };
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const statusInfo = getReservationStatusInfo(reservation.status);
  const dateStr = reservation.date || reservation.createdAt;
  let formattedDate = "Date inconnue";
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {}

  let vehicleInfo = reservation.vehicleInfo;
  if (typeof vehicleInfo === "string") {
    try { vehicleInfo = JSON.parse(vehicleInfo); } catch {}
  }

  return (
    <Pressable style={styles.card} onPress={() => router.push({ pathname: "/(main)/reservation-detail", params: { id: reservation.id } })}>
      <View style={styles.cardHeader}>
        <View style={styles.idRow}>
          <Ionicons name="calendar" size={18} color={Colors.primary} />
          <Text style={styles.cardDate}>{formattedDate}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {reservation.timeSlot && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.detailText}>Créneau : {reservation.timeSlot}</Text>
          </View>
        )}
        {vehicleInfo && (typeof vehicleInfo === "object") && (vehicleInfo.marque || vehicleInfo.brand || vehicleInfo.make) && (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {vehicleInfo.marque || vehicleInfo.brand || vehicleInfo.make}{" "}
              {vehicleInfo.modele || vehicleInfo.model || ""}
            </Text>
          </View>
        )}
        {vehicleInfo && (typeof vehicleInfo === "object") && (vehicleInfo.immatriculation || vehicleInfo.plate || vehicleInfo.registration) && (
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{vehicleInfo.immatriculation || vehicleInfo.plate || vehicleInfo.registration}</Text>
          </View>
        )}
        {reservation.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={2}>{reservation.notes}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }} />
        <View style={styles.viewDetailRow}>
          <Text style={styles.viewDetailText}>Voir détails</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: reservationsRaw = [], isLoading, refetch } = useQuery({
    queryKey: ["reservations"],
    queryFn: reservationsApi.getAll,
    retry: 1,
  });

  const reservations = Array.isArray(reservationsRaw) ? reservationsRaw : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Text style={styles.headerTitle}>Mes Réservations</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={[...reservations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReservationCard reservation={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 100 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptyText}>
                Vos réservations apparaîtront ici une fois programmées par notre équipe.
              </Text>
            </View>
          }
        />
      )}
      <FloatingSupport />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cardDate: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textTransform: "capitalize" as const,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  cardBody: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  viewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
