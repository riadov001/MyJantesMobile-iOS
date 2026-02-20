import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import Colors from "@/constants/colors";
import { FloatingSupport } from "@/components/FloatingSupport";
import { useCustomAlert } from "@/components/CustomAlert";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logout } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [postalCode, setPostalCode] = useState(user?.postalCode || "");
  const [city, setCity] = useState(user?.city || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [siret, setSiret] = useState(user?.siret || "");
  const [tvaNumber, setTvaNumber] = useState(user?.tvaNumber || "");
  const [companyAddress, setCompanyAddress] = useState(user?.companyAddress || "");
  const [companyPostalCode, setCompanyPostalCode] = useState(user?.companyPostalCode || "");
  const [companyCity, setCompanyCity] = useState(user?.companyCity || "");
  const [companyCountry, setCompanyCountry] = useState(user?.companyCountry || "France");

  const isPro = user?.role === "client_professionnel";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "superadmin";
  const roleName = isAdmin ? "Administrateur" : isPro ? "Professionnel" : "Particulier";

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateUser({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        postalCode: postalCode.trim() || null,
        city: city.trim() || null,
        companyName: companyName.trim() || null,
        siret: siret.trim() || null,
        tvaNumber: tvaNumber.trim() || null,
        companyAddress: companyAddress.trim() || null,
        companyPostalCode: companyPostalCode.trim() || null,
        companyCity: companyCity.trim() || null,
        companyCountry: companyCountry.trim() || null,
      });
      await refreshUser();
      setEditing(false);
      showAlert({ type: 'success', title: 'Succès', message: 'Profil mis à jour avec succès.', buttons: [{ text: 'OK', style: 'primary' }] });
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erreur', message: err.message || 'Impossible de mettre à jour le profil.', buttons: [{ text: 'OK', style: 'primary' }] });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert({
      type: 'warning',
      title: 'Déconnexion',
      message: 'Voulez-vous vous déconnecter ?',
      buttons: [
        { text: 'Annuler' },
        { text: 'Déconnexion', style: 'primary', onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
      ],
    });
  };

  const renderField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    opts: { keyboardType?: any; maxLength?: number; editable?: boolean } = {}
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && opts.editable !== false ? (
        <View style={styles.fieldInputContainer}>
          <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.fieldIcon} />
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={setValue}
            placeholder={label}
            placeholderTextColor={Colors.textTertiary}
            keyboardType={opts.keyboardType}
            maxLength={opts.maxLength}
          />
        </View>
      ) : (
        <View style={styles.fieldValueRow}>
          <Ionicons name={icon} size={18} color={Colors.textSecondary} />
          <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]}>
            {value || "Non renseigné"}
          </Text>
        </View>
      )}
    </View>
  );

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

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
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Pressable onPress={() => (editing ? handleSave() : setEditing(true))}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={editing ? "checkmark" : "create-outline"}
                size={24}
                color={Colors.primary}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.email}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          {renderField("Email", user?.email || "", () => {}, "mail-outline", { editable: false })}
          {renderField("Prénom", firstName, setFirstName, "person-outline")}
          {renderField("Nom", lastName, setLastName, "person-outline")}
          {renderField("Téléphone", phone, setPhone, "call-outline", { keyboardType: "phone-pad" })}
          {renderField("Adresse", address, setAddress, "location-outline")}
          {renderField("Code postal", postalCode, setPostalCode, "navigate-outline", { keyboardType: "numeric", maxLength: 5 })}
          {renderField("Ville", city, setCity, "business-outline")}
        </View>

        {isPro && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations société</Text>
            {renderField("Nom entreprise", companyName, setCompanyName, "business-outline")}
            {renderField("SIRET", siret, setSiret, "document-text-outline", { maxLength: 14 })}
            {renderField("N° TVA", tvaNumber, setTvaNumber, "receipt-outline")}
            {renderField("Adresse société", companyAddress, setCompanyAddress, "location-outline")}
            {renderField("CP société", companyPostalCode, setCompanyPostalCode, "navigate-outline", { keyboardType: "numeric", maxLength: 5 })}
            {renderField("Ville société", companyCity, setCompanyCity, "business-outline")}
            {renderField("Pays société", companyCountry, setCompanyCountry, "globe-outline")}
          </View>
        )}

        {editing && (
          <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelBtnText}>Annuler les modifications</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
      {AlertComponent}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  avatarName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  fieldContainer: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  fieldInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  fieldValueEmpty: {
    color: Colors.textTertiary,
  },
  cancelBtn: {
    alignItems: "center",
    marginBottom: 16,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 8,
  },
  logoutBtnPressed: {
    backgroundColor: Colors.errorLight,
  },
  logoutBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
