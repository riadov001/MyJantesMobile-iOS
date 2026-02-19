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
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { servicesApi, uploadApi, Service, apiCall } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

interface UploadedPhoto {
  uri: string;
  key: string;
}

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

      for (let idx = 0; idx < result.assets.length; idx++) {
        const asset = result.assets[idx];
        const uri = asset.uri;
        const filename = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
        const type = "image/jpeg";
        try {
          const uploadResult = await uploadApi.upload(uri, filename, type);
          console.log("DEBUG: Upload result", JSON.stringify(uploadResult));
          const photoKey = uploadResult?.id || uploadResult?.objectPath || uploadResult?.key || uploadResult?.path || uploadResult?.url;
          if (photoKey) {
            newPhotos.push({ uri, key: String(photoKey) });
          } else {
            newPhotos.push({ uri, key: `upload_${Date.now()}_${idx}` });
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
        console.log("Upload result for", filename, ":", uploadResult);
        const photoKey = uploadResult?.id || uploadResult?.objectPath || uploadResult?.key || uploadResult?.path || uploadResult?.url;
        if (photoKey) {
          setPhotos((prev) => [...prev, { uri, key: String(photoKey) }]);
        } else {
          console.warn("Upload response without path:", JSON.stringify(uploadResult));
          setPhotos((prev) => [...prev, { uri, key: `upload_${Date.now()}` }]);
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

    setSubmitting(true);
    try {
      // Create items from selected services
      const items = selectedServices.map(serviceId => {
        const service = services.find((s: Service) => s.id === serviceId);
        return {
          serviceId: serviceId,
          description: service?.name || "Service",
          quantity: 1,
          unitPrice: parseFloat(service?.basePrice || "0"),
          total: parseFloat(service?.basePrice || "0")
        };
      });

      // Formater les données selon ce que le backend attend probablement
      const quoteData = {
        services: selectedServices, // Essayer "services" au lieu de "serviceIds"
        serviceIds: selectedServices,
        notes: notes.trim() || "",
        photos: photos.map((p) => p.key),
        items: items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0),
        status: "pending",
        paymentMethod: "wire_transfer",
      };

      console.log("DEBUG: Sending quote", JSON.stringify(quoteData));

      // Utiliser quotesApi.create qui est déjà défini et typé
      const result = await quotesApi.create(quoteData);
      console.log("DEBUG: Server response:", JSON.stringify(result));

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Demande envoyée !",
        "Votre demande de devis a été envoyée avec succès. Nous vous recontacterons rapidement.",
        [{ text: "OK", onPress: () => router.push("/(main)/(tabs)/quotes") }]
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

    const canSubmit = selectedServices.length > 0 && !submitting;
    
    // Safety check for services data
    const safeServices = Array.isArray(services) ? services : [];
    const safePhotos = Array.isArray(photos) ? photos : [];
    
    console.log("DEBUG: canSubmit", canSubmit, "services", safeServices.length, "photos", safePhotos.length);

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
                          {(service.name || "").trim()}
                        </Text>
                        {parseFloat(service.basePrice || "0") > 0 && (
                          <Text style={styles.serviceItemPrice}>
                            {parseFloat(service.basePrice || "0").toFixed(2)} € HT
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
            <Ionicons name="camera-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              Photos de vos jantes <Text style={styles.required}>(optionnel)</Text>
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

          <Text style={[styles.photoHint, photos.length >= 1 && styles.photoHintOk]}>
            {photos.length >= 1 ? `${photos.length} photo${photos.length > 1 ? "s" : ""} ajoutée${photos.length > 1 ? "s" : ""}` : "Ajoutez des photos pour un devis plus précis"}
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
});
