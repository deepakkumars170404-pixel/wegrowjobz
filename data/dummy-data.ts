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
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
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
  {
    id: "caller-muthuselvi",
    name: "MuthuSelvi",
    email: "muthuselvi@wegrow.edu",
    phone: "+91 99438 77948",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    role: "Senior Telecaller",
    assignedLeads: 40,
    dailyTarget: 55,
    callsCompleted: 32,
    connectedCalls: 26,
    interestedLeads: 15,
    followUpsCompleted: 20,
    admissionsGenerated: 10,
    conversionRate: 25.0,
    rank: 2,
  },
  {
    id: "caller-devipriya",
    name: "Devi Priya",
    email: "devipriya@wegrow.edu",
    phone: "+91 90923 22803",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "Senior Telecaller",
    assignedLeads: 38,
    dailyTarget: 50,
    callsCompleted: 30,
    connectedCalls: 24,
    interestedLeads: 14,
    followUpsCompleted: 18,
    admissionsGenerated: 9,
    conversionRate: 23.7,
    rank: 3,
  },
  {
    id: "caller-lakshmipriya",
    name: "LakshmiPriya",
    email: "lakshmipriya@wegrow.edu",
    phone: "+91 98431 73678",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80",
    role: "Admissions Counsellor",
    assignedLeads: 35,
    dailyTarget: 45,
    callsCompleted: 28,
    connectedCalls: 22,
    interestedLeads: 12,
    followUpsCompleted: 16,
    admissionsGenerated: 8,
    conversionRate: 22.8,
    rank: 4,
  },
  {
    id: "caller-subhashini",
    name: "Subhashini",
    email: "subhashini@wegrow.edu",
    phone: "+91 99438 77948",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    role: "Telecalling Executive",
    assignedLeads: 30,
    dailyTarget: 40,
    callsCompleted: 24,
    connectedCalls: 18,
    interestedLeads: 10,
    followUpsCompleted: 14,
    admissionsGenerated: 6,
    conversionRate: 20.0,
    rank: 5,
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
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    lastActive: "Active now",
  },
  {
    id: "usr-lakshmipriya",
    name: "LakshmiPriya (GM & Admin)",
    email: "lakshmipriya.gm@wegrow.edu",
    phone: "+91 98431 73678",
    role: "Admin",
    assignedLeads: 35,
    status: "Active",
    joinedDate: "15 Jan 2023",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80",
    lastActive: "Active now",
  },
  {
    id: "usr-gopi",
    name: "Gopi (HR)",
    email: "gopi.hr@wegrow.edu",
    phone: "+91 99438 77948",
    role: "Admin",
    assignedLeads: 0,
    status: "Active",
    joinedDate: "01 Feb 2023",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    lastActive: "15 mins ago",
  },
  {
    id: "usr-muthumeena",
    name: "Muthumeena (Telecall Head)",
    email: "muthumeena@wegrow.edu",
    phone: "+91 98431 73678",
    role: "Telecaller",
    assignedLeads: 45,
    status: "Active",
    joinedDate: "01 Mar 2023",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    lastActive: "Active now",
  },
  {
    id: "usr-muthuselvi",
    name: "MuthuSelvi",
    email: "muthuselvi@wegrow.edu",
    phone: "+91 99438 77948",
    role: "Telecaller",
    assignedLeads: 40,
    status: "Active",
    joinedDate: "01 Mar 2023",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    lastActive: "Active now",
  },
  {
    id: "usr-devipriya",
    name: "Devi Priya",
    email: "devipriya@wegrow.edu",
    phone: "+91 90923 22803",
    role: "Telecaller",
    assignedLeads: 38,
    status: "Active",
    joinedDate: "15 Mar 2023",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    lastActive: "Active now",
  },
  {
    id: "usr-subhashini",
    name: "Subhashini",
    email: "subhashini@wegrow.edu",
    phone: "+91 99438 77948",
    role: "Telecaller",
    assignedLeads: 30,
    status: "Active",
    joinedDate: "01 Apr 2023",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    lastActive: "1 hour ago",
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
