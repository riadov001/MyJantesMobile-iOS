import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useCustomAlert } from "@/components/CustomAlert";
import { apiCall } from "@/lib/api";

const DOCUMENT_TYPES = [
  { value: "carte_grise", label: "Carte grise" },
  { value: "facture", label: "Facture" },
  { value: "devis", label: "Devis" },
  { value: "releve_bancaire", label: "Relev\u00e9 bancaire" },
  { value: "avoir", label: "Avoir" },
  { value: "note_frais", label: "Note de frais" },
  { value: "autres", label: "Autres" },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export default function OCRScannerScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [selectedType, setSelectedType] = useState<DocumentType>("carte_grise");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showAlert({
            type: "warning",
            title: "Permission requise",
            message: "Veuillez autoriser l'acc\u00e8s \u00e0 la cam\u00e9ra pour scanner un document.",
            buttons: [{ text: "OK", style: "primary" }],
          });
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showAlert({
            type: "warning",
            title: "Permission requise",
            message: "Veuillez autoriser l'acc\u00e8s \u00e0 la galerie pour s\u00e9lectionner un document.",
            buttons: [{ text: "OK", style: "primary" }],
          });
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsEditing: false,
          });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setOcrResult(null);
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Erreur",
        message: "Impossible de s\u00e9lectionner l'image.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    }
  };

  const scanDocument = async () => {
    if (!imageUri) return;
    setScanning(true);
    try {
      const filename = `scan_${Date.now()}.jpg`;
      const formData = new FormData();

      if (Platform.OS === "web") {
        try {
          const response = await globalThis.fetch(imageUri);
          const blob = await response.blob();
          formData.append("media", blob, filename);
        } catch {
          formData.append("media", new File([new Blob()], filename, { type: "image/jpeg" }));
        }
      } else {
        formData.append("media", {
          uri: imageUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      }
      formData.append("documentType", selectedType);

      const result = await apiCall("/api/ocr/scan", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      setOcrResult(result);
    } catch (error: any) {
      showAlert({
        type: "error",
        title: "Erreur de scan",
        message: error?.message || "Impossible d'analyser le document. Veuillez r\u00e9essayer.",
        buttons: [{ text: "OK", style: "primary" }],
      });
    } finally {
      setScanning(false);
    }
  };

  const useResults = () => {
    if (ocrResult) {
      router.back();
    }
  };

  const resetScan = () => {
    setImageUri(null);
    setOcrResult(null);
  };

  const renderOcrData = (data: any, prefix = ""): React.ReactNode[] => {
    if (!data || typeof data !== "object") return [];
    const items: React.ReactNode[] = [];
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      const displayKey = key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/^\w/, (c) => c.toUpperCase());
      if (value && typeof value === "object" && !Array.isArray(value)) {
        items.push(
          <Text key={`${prefix}${key}-header`} style={styles.resultSectionHeader}>
            {displayKey}
          </Text>
        );
        items.push(...renderOcrData(value, `${prefix}${key}-`));
      } else if (Array.isArray(value)) {
        items.push(
          <Text key={`${prefix}${key}-header`} style={styles.resultSectionHeader}>
            {displayKey}
          </Text>
        );
        value.forEach((item, i) => {
          if (typeof item === "object") {
            items.push(
              <Text key={`${prefix}${key}-${i}-sub`} style={styles.resultSubHeader}>
                #{i + 1}
              </Text>
            );
            items.push(...renderOcrData(item, `${prefix}${key}-${i}-`));
          } else {
            items.push(
              <View key={`${prefix}${key}-${i}`} style={styles.resultRow}>
                <Text style={styles.resultValue}>{String(item)}</Text>
              </View>
            );
          }
        });
      } else if (value !== null && value !== undefined && String(value).trim() !== "") {
        items.push(
          <View key={`${prefix}${key}`} style={styles.resultRow}>
            <Text style={styles.resultLabel}>{displayKey}</Text>
            <Text style={styles.resultValue}>{String(value)}</Text>
          </View>
        );
      }
    }
    return items;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scanner OCR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Type de document</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeSelector}
        >
          {DOCUMENT_TYPES.map((type) => (
            <Pressable
              key={type.value}
              style={[
                styles.typeChip,
                selectedType === type.value && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType(type.value)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === type.value && styles.typeChipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!imageUri ? (
          <View style={styles.captureSection}>
            <View style={styles.placeholderBox}>
              <Ionicons name="document-text-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.placeholderText}>
                Prenez une photo ou s\u00e9lectionnez une image
              </Text>
            </View>
            <View style={styles.captureButtons}>
              <Pressable
                style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.7 }]}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.captureBtnText}>Cam\u00e9ra</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.captureBtn,
                  styles.captureBtnSecondary,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={24} color={Colors.primary} />
                <Text style={[styles.captureBtnText, { color: Colors.primary }]}>Galerie</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.previewSection}>
            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                contentFit="contain"
              />
              <Pressable style={styles.removeImageBtn} onPress={resetScan}>
                <Ionicons name="close-circle" size={28} color={Colors.primary} />
              </Pressable>
            </View>

            {!ocrResult && (
              <Pressable
                style={({ pressed }) => [
                  styles.scanBtn,
                  scanning && styles.scanBtnDisabled,
                  pressed && !scanning && { opacity: 0.7 },
                ]}
                onPress={scanDocument}
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="scan" size={20} color="#fff" />
                )}
                <Text style={styles.scanBtnText}>
                  {scanning ? "Analyse en cours..." : "Analyser le document"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {ocrResult && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsTitleRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.resultsTitle}>R\u00e9sultats de l'analyse</Text>
            </View>

            <View style={styles.resultsCard}>
              {ocrResult.data
                ? renderOcrData(ocrResult.data)
                : ocrResult.extractedText
                ? [
                    <View key="text" style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Texte extrait</Text>
                      <Text style={styles.resultValue}>{ocrResult.extractedText}</Text>
                    </View>,
                  ]
                : renderOcrData(ocrResult)}
            </View>

            <View style={styles.resultActions}>
              <Pressable
                style={({ pressed }) => [styles.useBtn, pressed && { opacity: 0.7 }]}
                onPress={useResults}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.useBtnText}>Utiliser ces donn\u00e9es</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
                onPress={resetScan}
              >
                <Ionicons name="refresh" size={20} color={Colors.text} />
                <Text style={styles.retryBtnText}>Nouveau scan</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  captureSection: {
    gap: 20,
  },
  placeholderBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  captureButtons: {
    flexDirection: "row",
    gap: 12,
  },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  captureBtnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  captureBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  previewSection: {
    gap: 16,
  },
  previewImageContainer: {
    position: "relative",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: {
    width: "100%",
    height: 300,
  },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  scanBtnDisabled: {
    opacity: 0.6,
  },
  scanBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  resultsSection: {
    marginTop: 20,
    gap: 16,
  },
  resultsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  resultsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 2,
  },
  resultSectionHeader: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  resultSubHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    marginTop: 8,
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  resultValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
    textAlign: "right" as const,
  },
  resultActions: {
    gap: 10,
  },
  useBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
  },
  useBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
