import {
  Lead,
  FollowUpTask,
  WhatsAppChat,
  WhatsAppTemplate,
  Telecaller,
  Course,
  AppUser,
} from "@/types";
import { WEGROW_INSTITUTE_COURSES } from "./institute-courses";

// 1. Official WeGrow Institute Courses from Brochure (01 to 34)
export const initialCourses: Course[] = WEGROW_INSTITUTE_COURSES.map((c) => {
  const is6M = c.duration.includes("6");
  const is4M = c.duration.includes("4");
  const is9M = c.duration.includes("9");
  const is3M = c.duration.includes("3");
  const fee = is9M ? 65000 : is6M ? 45000 : is4M ? 35000 : is3M ? 28000 : 18000;

  let icon = "GraduationCap";
  if (c.category.includes("01")) icon = "Code2";
  else if (c.category.includes("02")) icon = "TrendingUp";
  else icon = "BrainCircuit";

  return {
    id: `crs-${c.code}`,
    name: c.displayName,
    category: c.category,
    duration: c.duration,
    fee,
    shortDescription: `${c.name} under ${c.track}. Duration: ${c.duration}.${c.details ? ` Key coverage: ${c.details}.` : ""}`,
    fullDescription: `Official curriculum for ${c.displayName} at WeGrow Skill Campus. Master industry-standard practices, tools, and workflows in ${c.track}.${c.details ? ` Includes comprehensive hands-on practice in ${c.details}.` : ""}`,
    eligibility: "Any Degree / Diploma / Engineering / Arts & Science / School Passout or working professionals",
    curriculum: [
      `Module 1: Foundations & Core Concepts of ${c.name}`,
      `Module 2: Practical Lab Workflows & Real-time Exercises`,
      `Module 3: Advanced ${c.track} Industry Projects`,
      `Module 4: Capstone Execution, Portfolio & Placement Prep`,
    ],
    highlights: [
      "100% Practical Lab Training",
      "Real-time Industry Project Guidance",
      "WeGrow Certificate of Completion",
      "Placement & Career Support",
    ],
    mode: "Classroom / Offline",
    enrolledStudents: 140,
    rating: 4.9,
    iconName: icon,
  };
});

// 2. WeGrow Telecaller Staff Team
export const initialTelecallers: Telecaller[] = [
  {
    id: "caller-muthumeena",
    name: "Muthumeena",
    email: "muthumeena@wegrow.edu",
    phone: "+91 98431 73678",
    avatar: "",
    role: "Senior Telecaller",
    assignedLeads: 45,
    dailyTarget: 60,
    callsCompleted: 35,
    connectedCalls: 28,
    interestedLeads: 18,
    followUpsCompleted: 24,
    admissionsGenerated: 12,
    conversionRate: 26.5,
    rank: 1,
  },
];

// 3. WeGrow Jobz Candidates Pool (Zero dummy data, clean slate)
export const initialLeads: Lead[] = [];

// 4. Follow-up for Job Candidate (Zero dummy data)
export const initialFollowUps: FollowUpTask[] = [];

// 5. WhatsApp Chats
export const initialWhatsAppChats: WhatsAppChat[] = [
  {
    id: "chat-karthik",
    leadId: "JOBZ-2026-001",
    studentName: "Karthik Raja",
    phone: "+91 98401 23456",
    course: "Full Stack Developer",
    unreadCount: 0,
    lastMessage: "Thank you ma'am, I have shared my updated resume on email.",
    lastMessageTime: "11:35 AM",
    messages: [
      {
        id: "m-k1",
        sender: "caller",
        text: "Hi Karthik! Greetings from WeGrow Jobz. Thank you for your interest in the Full Stack Developer opening.",
        timestamp: "Today, 11:30 AM",
        status: "read",
      },
      {
        id: "m-k2",
        sender: "student",
        text: "Thank you ma'am, I have shared my updated resume on email.",
        timestamp: "Today, 11:35 AM",
      },
    ],
  },
];

// 6. WhatsApp Templates
export const initialWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: "tpl-1",
    title: "Brochure & Curriculum Roadmap",
    category: "Information",
    message: "Hi {StudentName}! 🎓 Greetings from WeGrow Skill Campus. Here is the official curriculum details for {CourseName}. Please let us know if you would like to schedule a campus demo session.",
  },
  {
    id: "tpl-2",
    title: "Campus Lab Visit Invitation",
    category: "Follow-up",
    message: "Dear {StudentName}, We would love to invite you to visit our state-of-the-art WeGrow training facility. You can experience our hands-on coding labs and meet our industry mentors in person.",
  },
  {
    id: "tpl-3",
    title: "Fee Structure & Batch Timing",
    category: "Pricing",
    message: "Hello {StudentName}! The upcoming batch for {CourseName} starts next Monday. Here are the flexible installment options and weekend/weekday schedule options.",
  },
  {
    id: "tpl-4",
    title: "Official Admission Confirmation",
    category: "Onboarding",
    message: "Congratulations {StudentName}! 🎓 Your admission for {CourseName} at WeGrow Skill Campus is officially confirmed. Welcome to the WeGrow changemaker community!",
  },
];

// 7. Leadership & Staff App Users
export const initialUsers: AppUser[] = [
  {
    id: "usr-thavabalan",
    name: "Thavabalan",
    email: "thavabalan@wegrow.edu",
    phone: "+91 98431 73678",
    role: "Owner",
    assignedLeads: 0,
    status: "Active",
    joinedDate: "01 Jan 2023",
    avatar: "",
    lastActive: "Active now",
    password: "7708",
  },
  {
    id: "usr-gopinath",
    name: "Gopinath (HR)",
    email: "gopinath.hr@wegrow.edu",
    phone: "+91 99438 77948",
    role: "Admin",
    assignedLeads: 0,
    status: "Active",
    joinedDate: "01 Feb 2023",
    avatar: "",
    lastActive: "Active now",
    password: "5678",
  },
  {
    id: "usr-vijayakumar",
    name: "Vijayakumar",
    email: "vijayakumar@wegrow.edu",
    phone: "+91 90923 22803",
    role: "Admin",
    assignedLeads: 0,
    status: "Active",
    joinedDate: "01 Feb 2023",
    avatar: "",
    lastActive: "Active now",
    password: "5678",
  },
  {
    id: "usr-muthumeena",
    name: "Muthumeena",
    email: "muthumeena@wegrow.edu",
    phone: "+91 98431 73678",
    role: "Telecaller",
    assignedLeads: 45,
    status: "Active",
    joinedDate: "01 Mar 2023",
    avatar: "",
    lastActive: "Active now",
    password: "1234",
  },
];

export const dashboardStats = {
  totalLeads: 1,
  activeEnquiries: 1,
  admissionsClosed: 0,
  conversionRate: "100%",
  callsMadeToday: 1,
  pendingFollowUps: 1,
  averageCallDuration: "01:05",
  revenueGenerated: "₹0",
};

export const leadGrowthChartData = [
  { name: "Week 1", leads: 0 },
  { name: "Week 2", leads: 1 },
];

export const monthlyGrowthChartData = [
  { month: "Nov 2026", leads: 1, admissions: 0 },
];

export const leadSourceDistribution = [
  { name: "Phone", value: 1, color: "#10b981" },
];

export const admissionFunnelData = [
  { stage: "Enquiry", count: 1, percentage: 100, color: "#6366f1" },
  { stage: "Connected", count: 1, percentage: 100, color: "#0ea5e9" },
  { stage: "Interested", count: 1, percentage: 100, color: "#f59e0b" },
  { stage: "Visit", count: 1, percentage: 100, color: "#10b981" },
];

export const recentActivityTimeline = [
  {
    id: "act-1",
    type: "call",
    title: "Call Attended: Rahul",
    description: "MuthuSelvi spoke with Rahul for 1m 5s. Mindset: Visit to Institute.",
    desc: "MuthuSelvi spoke with Rahul for 1m 5s. Mindset: Visit to Institute.",
    user: "MuthuSelvi",
    time: "Today 04:38 PM",
  },
];
