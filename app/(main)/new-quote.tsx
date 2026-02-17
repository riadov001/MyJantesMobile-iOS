import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { servicesApi, quotesApi, uploadApi, ocrApi, Service } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

interface UploadedPhoto {
  uri: string;
  key: string;
}

interface VehicleInfo {
  marque: string;
  modele: string;
  immatriculation: string;
  annee: string;
  vin: string;
  typeCarburant: string;
  couleur: string;
  puissanceFiscale: string;
}

const emptyVehicle: VehicleInfo = {
  marque: "",
  modele: "",
  immatriculation: "",
  annee: "",
  vin: "",
  typeCarburant: "",
  couleur: "",
  puissanceFiscale: "",
};

export default function NewQuoteScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const { user } = useAuth();

  const [selectedServices, setSelectedServices] = useState<string[]>(
    params.serviceId ? [params.serviceId] : []
  );
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleInfo>(emptyVehicle);
  const [scanning, setScanning] = useState(false);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [ocrPreviewData, setOcrPreviewData] = useState<VehicleInfo>(emptyVehicle);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.getAll,
  });

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateVehicleField = (field: keyof VehicleInfo, value: string) => {
    setVehicle((prev) => ({ ...prev, [field]: value }));
  };

  const parseOcrResult = (ocrData: any): VehicleInfo => {
    const parsed: VehicleInfo = { ...emptyVehicle };

    if (!ocrData) return parsed;

    const data = ocrData.data || ocrData.result || ocrData;

    if (typeof data === "object" && data !== null) {
      parsed.marque = data.marque || data.brand || data.make || data.D1 || "";
      parsed.modele = data.modele || data.model || data.D2 || data.D3 || "";
      parsed.immatriculation = data.immatriculation || data.registration || data.plateNumber || data.A || "";
      parsed.annee = data.annee || data.year || data.B || data.firstRegistrationDate || "";
      parsed.vin = data.vin || data.VIN || data.E || data.chassisNumber || "";
      parsed.typeCarburant = data.typeCarburant || data.fuel || data.fuelType || data.P3 || "";
      parsed.couleur = data.couleur || data.color || data.colour || "";
      parsed.puissanceFiscale = data.puissanceFiscale || data.fiscalPower || data.P6 || data.taxHorsepower || "";

      if (data.fields && Array.isArray(data.fields)) {
        for (const field of data.fields) {
          const key = (field.key || field.label || "").toUpperCase();
          const val = field.value || "";
          if (key === "A" || key.includes("IMMATRICULATION")) parsed.immatriculation = parsed.immatriculation || val;
          if (key === "B" || key.includes("DATE")) parsed.annee = parsed.annee || val;
          if (key === "D.1" || key.includes("MARQUE")) parsed.marque = parsed.marque || val;
          if (key === "D.2" || key.includes("TYPE") || key.includes("MODELE")) parsed.modele = parsed.modele || val;
          if (key === "E" || key.includes("VIN")) parsed.vin = parsed.vin || val;
          if (key === "P.3" || key.includes("CARBURANT")) parsed.typeCarburant = parsed.typeCarburant || val;
          if (key === "P.6" || key.includes("PUISSANCE")) parsed.puissanceFiscale = parsed.puissanceFiscale || val;
        }
      }

      if (data.text && typeof data.text === "string") {
        const text = data.text;
        const immatMatch = text.match(/[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}/);
        if (immatMatch && !parsed.immatriculation) parsed.immatriculation = immatMatch[0];
        const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (vinMatch && !parsed.vin) parsed.vin = vinMatch[0];
      }
    }

    return parsed;
  };

  const scanCarteGrise = async (source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission requise", "Veuillez autoriser l'accès à la caméra.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission requise", "Veuillez autoriser l'accès à la galerie.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (result.canceled || result.assets.length === 0) return;

      setScanning(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split("/").pop() || `scan_${Date.now()}.jpg`;

      setScannedImageUri(uri);

      const ocrResult = await ocrApi.scan(uri, filename, "image/jpeg");
      console.log("OCR Result:", ocrResult);
      const parsed = parseOcrResult(ocrResult);

      const hasData = Object.values(parsed).some((v) => v && v.toString().trim() !== "");

      if (hasData) {
        setOcrPreviewData(parsed);
        setShowOcrPreview(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert(
          "Scan incomplet",
          "Aucune information n'a pu être extraite de l'image. Veuillez réessayer avec une photo plus nette de votre carte grise, ou remplir les champs manuellement."
        );
      }
    } catch (err: any) {
      Alert.alert("Erreur de scan", err.message || "Impossible de scanner le document.");
    } finally {
      setScanning(false);
    }
  };

  const applyOcrData = () => {
    setVehicle((prev) => {
      const merged = { ...prev };
      for (const key of Object.keys(ocrPreviewData) as (keyof VehicleInfo)[]) {
        if (ocrPreviewData[key].trim()) {
          merged[key] = ocrPreviewData[key];
        }
      }
      return merged;
    });
    setShowOcrPreview(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Veuillez autoriser l'accès à votre galerie.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      const newPhotos: UploadedPhoto[] = [];

      for (const asset of result.assets) {
        const uri = asset.uri;
        const filename = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
        const type = "image/jpeg";
        try {
          const uploadResult = await uploadApi.upload(uri, filename, type);
          if (uploadResult && uploadResult.objectPath) {
            newPhotos.push({ uri, key: uploadResult.objectPath });
          }
        } catch (err: any) {
          console.error("Upload error details:", err);
          Alert.alert("Erreur d'upload", `Impossible d'uploader une image: ${err.message}`);
        }
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Veuillez autoriser l'accès à la caméra.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
      const type = "image/jpeg";
      try {
        const uploadResult = await uploadApi.upload(uri, filename, type);
        if (uploadResult && uploadResult.objectPath) {
          setPhotos((prev) => [...prev, { uri, key: uploadResult.objectPath }]);
        }
      } catch (err: any) {
        console.error("Upload error details:", err);
        Alert.alert("Erreur d'upload", `Impossible d'uploader la photo: ${err.message}`);
      }
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      Alert.alert("Erreur", "Veuillez sélectionner au moins un service.");
      return;
    }
    if (photos.length < 3) {
      Alert.alert("Erreur", "Veuillez ajouter au moins 3 photos de vos jantes.");
      return;
    }

    setSubmitting(true);
    try {
      const vehicleData: Record<string, string> = {};
      for (const [key, val] of Object.entries(vehicle)) {
        if (val.trim()) vehicleData[key] = val.trim();
      }

      const quoteData = {
        services: selectedServices,
        notes: notes.trim() || undefined,
        photos: photos.map((p) => ({
          key: p.key,
          type: "image/jpeg",
          name: p.key.split("/").pop() || "photo.jpg",
        })),
        vehicleInfo: Object.keys(vehicleData).length > 0 ? vehicleData : undefined,
        paymentMethod: "wire_transfer",
      };

      await quotesApi.create(quoteData);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Demande envoyée !",
        "Votre demande de devis a été envoyée avec succès. Nous vous recontacterons rapidement.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedServices.length > 0 && photos.length >= 3 && !submitting;

  const vehicleFieldsConfig: { key: keyof VehicleInfo; label: string; icon: string; placeholder: string }[] = [
    { key: "immatriculation", label: "Immatriculation", icon: "card-outline", placeholder: "Ex: AB-123-CD" },
    { key: "marque", label: "Marque", icon: "car-outline", placeholder: "Ex: Audi, BMW, Mercedes..." },
    { key: "modele", label: "Modèle", icon: "car-sport-outline", placeholder: "Ex: A4, Série 3, Classe C..." },
    { key: "annee", label: "Année / 1ère mise en circulation", icon: "calendar-outline", placeholder: "Ex: 2021" },
    { key: "vin", label: "N° VIN (châssis)", icon: "barcode-outline", placeholder: "17 caractères" },
    { key: "typeCarburant", label: "Type carburant / énergie", icon: "flash-outline", placeholder: "Ex: Diesel, Essence, Électrique..." },
    { key: "couleur", label: "Couleur", icon: "color-palette-outline", placeholder: "Ex: Noir, Blanc, Gris..." },
    { key: "puissanceFiscale", label: "Puissance fiscale (CV)", icon: "speedometer-outline", placeholder: "Ex: 7 CV" },
  ];

  const filledFieldsCount = Object.values(vehicle).filter((v) => v && v.toString().trim() !== "").length;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Nouveau devis</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 120 : insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Choisir un ou plusieurs services</Text>
          </View>

          {loadingServices ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.servicesContainer}>
              {services
                .filter((s: Service) => s.isActive)
                .map((service: Service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <Pressable
                      key={service.id}
                      style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                      onPress={() => toggleService(service.id)}
                    >
                      <View style={styles.serviceCheck}>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                        ) : (
                          <Ionicons name="ellipse-outline" size={22} color={Colors.textTertiary} />
                        )}
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceItemName, isSelected && styles.serviceItemNameSelected]}>
                          {service.name.trim()}
                        </Text>
                        {parseFloat(service.basePrice) > 0 && (
                          <Text style={styles.serviceItemPrice}>
                            {parseFloat(service.basePrice).toFixed(2)} € HT
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="car-info" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Informations véhicule</Text>
          </View>

          <View style={styles.ocrBanner}>
            <View style={styles.ocrBannerContent}>
              <MaterialCommunityIcons name="credit-card-scan-outline" size={28} color={Colors.primary} />
              <View style={styles.ocrBannerTextContainer}>
                <Text style={styles.ocrBannerTitle}>Scanner votre carte grise</Text>
                <Text style={styles.ocrBannerSubtitle}>
                  Remplissage automatique des informations
                </Text>
              </View>
            </View>
            <View style={styles.ocrActions}>
              {Platform.OS !== "web" && (
                <Pressable
                  style={({ pressed }) => [styles.ocrBtn, pressed && styles.ocrBtnPressed]}
                  onPress={() => scanCarteGrise("camera")}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={16} color="#fff" />
                      <Text style={styles.ocrBtnText}>Scanner</Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.ocrBtnSecondary, pressed && styles.ocrBtnSecondaryPressed]}
                onPress={() => scanCarteGrise("gallery")}
                disabled={scanning}
              >
                {scanning && Platform.OS === "web" ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="images" size={16} color={Colors.primary} />
                    <Text style={styles.ocrBtnSecondaryText}>Galerie</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {filledFieldsCount > 0 && (
            <View style={styles.filledBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.accepted} />
              <Text style={styles.filledBadgeText}>
                {filledFieldsCount}/{vehicleFieldsConfig.length} champs renseignés
              </Text>
            </View>
          )}

          <View style={styles.vehicleFields}>
            {vehicleFieldsConfig.map((field) => (
              <View key={field.key} style={styles.vehicleFieldContainer}>
                <View style={styles.vehicleFieldLabel}>
                  <Ionicons name={field.icon as any} size={14} color={Colors.textSecondary} />
                  <Text style={styles.vehicleFieldLabelText}>{field.label}</Text>
                </View>
                <TextInput
                  style={[
                    styles.vehicleFieldInput,
                    vehicle[field.key].trim() !== "" && styles.vehicleFieldInputFilled,
                  ]}
                  value={vehicle[field.key]}
                  onChangeText={(val) => updateVehicleField(field.key, val)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize={field.key === "immatriculation" || field.key === "vin" ? "characters" : "words"}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              Photos de vos jantes <Text style={styles.required}>(min. 3)</Text>
            </Text>
          </View>

          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <Pressable style={styles.photoRemoveBtn} onPress={() => removePhoto(index)}>
                  <Ionicons name="close-circle" size={22} color={Colors.primary} />
                </Pressable>
              </View>
            ))}

            {uploading && (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.addPhotoBtnPressed]}
              onPress={pickImages}
            >
              <Ionicons name="images-outline" size={24} color={Colors.primary} />
              <Text style={styles.addPhotoText}>Galerie</Text>
            </Pressable>

            {Platform.OS !== "web" && (
              <Pressable
                style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.addPhotoBtnPressed]}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                <Text style={styles.addPhotoText}>Photo</Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.photoHint, photos.length >= 3 && styles.photoHintOk]}>
            {photos.length >= 3 ? `${photos.length} photos ajoutées` : `${photos.length}/3 photos minimum`}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Notes complémentaires</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Décrivez votre besoin, l'état de vos jantes, etc."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Vos informations</Text>
          </View>
          <View style={styles.userInfoCard}>
            <View style={styles.userInfoRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.userInfoText}>{user?.email}</Text>
            </View>
            {user?.firstName && (
              <View style={styles.userInfoRow}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.userInfoText}>
                  {user.firstName} {user.lastName}
                </Text>
              </View>
            )}
            {user?.phone && (
              <View style={styles.userInfoRow}>
                <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.userInfoText}>{user.phone}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 10 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && canSubmit && styles.submitBtnPressed,
            !canSubmit && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Envoyer la demande</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showOcrPreview}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOcrPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="card-search-outline" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Résultat du scan</Text>
              <Pressable onPress={() => setShowOcrPreview(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Vérifiez les informations détectées avant de les appliquer
            </Text>

            {scannedImageUri && (
              <View style={styles.scannedImageContainer}>
                <Image source={{ uri: scannedImageUri }} style={styles.scannedImage} contentFit="contain" />
              </View>
            )}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {vehicleFieldsConfig.map((field) => {
                const val = ocrPreviewData[field.key];
                if (!val.trim()) return null;
                return (
                  <View key={field.key} style={styles.ocrResultRow}>
                    <View style={styles.ocrResultLabel}>
                      <Ionicons name={field.icon as any} size={14} color={Colors.textSecondary} />
                      <Text style={styles.ocrResultLabelText}>{field.label}</Text>
                    </View>
                    <TextInput
                      style={styles.ocrResultValue}
                      value={val}
                      onChangeText={(text) =>
                        setOcrPreviewData((prev) => ({ ...prev, [field.key]: text }))
                      }
                    />
                  </View>
                );
              })}

              {Object.values(ocrPreviewData).every((v) => !v.trim()) && (
                <View style={styles.noResultContainer}>
                  <Ionicons name="alert-circle-outline" size={32} color={Colors.textTertiary} />
                  <Text style={styles.noResultText}>
                    Aucune information détectée
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setShowOcrPreview(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalApplyBtn, pressed && { opacity: 0.85 }]}
                onPress={applyOcrData}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.modalApplyText}>Appliquer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
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
  required: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
  },
  servicesContainer: {
    gap: 6,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  serviceCheck: {
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  serviceItemNameSelected: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  serviceItemPrice: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ocrBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  ocrBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  ocrBannerTextContainer: {
    flex: 1,
  },
  ocrBannerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  ocrBannerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ocrActions: {
    flexDirection: "row",
    gap: 10,
  },
  ocrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    justifyContent: "center",
  },
  ocrBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  ocrBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  ocrBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    flex: 1,
    justifyContent: "center",
  },
  ocrBtnSecondaryPressed: {
    backgroundColor: `${Colors.primary}15`,
  },
  ocrBtnSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  filledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.acceptedBg,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  filledBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accepted,
  },
  vehicleFields: {
    gap: 10,
  },
  vehicleFieldContainer: {
    gap: 4,
  },
  vehicleFieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vehicleFieldLabelText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  vehicleFieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  vehicleFieldInputFilled: {
    borderColor: `${Colors.primary}50`,
    backgroundColor: `${Colors.primary}08`,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: Colors.background,
    borderRadius: 11,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed" as any,
    gap: 4,
  },
  addPhotoBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  addPhotoText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  photoHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  photoHintOk: {
    color: Colors.accepted,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 100,
  },
  userInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userInfoText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  scannedImageContainer: {
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scannedImage: {
    width: "100%",
    height: "100%",
  },
  modalScroll: {
    maxHeight: 300,
  },
  ocrResultRow: {
    marginBottom: 12,
    gap: 4,
  },
  ocrResultLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ocrResultLabelText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  ocrResultValue: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  noResultContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  noResultText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
  },
  modalApplyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
