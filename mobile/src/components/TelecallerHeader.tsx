import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PhoneCall, UserCheck, LogOut, Play, User } from "lucide-react-native";
import { THEME } from "../constants/theme";

interface TelecallerHeaderProps {
  completedCalls: number;
  spokenSeconds: number;
  staffName: string;
  isPunchedIn: boolean;
  onPunchToggle: () => void;
  onChangeStaff?: () => void;
}

export const TelecallerHeader: React.FC<TelecallerHeaderProps> = ({
  completedCalls,
  spokenSeconds,
  staffName,
  isPunchedIn,
  onPunchToggle,
  onChangeStaff,
}) => {
  const formatSec = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={styles.card}>
      {/* Left: Staff Identity & Switcher */}
      <TouchableOpacity
        style={styles.staffBox}
        onPress={onChangeStaff}
        activeOpacity={0.7}
      >
        <View style={styles.avatarCircle}>
          <User size={14} color="#1E40AF" />
        </View>
        <View>
          <Text style={styles.staffLabel}>Telecaller</Text>
          <Text style={styles.staffName} numberOfLines={1}>
            {staffName || "Staff"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Middle: Calls Count & Spoken Talk Time */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Calls</Text>
          <Text style={styles.metricValue}>{completedCalls}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <PhoneCall size={10} color="#16A34A" />
            <Text style={styles.metricLabel}>Talk Time</Text>
          </View>
          <Text style={[styles.metricValue, { color: "#16A34A" }]}>
            {formatSec(spokenSeconds)}
          </Text>
        </View>
      </View>

      {/* Right: Dedicated Punch In / Punch Out Button */}
      <TouchableOpacity
        style={[styles.punchBtn, isPunchedIn ? styles.punchBtnOut : styles.punchBtnIn]}
        onPress={onPunchToggle}
        activeOpacity={0.8}
      >
        {isPunchedIn ? (
          <>
            <LogOut size={12} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.punchBtnText}>Punch Out</Text>
          </>
        ) : (
          <>
            <Play size={12} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.punchBtnText}>Punch In</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  staffBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 130,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  staffLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  staffName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
  },
  punchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  punchBtnIn: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
  },
  punchBtnOut: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
  },
  punchBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
