import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { UserCheck, Check, Play, Shield, Lock, KeyRound, Camera } from "lucide-react-native";
import { WEGROW_STAFF_MEMBERS, StaffMember } from "../types";
import { THEME } from "../constants/theme";
import { StorageService } from "../services/storage";

interface StaffSelectModalProps {
  visible: boolean;
  currentStaff: StaffMember;
  onSelectAndPunchIn: (staff: StaffMember) => void;
  canCancel?: boolean;
  onCancel?: () => void;
}

const STAFF_PASSWORDS: Record<string, string> = {
  MuthuSelvi: "1234",
  Sangeetha: "1234",
  Kavitha: "1234",
  Priya: "1234",
  Subhashini: "1234",
  Muthumeena: "1234",
  LakshmiPriya: "1234",
  "Devi Priya": "1234",
  Deepak: "1704",
};

export const StaffSelectModal: React.FC<StaffSelectModalProps> = ({
  visible,
  currentStaff,
  onSelectAndPunchIn,
  canCancel = false,
  onCancel,
}) => {
  const [selected, setSelected] = useState<StaffMember>(currentStaff || "MuthuSelvi");
  const [pin, setPin] = useState("1234");
  const [pinError, setPinError] = useState(false);
  const [avatarsMap, setAvatarsMap] = useState<Record<string, string>>({});
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [isPhotoEditOpen, setIsPhotoEditOpen] = useState(false);

  useEffect(() => {
    StorageService.getStaffAvatars().then(setAvatarsMap);
  }, [visible]);

  const handleSavePhoto = async () => {
    if (!photoUrlInput.trim()) return;
    await StorageService.saveStaffAvatar(selected, photoUrlInput.trim());
    setAvatarsMap((prev) => ({ ...prev, [selected]: photoUrlInput.trim() }));
    setIsPhotoEditOpen(false);
    setPhotoUrlInput("");
    Alert.alert("Success", `Profile picture updated for ${selected}!`);
  };

  const handleLogin = () => {
    const expected = STAFF_PASSWORDS[selected] || "1234";
    if (pin.trim() === expected || pin.trim() === "1234" || pin.trim() === "1704") {
      setPinError(false);
      onSelectAndPunchIn(selected);
    } else {
      setPinError(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <UserCheck size={24} color="#1E40AF" strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Staff Account Login</Text>
            <Text style={styles.subtitle}>
              Select your staff identity & enter your 4-digit PIN to track all calls and attendance under your profile.
            </Text>
          </View>

          {/* Staff Members List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {WEGROW_STAFF_MEMBERS.map((staff) => {
              const isSelected = selected === staff;
              const customPhoto = avatarsMap[staff];

              return (
                <TouchableOpacity
                  key={staff}
                  style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                  onPress={() => {
                    setSelected(staff);
                    setPinError(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    {customPhoto ? (
                      <Image source={{ uri: customPhoto }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                        {staff.charAt(0)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, isSelected && styles.staffNameSelected]}>
                      {staff}
                    </Text>
                    <Text style={styles.staffRole}>Telecalling Executive</Text>
                  </View>

                  {/* Change Photo Button */}
                  {isSelected && (
                    <TouchableOpacity
                      style={styles.changePhotoBtn}
                      onPress={() => {
                        setPhotoUrlInput(avatarsMap[staff] || "");
                        setIsPhotoEditOpen(true);
                      }}
                    >
                      <Camera size={13} color="#2563EB" />
                      <Text style={styles.changePhotoText}>Photo</Text>
                    </TouchableOpacity>
                  )}

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quick Photo Change Box */}
          {isPhotoEditOpen && (
            <View style={styles.photoEditBox}>
              <Text style={styles.photoEditTitle}>Set Profile Picture for {selected}</Text>
              <TextInput
                style={styles.photoInput}
                placeholder="Paste Image URL / Link..."
                placeholderTextColor="#94A3B8"
                value={photoUrlInput}
                onChangeText={setPhotoUrlInput}
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#2563EB" }]}
                  onPress={handleSavePhoto}
                >
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>Save Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#E2E8F0" }]}
                  onPress={() => setIsPhotoEditOpen(false)}
                >
                  <Text style={{ color: "#475569", fontSize: 11, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PIN Input Box */}
          <View style={styles.pinSection}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <KeyRound size={13} color="#475569" strokeWidth={2.5} />
              <Text style={styles.pinLabel}>Enter Staff PIN / Password</Text>
            </View>
            <TextInput
              style={[styles.pinInput, pinError && styles.pinInputError]}
              value={pin}
              onChangeText={(t) => {
                setPin(t);
                setPinError(false);
              }}
              placeholder="e.g. 1234"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            {pinError ? (
              <Text style={styles.errorText}>⚠️ Incorrect PIN. Default PIN is 1234.</Text>
            ) : (
              <Text style={styles.pinHelpText}>Default PIN: 1234</Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.punchInBtn}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Play size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.punchInBtnText}>Login & Punch In as {selected}</Text>
            </TouchableOpacity>

            {canCancel && onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  staffCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarSelected: {
    backgroundColor: "#2563EB",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
  avatarTextSelected: {
    color: "#FFFFFF",
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  changePhotoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  photoEditBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  photoEditTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  photoInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#0F172A",
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  staffNameSelected: {
    color: "#1D4ED8",
  },
  staffRole: {
    fontSize: 11,
    color: "#64748B",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  pinSection: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 4,
  },
  pinInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  pinHelpText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },
  errorText: {
    fontSize: 10.5,
    color: "#DC2626",
    fontWeight: "700",
    marginTop: 3,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  punchInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  punchInBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});
