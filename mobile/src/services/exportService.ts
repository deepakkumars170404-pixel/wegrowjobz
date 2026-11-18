import { CallRecord, AttendanceRecord } from "../types";

export const ExportService = {
  /**
   * Generates a CSV string containing all details of today's calls,
   * caller name, start/end time, duration, student/candidate name,
   * experience, job domain, disposition, and remarks.
   */
  generateDailyCallReportCSV(
    attendance: AttendanceRecord | null,
    calls: CallRecord[],
    callerName: string
  ): string {
    const today = new Date().toISOString().split("T")[0];

    // CSV Headers
    const headers = [
      "S.No",
      "Date",
      "Caller Name",
      "Candidate Name",
      "Phone Number",
      "Call Start Time",
      "Call End Time",
      "Spoken Duration",
      "Disposition / Status",
      "Job Domain / Course",
      "Experience",
      "Qualification",
      "College Name",
      "Next Follow-up Date",
      "Feedback / Remarks",
    ];

    const rows = calls.map((c, idx) => {
      const escape = (val: any) => `"${String(val || "").replace(/"/g, '""')}"`;

      return [
        idx + 1,
        escape(c.callDate || today),
        escape(c.callerName || callerName),
        escape(c.studentName),
        escape(c.phone),
        escape(c.callStartTime || ""),
        escape(c.callEndTime || ""),
        escape(c.formattedDuration || `${c.durationSeconds}s`),
        escape(c.disposition || c.outcome || ""),
        escape(c.preferredDomain || c.courseInterested || ""),
        escape(c.experienceYears || "Fresher"),
        escape(c.qualification || ""),
        escape(c.collegeName || ""),
        escape(c.nextFollowUpDate || ""),
        escape(c.notes || c.remarks || ""),
      ].join(",");
    });

    // Summary metadata rows at top
    const summaryLines = [
      `"WEGROW TELECALLING CRM - DAILY CALL REPORT"`,
      `"Report Date:","${today}"`,
      `"Caller Name:","${callerName}"`,
      `"Morning Punch In:","${attendance?.loginTime || "N/A"}"`,
      `"Evening Punch Out:","${attendance?.logoutTime || "In Progress"}"`,
      `"Total Calls Made:","${calls.length}"`,
      `"Total Spoken Seconds:","${attendance?.spokenSeconds || 0}s"`,
      `"Total Idle Seconds:","${attendance?.idleSeconds || 0}s"`,
      `""`,
    ];

    return [...summaryLines, headers.join(","), ...rows].join("\r\n");
  },
};
