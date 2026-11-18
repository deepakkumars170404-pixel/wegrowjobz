import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { UserCheck, Check, Play, Shield } from "lucide-react-native";
import { WEGROW_STAFF_MEMBERS, StaffMember } from "../types";
import { THEME } from "../constants/theme";

interface StaffSelectModalProps {
  visible: boolean;
  currentStaff: StaffMember;
  onSelectAndPunchIn: (staff: StaffMember) => void;
  canCancel?: boolean;
  onCancel?: () => void;
}

export const StaffSelectModal: React.FC<StaffSelectModalProps> = ({
  visible,
  currentStaff,
  onSelectAndPunchIn,
  canCancel = false,
  onCancel,
}) => {
  const [selected, setSelected] = useState<StaffMember>(currentStaff || "MuthuSelvi");

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <UserCheck size={24} color="#1E40AF" strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Select Your Staff Name</Text>
            <Text style={styles.subtitle}>
              Please select your name before starting calls so all calls and attendance are tracked under your profile.
            </Text>
          </View>

          {/* Staff Members List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {WEGROW_STAFF_MEMBERS.map((staff) => {
              const isSelected = selected === staff;
              return (
                <TouchableOpacity
                  key={staff}
                  style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                  onPress={() => setSelected(staff)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                      {staff.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, isSelected && styles.staffNameSelected]}>
                      {staff}
                    </Text>
                    <Text style={styles.staffRole}>Telecalling Executive</Text>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.punchInBtn}
              onPress={() => onSelectAndPunchIn(selected)}
              activeOpacity={0.8}
            >
              <Play size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.punchInBtnText}>Punch In as {selected}</Text>
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
