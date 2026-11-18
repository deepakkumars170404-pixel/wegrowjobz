export interface JobDomain {
  id: string;
  name: string;
  category: "IT & Software" | "Telecalling & BPO" | "Marketing & Sales" | "Finance & Accounts" | "Admin & HR";
  typicalSalaryRange: string;
}

export const ALL_JOB_ROLES: string[] = [
  // IT & Software
  "Full Stack Web Developer (React / Node / Python)",
  "Front End Developer (HTML, CSS, React.js)",
  "Back End Developer (Python / Django / Node.js)",
  "Python Developer",
  "React / React Native Developer",
  "Java / Spring Boot Developer",
  "Flutter Mobile App Developer",
  "Software Tester / Manual & Automation QA",
  "Data Analyst & Power BI Executive",
  "Data Scientist & AI / ML Engineer",
  "SQL / Database Administrator (DBA)",
  "Cloud & DevOps Engineer (AWS / Azure)",
  "Cyber Security Analyst",
  "Network & Hardware Desktop Engineer",
  "UI / UX Designer (Figma / Web)",

  // Telecalling & BPO
  "Telecaller / Tele-Marketing Executive",
  "Inside Sales Executive (Voice)",
  "Customer Support Executive (Voice / Non-Voice)",
  "BPO Team Leader / Operations Supervisor",
  "Quality Analyst (QA - BPO Voice)",
  "Medical Billing / AR Caller",
  "Client Relationship Executive (CRE)",

  // Marketing & Sales
  "Digital Marketing Specialist (SEO / SEM)",
  "Social Media & Meta Ads Manager",
  "Performance Marketing & Google Ads Executive",
  "Field Sales & Business Development Executive (BDE)",
  "Corporate Sales Manager",
  "Graphic Designer & Social Media Post Creator",
  "Video Editor & Content Creator (Premiere / CapCut)",
  "Copywriter & Content Writer",

  // Finance & Accounts
  "Accountant (Tally Prime & GST / TDS)",
  "Senior Accountant & Audit Assistant",
  "Accounts Assistant / Billing Executive",
  "Financial Analyst / MIS Executive",
  "Banking & Loan Operations Executive",

  // HR, Admin & Operations
  "HR Recruiter / Talent Acquisition Specialist",
  "HR Generalist & Payroll Executive",
  "Office Admin & Front Office Coordinator",
  "Executive Assistant to Director",
  "Logistics & Supply Chain Coordinator",
  "Store In-charge & Inventory Executive",
];

export const WEGROW_JOB_DOMAINS: JobDomain[] = ALL_JOB_ROLES.map((name, idx) => ({
  id: `jd-${idx + 1}`,
  name,
  category: name.includes("Developer") || name.includes("Data") || name.includes("Tester") || name.includes("Engineer")
    ? "IT & Software"
    : name.includes("Telecaller") || name.includes("BPO") || name.includes("Customer")
    ? "Telecalling & BPO"
    : name.includes("Marketing") || name.includes("Sales") || name.includes("Designer") || name.includes("Video")
    ? "Marketing & Sales"
    : name.includes("Account") || name.includes("Financial") || name.includes("Billing")
    ? "Finance & Accounts"
    : "Admin & HR",
  typicalSalaryRange: "₹18,000 - ₹35,000",
}));
