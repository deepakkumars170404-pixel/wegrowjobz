export interface JobDomain {
  id: string;
  name: string;
  category: "IT & Software" | "Telecalling & BPO" | "Marketing & Sales" | "Finance & Accounts" | "Admin & HR";
  typicalSalaryRange: string;
}

export const WEGROW_JOB_DOMAINS: JobDomain[] = [
  { id: "jd-1", name: "Full Stack Developer (React / Node / Python)", category: "IT & Software", typicalSalaryRange: "₹25,000 - ₹45,000" },
  { id: "jd-2", name: "Front End Developer (HTML/CSS/JS/React)", category: "IT & Software", typicalSalaryRange: "₹20,000 - ₹35,000" },
  { id: "jd-3", name: "Back End / Python Developer", category: "IT & Software", typicalSalaryRange: "₹22,000 - ₹40,000" },
  { id: "jd-4", name: "Mobile App Developer (Flutter / React Native)", category: "IT & Software", typicalSalaryRange: "₹25,000 - ₹45,000" },
  { id: "jd-5", name: "Data Analyst & Power BI Executive", category: "IT & Software", typicalSalaryRange: "₹22,000 - ₹38,000" },
  { id: "jd-6", name: "Telecaller / Tele-Marketing Executive", category: "Telecalling & BPO", typicalSalaryRange: "₹15,000 - ₹25,000" },
  { id: "jd-7", name: "Customer Support Executive (Voice / Non-Voice)", category: "Telecalling & BPO", typicalSalaryRange: "₹16,000 - ₹26,000" },
  { id: "jd-8", name: "BPO Team Leader / Quality Analyst", category: "Telecalling & BPO", typicalSalaryRange: "₹22,000 - ₹35,000" },
  { id: "jd-9", name: "Digital Marketing & SEO Specialist", category: "Marketing & Sales", typicalSalaryRange: "₹18,000 - ₹32,000" },
  { id: "jd-10", name: "Social Media & Performance Ads Executive", category: "Marketing & Sales", typicalSalaryRange: "₹18,000 - ₹30,000" },
  { id: "jd-11", name: "Field Sales & Business Development", category: "Marketing & Sales", typicalSalaryRange: "₹18,000 - ₹30,000 + Inc" },
  { id: "jd-12", name: "Accountant & Tally / GST Executive", category: "Finance & Accounts", typicalSalaryRange: "₹18,000 - ₹30,000" },
  { id: "jd-13", name: "Accounts Assistant / Billing Clerk", category: "Finance & Accounts", typicalSalaryRange: "₹14,000 - ₹20,000" },
  { id: "jd-14", name: "HR Recruiter / Talent Acquisition", category: "Admin & HR", typicalSalaryRange: "₹18,000 - ₹30,000" },
  { id: "jd-15", name: "Office Admin & Back Office Coordinator", category: "Admin & HR", typicalSalaryRange: "₹15,000 - ₹22,000" },
  { id: "jd-16", name: "Graphic Designer & Video Editor", category: "Marketing & Sales", typicalSalaryRange: "₹18,000 - ₹32,000" },
];
