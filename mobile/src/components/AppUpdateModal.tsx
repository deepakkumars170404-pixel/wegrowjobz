import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { DownloadCloud, Sparkles, CheckCircle2, Globe, X } from "lucide-react-native";
import { TelephonyService } from "../services/telephony";

interface AppUpdateModalProps {
  visible: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string[];
  apkUrl: string;
  forceUpdate?: boolean;
  onDismiss: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  latestVersion,
  currentVersion,
  releaseNotes,
  apkUrl,
  forceUpdate = false,
  onDismiss,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleUpdatePress = async () => {
    try {
      setDownloading(true);
      setStatusText("Starting download... Check notification bar");
      
      const started = await TelephonyService.downloadAndInstallApk(apkUrl);
      if (started) {
        setStatusText("Downloading in background... Click notification or wait for installer");
        setTimeout(() => {
          setDownloading(false);
          if (!forceUpdate) onDismiss();
        }, 3000);
      } else {
        setStatusText("Opening download link in browser...");
        Linking.openURL(apkUrl).catch(() => {});
        setDownloading(false);
      }
    } catch (err: any) {
      setStatusText("Fallback: Opening in browser...");
      Linking.openURL(apkUrl).catch(() => {});
      setDownloading(false);
    }
  };

  const handleBrowserFallback = () => {
    Linking.openURL(apkUrl).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !forceUpdate && onDismiss()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <DownloadCloud size={28} color="#FFFFFF" strokeWidth={2.3} />
            </View>
            <Text style={styles.title}>New Update Available! 🚀</Text>
            <Text style={styles.subtitle}>
              WeGrow Telecaller & Jobz CRM
            </Text>
            <View style={styles.versionBadgeRow}>
              <View style={styles.versionChip}>
                <Text style={styles.versionLabel}>Current: {currentVersion}</Text>
              </View>
              <Text style={styles.arrowText}>➔</Text>
              <View style={[styles.versionChip, styles.newVersionChip]}>
                <Sparkles size={12} color="#15803D" />
                <Text style={styles.newVersionText}>New: {latestVersion}</Text>
              </View>
            </View>

            {!forceUpdate && !downloading && (
              <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Release Notes */}
          <View style={styles.content}>
            <Text style={styles.notesTitle}>What's New in this Version:</Text>
            <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
              {releaseNotes && releaseNotes.length > 0 ? (
                releaseNotes.map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <CheckCircle2 size={16} color="#2563EB" style={{ marginTop: 2 }} />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noteItem}>
                  <CheckCircle2 size={16} color="#2563EB" />
                  <Text style={styles.noteText}>Performance optimizations and bug fixes.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>
                💡 <Text style={{ fontWeight: "700" }}>Uninstall பண்ண தேவையில்லை!</Text> Update கொடுத்தால் பழைய ஆப் மேலேயே புது வெர்ஷன் இன்ஸ்டால் ஆகிவிடும்.
              </Text>
            </View>

            {statusText ? (
              <View style={styles.statusBox}>
                {downloading && <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />}
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.primaryBtn, downloading && styles.btnDisabled]}
              onPress={handleUpdatePress}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <DownloadCloud size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.primaryBtnText}>Update Now (ஒரே கிளிக்கில்)</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.browserBtn}
                onPress={handleBrowserFallback}
                activeOpacity={0.7}
              >
                <Globe size={14} color="#64748B" />
                <Text style={styles.browserBtnText}>Open Download Link</Text>
              </TouchableOpacity>

              {!forceUpdate && !downloading && (
                <TouchableOpacity
                  style={styles.laterBtn}
                  onPress={onDismiss}
                  activeOpacity={0.7}
                >
                  <Text style={styles.laterBtnText}>Later</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  header: {
    backgroundColor: "#0F172A",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  versionBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  versionChip: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionLabel: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  arrowText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  newVersionChip: {
    backgroundColor: "#DCFCE7",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  newVersionText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesScroll: {
    maxHeight: 140,
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: "#1E293B",
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  infoBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 11.5,
    color: "#1E40AF",
    lineHeight: 16,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  browserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  browserBtnText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  laterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  laterBtnText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
