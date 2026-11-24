import { CallRecord, AttendanceRecord } from "../types";

export const ExportService = {
  /**
   * Generates a beautifully styled, color-coded HTML/XML Excel Workbook (.xls)
   * with custom column widths, pastel status badges, executive KPI cards,
   * and text-formatted phone numbers (mso-number-format: "\@") so phone
   * numbers NEVER turn into scientific notation (1E+10) and dates NEVER show "########".
   */
  generateDailyCallReportExcel(
    attendance: AttendanceRecord | null,
    calls: CallRecord[],
    callerName: string
  ): string {
    const today = attendance?.date || new Date().toISOString().split("T")[0];

    const cleanStr = (val: any) =>
      String(val || "")
        .replace(/[\u202F\u00A0]/g, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .trim();

    const formatSec = (total: number) => {
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs}h ${remMins}m ${secs}s`;
      }
      return `${mins}m ${secs}s`;
    };

    const totalSpoken = attendance?.spokenSeconds || calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);

    const rowsHtml = calls
      .map((c, idx) => {
        const phone = cleanStr(c.phone || c.studentPhone || "");
        const date = cleanStr(c.callDate || today);
        const caller = cleanStr(c.callerName || callerName || "Staff");
        const student = cleanStr(c.studentName || "Candidate");
        const startTime = cleanStr(c.callStartTime || c.callTime || c.fromTime || "");
        const endTime = cleanStr(c.callEndTime || c.endTime || "");
        const durSec = Number(c.durationSeconds || 0);
        const durFormatted = cleanStr(c.formattedDuration || (durSec > 0 ? formatSec(durSec) : "00:00"));
        const outcome = cleanStr(c.outcome || (durSec > 0 ? "Attended Call" : "Not Attended Call"));
        const disposition = cleanStr(c.disposition || c.mindset || outcome);
        const domain = cleanStr(c.preferredDomain || c.courseInterested || "");
        const exp = cleanStr(c.experienceYears || "Fresher");
        const qual = cleanStr(c.qualification || "");
        const college = cleanStr(c.collegeName || "");
        const nextFu = cleanStr(c.nextFollowUpDate || "");
        const remarks = cleanStr(c.notes || c.remarks || "");

        const isAttended = durSec > 0 || outcome.toLowerCase().includes("attended");
        const statusBg = isAttended ? "#D1FAE5" : "#FEE2E2";
        const statusColor = isAttended ? "#065F46" : "#991B1B";

        let dispBg = "#F1F5F9";
        let dispColor = "#334155";
        const lowerDisp = disposition.toLowerCase();
        if (lowerDisp.includes("interest") || lowerDisp.includes("shortlist")) {
          dispBg = "#DCFCE7";
          dispColor = "#15803D";
        } else if (lowerDisp.includes("later") || lowerDisp.includes("callback") || lowerDisp.includes("follow")) {
          dispBg = "#FEF3C7";
          dispColor = "#B45309";
        } else if (
          lowerDisp.includes("reject") ||
          lowerDisp.includes("not") ||
          lowerDisp.includes("cut") ||
          lowerDisp.includes("busy")
        ) {
          dispBg = "#FEE2E2";
          dispColor = "#B91C1C";
        }

        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

        return `
      <tr style="background-color: ${rowBg};">
        <td style="text-align: center; mso-number-format: '\\@';">${idx + 1}</td>
        <td style="text-align: center; white-space: nowrap; mso-number-format: 'yyyy-mm-dd';">${date}</td>
        <td style="mso-number-format: '\\@'; font-weight: 500;">${caller}</td>
        <td style="mso-number-format: '\\@'; font-weight: 600; color: #0F172A;">${student}</td>
        <td style="text-align: center; mso-number-format: '\\@'; font-family: Consolas, monospace; font-weight: bold; color: #1E293B;">${phone}</td>
        <td style="text-align: center; white-space: nowrap; mso-number-format: '\\@';">${startTime}</td>
        <td style="text-align: center; white-space: nowrap; mso-number-format: '\\@';">${endTime}</td>
        <td style="text-align: center; font-weight: 600; color: #047857; mso-number-format: '\\@';">${durFormatted}</td>
        <td style="text-align: center; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold;">${outcome}</td>
        <td style="text-align: center; background-color: ${dispBg}; color: ${dispColor}; font-weight: 600;">${disposition}</td>
        <td style="mso-number-format: '\\@';">${domain}</td>
        <td style="text-align: center; mso-number-format: '\\@';">${exp}</td>
        <td style="mso-number-format: '\\@';">${qual}</td>
        <td style="mso-number-format: '\\@';">${college}</td>
        <td style="text-align: center; white-space: nowrap; font-weight: 600; color: #4338CA; mso-number-format: 'yyyy-mm-dd';">${nextFu || "-"}</td>
        <td style="mso-number-format: '\\@'; font-size: 10pt; color: #475569;">${remarks}</td>
      </tr>`;
      })
      .join("");

    return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Daily Calls Report</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #CBD5E1; padding: 7px 10px; font-size: 11pt; vertical-align: middle; }
    .banner { background-color: #142B52; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; height: 44px; }
    .sub-banner { background-color: #1E3A8A; color: #E0E7FF; font-size: 10pt; text-align: center; height: 24px; }
    .kpi-hdr { background-color: #F1F5F9; color: #334155; font-weight: bold; font-size: 10pt; }
    .kpi-val { font-weight: bold; font-size: 11pt; color: #0F172A; }
    .th-col { background-color: #142B52; color: #FFFFFF; font-weight: bold; font-size: 10.5pt; text-align: center; height: 32px; }
  </style>
</head>
<body>
  <table>
    <col style="width: 45pt;" />
    <col style="width: 90pt;" />
    <col style="width: 105pt;" />
    <col style="width: 130pt;" />
    <col style="width: 115pt;" />
    <col style="width: 85pt;" />
    <col style="width: 85pt;" />
    <col style="width: 80pt;" />
    <col style="width: 105pt;" />
    <col style="width: 115pt;" />
    <col style="width: 150pt;" />
    <col style="width: 80pt;" />
    <col style="width: 130pt;" />
    <col style="width: 160pt;" />
    <col style="width: 95pt;" />
    <col style="width: 260pt;" />

    <!-- Title Banner -->
    <tr>
      <td colspan="16" class="banner">WEGROW TELECALLING CRM - DAILY CALL REPORT</td>
    </tr>
    <tr>
      <td colspan="16" class="sub-banner">WeGrow Jobz Telecalling CRM & Placement Management System</td>
    </tr>
    <tr><td colspan="16" style="height: 8px; border: none;"></td></tr>

    <!-- Top KPI Summary Cards -->
    <tr>
      <td colspan="2" class="kpi-hdr">Report Date:</td>
      <td colspan="3" class="kpi-val" style="mso-number-format: 'yyyy-mm-dd';">${today}</td>
      <td colspan="2" class="kpi-hdr">Total Calls Made:</td>
      <td colspan="2" class="kpi-val" style="background-color: #EFF6FF; color: #1D4ED8; text-align: center; font-size: 13pt;">${calls.length}</td>
      <td colspan="2" class="kpi-hdr">Total Talk Time:</td>
      <td colspan="5" class="kpi-val" style="background-color: #ECFDF5; color: #047857; text-align: center; font-size: 13pt;">${formatSec(totalSpoken)}</td>
    </tr>
    <tr>
      <td colspan="2" class="kpi-hdr">Telecaller Staff:</td>
      <td colspan="3" class="kpi-val">${callerName || "Staff"}</td>
      <td colspan="2" class="kpi-hdr">Morning Punch In:</td>
      <td colspan="2" class="kpi-val" style="mso-number-format: '\\@';">${cleanStr(attendance?.loginTime || "N/A")}</td>
      <td colspan="2" class="kpi-hdr">Evening Punch Out:</td>
      <td colspan="5" class="kpi-val" style="mso-number-format: '\\@';">${cleanStr(attendance?.logoutTime || "In Progress")}</td>
    </tr>
    <tr><td colspan="16" style="height: 10px; border: none;"></td></tr>

    <!-- Table Headers -->
    <thead>
      <tr>
        <th class="th-col">S.No</th>
        <th class="th-col">Date</th>
        <th class="th-col">Caller Name</th>
        <th class="th-col">Candidate Name</th>
        <th class="th-col">Phone Number</th>
        <th class="th-col">Call Start</th>
        <th class="th-col">Call End</th>
        <th class="th-col">Talk Duration</th>
        <th class="th-col">Call Outcome</th>
        <th class="th-col">Disposition</th>
        <th class="th-col">Job Domain</th>
        <th class="th-col">Experience</th>
        <th class="th-col">Qualification</th>
        <th class="th-col">College Name</th>
        <th class="th-col">Next Follow-up</th>
        <th class="th-col">Feedback / Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`.trim();
  },

  /**
   * Enhanced CSV generator with UTF-8 BOM, text-formatted phone numbers (="9843173678"),
   * and clean ASCII time strings.
   */
  generateDailyCallReportCSV(
    attendance: AttendanceRecord | null,
    calls: CallRecord[],
    callerName: string
  ): string {
    const today = attendance?.date || new Date().toISOString().split("T")[0];

    const clean = (val: any) =>
      String(val || "")
        .replace(/[\u202F\u00A0]/g, " ")
        .trim();

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
      "Call Outcome",
      "Disposition / Status",
      "Job Domain / Course",
      "Experience",
      "Qualification",
      "College Name",
      "Next Follow-up Date",
      "Feedback / Remarks",
    ];

    const rows = calls.map((c, idx) => {
      const escape = (val: any) => `"${clean(val).replace(/"/g, '""')}"`;
      const phoneText = clean(c.phone || c.studentPhone || "");
      // Using ="..." forces Excel to treat phone numbers as text, eliminating 1E+10
      const safePhone = phoneText ? `="${phoneText}"` : '""';

      return [
        idx + 1,
        escape(c.callDate || today),
        escape(c.callerName || callerName),
        escape(c.studentName || "Candidate"),
        safePhone,
        escape(c.callStartTime || c.callTime || c.fromTime || ""),
        escape(c.callEndTime || c.endTime || ""),
        escape(c.formattedDuration || `${c.durationSeconds || 0}s`),
        escape(c.outcome || ((c.durationSeconds || 0) > 0 ? "Attended Call" : "Not Attended Call")),
        escape(c.disposition || c.mindset || ""),
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
      `"Caller Name:","${clean(callerName)}"`,
      `"Morning Punch In:","${clean(attendance?.loginTime || "N/A")}"`,
      `"Evening Punch Out:","${clean(attendance?.logoutTime || "In Progress")}"`,
      `"Total Calls Made:","${calls.length}"`,
      `"Total Spoken Seconds:","${attendance?.spokenSeconds || 0}s"`,
      `"Total Idle Seconds:","${attendance?.idleSeconds || 0}s"`,
      `""`,
    ];

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 text properly
    return "\uFEFF" + [...summaryLines, headers.join(","), ...rows].join("\r\n");
  },
};

