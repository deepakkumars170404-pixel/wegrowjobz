import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Share,
} from "react-native";
import {
  Clock,
  PhoneCall,
  Share2,
  LogOut,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
} from "lucide-react-native";
import { AttendanceRecord, CallRecord, StaffMember } from "../types";
import { ExportService } from "../services/exportService";
import { TelephonyService } from "../services/telephony";

interface PunchOutReportModalProps {
  visible: boolean;
  attendance: AttendanceRecord | null;
  staffName: StaffMember;
  todayCalls: CallRecord[];
  onClose: () => void;
}

export const PunchOutReportModal: React.FC<PunchOutReportModalProps> = ({
  visible,
  attendance,
  staffName,
  todayCalls,
  onClose,
}) => {
  if (!attendance) return null;

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

  const handleShareReport = async () => {
    const todayStr = attendance.date || new Date().toISOString().split("T")[0];
    const excelData = ExportService.generateDailyCallReportExcel(
      attendance,
      todayCalls,
      staffName
    );

    const fileName = `WeGrow_Daily_Call_Report_${staffName}_${todayStr}.xls`;
    const shareTitle = `WeGrow Daily Calls Report - ${staffName} (${todayStr})`;

    // 1. Try native file attachment share (opens in Excel / Sheets directly with colors and auto widths)
    const fileShared = await TelephonyService.shareReportFile(excelData, fileName, shareTitle);
    if (fileShared) return;

    // 2. Fallback to standard share with enhanced CSV
    const csvData = ExportService.generateDailyCallReportCSV(
      attendance,
      todayCalls,
      staffName
    );
    try {
      await Share.share({
        title: shareTitle,
        message: csvData,
      });
    } catch (err) {
      console.log("Share report error:", err);
    }
  };

  const handleExitApp = () => {
    onClose();
    // Exit application immediately as requested
    setTimeout(() => {
      BackHandler.exitApp();
    }, 200);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={28} color="#16A34A" strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Shift Closed & Punch Out</Text>
            <Text style={styles.subtitle}>Daily Telecalling Performance Summary</Text>
          </View>

          {/* Caller & Date Bar */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <User size={13} color="#1E40AF" />
              <Text style={styles.metaText}>{staffName}</Text>
            </View>
            <View style={styles.metaPill}>
              <Calendar size={13} color="#64748B" />
              <Text style={styles.metaText}>{attendance.date}</Text>
            </View>
          </View>

          {/* Timing Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>PUNCH IN</Text>
              <Text style={[styles.gridValue, { color: "#16A34A" }]}>
                {attendance.loginTime || "—"}
              </Text>
            </View>

            <View style={styles.gridDivider} />

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>PUNCH OUT</Text>
              <Text style={[styles.gridValue, { color: "#DC2626" }]}>
                {attendance.logoutTime || "—"}
              </Text>
            </View>
          </View>

          {/* Working Metrics */}
          <View style={styles.statsCard}>
            <View style={styles.statLine}>
              <View style={styles.statLeft}>
                <Clock size={16} color="#2563EB" />
                <Text style={styles.statLabel}>Total Working Hours:</Text>
              </View>
              <Text style={styles.statValueBold}>
                {attendance.workingHoursFormatted || "—"}
              </Text>
            </View>

            <View style={styles.statLine}>
              <View style={styles.statLeft}>
                <PhoneCall size={16} color="#0D9488" />
                <Text style={styles.statLabel}>Total Calls Logged:</Text>
              </View>
              <Text style={styles.statValueBold}>
                {attendance.totalCallsToday} calls
              </Text>
            </View>

            <View style={styles.statLine}>
              <View style={styles.statLeft}>
                <ShieldCheck size={16} color="#16A34A" />
                <Text style={styles.statLabel}>Total Talk Time:</Text>
              </View>
              <Text style={[styles.statValueBold, { color: "#16A34A" }]}>
                {formatSec(attendance.spokenSeconds)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareReport}
              activeOpacity={0.8}
            >
              <Share2 size={16} color="#1E40AF" strokeWidth={2.5} />
              <Text style={styles.shareBtnText}>Share Daily CSV Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exitBtn}
              onPress={handleExitApp}
              activeOpacity={0.8}
            >
              <LogOut size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.exitBtnText}>Close & Exit App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#DCFCE7",
    borderWidth: 2,
    borderColor: "#86EFAC",
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
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  gridContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 14,
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 3,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  gridDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#CBD5E1",
  },
  statsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 10,
    marginBottom: 18,
  },
  statLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  statValueBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  actions: {
    gap: 10,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "700",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  exitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
