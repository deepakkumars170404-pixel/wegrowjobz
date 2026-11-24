/**
 * Robust CSV / Tab-separated parser for Google Sheets and Excel exports.
 * Handles quoted fields with embedded commas, auto-detects header columns,
 * and extracts clean 10-digit phone numbers.
 */

export interface ParsedLeadRow {
  studentName: string;
  phone: string;
  courseInterested: string;
  preferredDomain: string;
  experienceYears: string;
  collegeName: string;
  qualification: string;
  email: string;
  city?: string;
  assignedCaller?: string;
}

export function parseCSVRow(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === "\t") && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseGoogleSheetCSV(
  csvText: string,
  defaultCaller = "Muthumeena"
): { leads: ParsedLeadRow[]; headers: string[]; totalRows: number } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { leads: [], headers: [], totalRows: 0 };
  }

  // Parse header row
  const rawHeaders = parseCSVRow(lines[0]);
  const lowerHeaders = rawHeaders.map((h) => h.toLowerCase().trim());

  // Detect column indexes
  let nameIdx = lowerHeaders.findIndex(
    (h) => h.includes("candidate") || h.includes("student") || h.includes("name") || h.includes("applicant")
  );
  let phoneIdx = lowerHeaders.findIndex(
    (h) =>
      h.includes("phone") ||
      h.includes("mobile") ||
      h.includes("contact") ||
      h.includes("number") ||
      h.includes("whatsapp") ||
      h.includes("cell")
  );
  let domainIdx = lowerHeaders.findIndex(
    (h) =>
      h.includes("domain") ||
      h.includes("course") ||
      h.includes("job") ||
      h.includes("role") ||
      h.includes("field") ||
      h.includes("position") ||
      h.includes("stream")
  );
  let collegeIdx = lowerHeaders.findIndex(
    (h) => h.includes("college") || h.includes("university") || h.includes("institution") || h.includes("campus")
  );
  let expIdx = lowerHeaders.findIndex(
    (h) => h.includes("exp") || h.includes("experience") || h.includes("year")
  );
  let qualIdx = lowerHeaders.findIndex(
    (h) => h.includes("qual") || h.includes("degree") || h.includes("education")
  );
  let emailIdx = lowerHeaders.findIndex((h) => h.includes("email") || h.includes("mail"));
  let callerIdx = lowerHeaders.findIndex((h) => h.includes("caller") || h.includes("telecaller") || h.includes("staff"));

  // Check if row 1 is actually data (if no headers detected)
  const isHeaderRow = nameIdx !== -1 || phoneIdx !== -1 || domainIdx !== -1;
  const startRow = isHeaderRow ? 1 : 0;

  // Fallbacks if not detected by header name
  if (nameIdx === -1) nameIdx = 0;
  if (phoneIdx === -1) phoneIdx = 1;
  if (domainIdx === -1) domainIdx = 2;
  if (expIdx === -1) expIdx = 3;
  if (collegeIdx === -1) collegeIdx = 4;

  const leads: ParsedLeadRow[] = [];
  const seenPhones = new Set<string>();

  for (let i = startRow; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 2) continue;

    const rawPhone = cols[phoneIdx] || "";
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    // Skip invalid / dummy phones
    if (cleanPhone.length < 7 || cleanPhone === "1234567890" || cleanPhone === "9876543210") {
      continue;
    }

    if (seenPhones.has(cleanPhone)) {
      continue;
    }
    seenPhones.add(cleanPhone);

    const name = (cols[nameIdx] || "Candidate").replace(/["']/g, "").trim();
    if (!name || name.toLowerCase() === "name" || name.toLowerCase() === "candidate name") {
      continue;
    }

    const domain = (domainIdx !== -1 && cols[domainIdx] ? cols[domainIdx] : "IT & Software Development").trim();
    const college = (collegeIdx !== -1 && cols[collegeIdx] ? cols[collegeIdx] : "").trim();
    const exp = (expIdx !== -1 && cols[expIdx] ? cols[expIdx] : "Fresher").trim();
    const qual = (qualIdx !== -1 && cols[qualIdx] ? cols[qualIdx] : "").trim();
    const email =
      emailIdx !== -1 && cols[emailIdx]
        ? cols[emailIdx].trim()
        : `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@candidate.wegrow`;
    const caller = callerIdx !== -1 && cols[callerIdx] ? cols[callerIdx].trim() : defaultCaller;

    leads.push({
      studentName: name,
      phone: cleanPhone,
      courseInterested: domain,
      preferredDomain: domain,
      experienceYears: exp,
      collegeName: college,
      qualification: qual,
      email,
      assignedCaller: caller || defaultCaller,
    });
  }

  return {
    leads,
    headers: rawHeaders,
    totalRows: lines.length - startRow,
  };
}
