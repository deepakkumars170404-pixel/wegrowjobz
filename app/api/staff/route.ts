import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialTelecallers } from "@/data/dummy-data";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "crm_storage.json");
const STAFF_REGISTRY_ID = "SYS-STAFF-REGISTRY";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function syncStaffToSupabase(telecallers: any[], deletedNames: string[] = [], updatedAt?: string) {
  const client = supabaseAdmin || supabase;
  if (!isSupabaseConfigured() || !client) return;
  try {
    const compact = telecallers.map((t: any) => ({
      id: t.id,
      name: (t.name || "").trim(),
      phone: t.phone || "",
      email: t.email || "",
      role: t.role || "Telecalling Executive",
      password: t.password || "1234",
      status: t.status || "Active",
      isFrozen: Boolean(t.isFrozen || t.status === "Inactive"),
      mustChangePassword: Boolean(t.mustChangePassword),
      avatar: t.avatar && String(t.avatar).length < 65000 ? t.avatar : "",
      dailyTarget: t.dailyTarget || 50,
      whatsapp: t.whatsapp || "",
      languages: Array.isArray(t.languages) ? t.languages : undefined,
      specialization: t.specialization || "",
      bio: t.bio || "",
    }));

    await client.from("jobz_leads").upsert(
      {
        id: STAFF_REGISTRY_ID,
        student_name: "dummy",
        phone: "1234567890",
        assigned_caller: "Unassigned",
        status: "Inactive",
        stage: "System",
        college_name: JSON.stringify(compact),
        notice_period: JSON.stringify(deletedNames),
        updated_at: updatedAt || new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("Supabase staff registry sync failed:", err);
  }
}

async function readStaffFromSupabase(): Promise<{
  telecallers: any[];
  deletedNames: string[];
  updatedAt: string;
} | null> {
  const client = supabaseAdmin || supabase;
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from("jobz_leads")
      .select("college_name, notice_period, updated_at")
      .eq("id", STAFF_REGISTRY_ID)
      .maybeSingle();
    if (!error && data?.college_name) {
      const parsed = JSON.parse(data.college_name);
      let deletedNames: string[] = [];
      try {
        if (data.notice_period) {
          const dParsed = JSON.parse(data.notice_period);
          if (Array.isArray(dParsed)) deletedNames = dParsed;
        }
      } catch {}
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          telecallers: parsed,
          deletedNames,
          updatedAt: data.updated_at || "",
        };
      }
    }
  } catch {}
  return null;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function readStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function writeStorage(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to crm_storage.json:", err);
  }
}

export async function GET() {
  try {
    const storage = readStorage();
    const localTelecallers: any[] | null =
      Array.isArray(storage.telecallers) && storage.telecallers.length > 0
        ? storage.telecallers
        : null;
    const localUpdatedAt = storage.staffUpdatedAt ? Date.parse(storage.staffUpdatedAt) : 0;
    let deletedNames: string[] = Array.isArray(storage.deletedStaffNames)
      ? storage.deletedStaffNames
      : [];

    const sbData = await readStaffFromSupabase();
    const sbUpdatedAt = sbData?.updatedAt ? Date.parse(sbData.updatedAt) : 0;

    let telecallers: any[];
    if (sbData && sbData.telecallers.length > 0 && (!localTelecallers || sbUpdatedAt > localUpdatedAt)) {
      // Cloud registry is newer (e.g. serverless or added from another device)
      telecallers = sbData.telecallers;
      deletedNames = Array.from(new Set([...deletedNames, ...sbData.deletedNames]));
      storage.telecallers = telecallers;
      storage.deletedStaffNames = deletedNames;
      storage.staffUpdatedAt = sbData.updatedAt || new Date().toISOString();
      writeStorage(storage);
    } else if (localTelecallers) {
      telecallers = localTelecallers;
      // Only push local up to Supabase if local is strictly newer or Supabase had no record
      if (!sbData || localUpdatedAt > sbUpdatedAt) {
        await syncStaffToSupabase(telecallers, deletedNames, storage.staffUpdatedAt);
      }
    } else {
      telecallers = [...initialTelecallers];
      storage.telecallers = telecallers;
      storage.staffUpdatedAt = new Date().toISOString();
      writeStorage(storage);
      await syncStaffToSupabase(telecallers, deletedNames, storage.staffUpdatedAt);
    }

    const staffNames = Array.from(new Set(telecallers.map((t: any) => t.name).filter(Boolean)));

    return NextResponse.json(
      {
        success: true,
        count: telecallers.length,
        telecallers,
        staffNames,
        deletedStaffNames: deletedNames,
        updatedAt: storage.staffUpdatedAt || new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storage = readStorage();
    const sbData = await readStaffFromSupabase();
    const localUpdatedAt = storage.staffUpdatedAt ? Date.parse(storage.staffUpdatedAt) : 0;
    const sbUpdatedAt = sbData?.updatedAt ? Date.parse(sbData.updatedAt) : 0;

    let currentTelecallers =
      sbData && sbData.telecallers.length > 0 && sbUpdatedAt > localUpdatedAt
        ? sbData.telecallers
        : Array.isArray(storage.telecallers) && storage.telecallers.length > 0
        ? storage.telecallers
        : [...initialTelecallers];

    let deletedNames: string[] = Array.isArray(storage.deletedStaffNames)
      ? storage.deletedStaffNames
      : sbData?.deletedNames || [];

    if (body.telecallers && Array.isArray(body.telecallers)) {
      // Bulk update/replace
      currentTelecallers = body.telecallers;
    } else if (body.name) {
      // Single caller upsert
      const incomingName = body.name.trim();
      deletedNames = deletedNames.filter((n) => n.toLowerCase() !== incomingName.toLowerCase());
      const existingIdx = currentTelecallers.findIndex(
        (t: any) => t.name.toLowerCase() === incomingName.toLowerCase() || (body.id && t.id === body.id)
      );

      if (existingIdx >= 0) {
        const prev = currentTelecallers[existingIdx];
        currentTelecallers[existingIdx] = {
          ...prev,
          ...body,
          id: prev.id || body.id,
          name: incomingName,
          password: body.password !== undefined && String(body.password).trim() !== ""
            ? String(body.password).trim()
            : prev.password || "1234",
        };
      } else {
        const newId = body.id || `TC-${(currentTelecallers.length + 1).toString().padStart(3, "0")}`;
        currentTelecallers.push({
          id: newId,
          name: incomingName,
          phone: body.phone || "",
          email: body.email || `${incomingName.toLowerCase().replace(/\s+/g, "")}@wegrowjobz.com`,
          avatar: body.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          role: body.role || "Telecalling Executive",
          assignedLeads: body.assignedLeads || 0,
          dailyTarget: body.dailyTarget || 50,
          callsCompleted: body.callsCompleted || 0,
          connectedCalls: body.connectedCalls || 0,
          interestedLeads: body.interestedLeads || 0,
          followUpsCompleted: body.followUpsCompleted || 0,
          admissionsGenerated: body.admissionsGenerated || 0,
          conversionRate: body.conversionRate || 0,
          rank: currentTelecallers.length + 1,
          status: body.status || "Active",
          isPunchedIn: body.isPunchedIn ?? true,
          punchInTime: body.punchInTime || "09:30 AM",
          workingHours: body.workingHours || "0h 0m",
          password: (body.password && String(body.password).trim()) || "1234",
          mustChangePassword: body.mustChangePassword ?? false,
          isFrozen: body.isFrozen ?? false,
          lastLoginAt: body.lastLoginAt || "",
        });
      }
    }

    const nowIso = new Date().toISOString();
    storage.telecallers = currentTelecallers;
    storage.deletedStaffNames = deletedNames;
    storage.staffUpdatedAt = nowIso;
    writeStorage(storage);
    await syncStaffToSupabase(currentTelecallers, deletedNames, nowIso);

    const staffNames = Array.from(new Set(currentTelecallers.map((t: any) => t.name).filter(Boolean)));

    return NextResponse.json(
      {
        success: true,
        count: currentTelecallers.length,
        telecallers: currentTelecallers,
        staffNames,
        deletedStaffNames: deletedNames,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");
    const storage = readStorage();
    let currentTelecallers = Array.isArray(storage.telecallers)
      ? storage.telecallers
      : [...initialTelecallers];
    let deletedNames: string[] = Array.isArray(storage.deletedStaffNames)
      ? storage.deletedStaffNames
      : [];

    if (id || name) {
      const removed = currentTelecallers.filter((t: any) => {
        if (id && t.id === id) return true;
        if (name && t.name.toLowerCase() === name.toLowerCase()) return true;
        return false;
      });
      removed.forEach((r: any) => {
        if (r?.name && !deletedNames.some((d) => d.toLowerCase() === r.name.toLowerCase())) {
          deletedNames.push(r.name);
        }
      });
      if (name && !deletedNames.some((d) => d.toLowerCase() === name.toLowerCase())) {
        deletedNames.push(name);
      }

      currentTelecallers = currentTelecallers.filter((t: any) => {
        if (id && t.id === id) return false;
        if (name && t.name.toLowerCase() === name.toLowerCase()) return false;
        return true;
      });
      const nowIso = new Date().toISOString();
      storage.telecallers = currentTelecallers;
      storage.deletedStaffNames = deletedNames;
      storage.staffUpdatedAt = nowIso;
      writeStorage(storage);
      await syncStaffToSupabase(currentTelecallers, deletedNames, nowIso);
    }

    const staffNames = Array.from(new Set(currentTelecallers.map((t: any) => t.name).filter(Boolean)));

    return NextResponse.json(
      {
        success: true,
        count: currentTelecallers.length,
        telecallers: currentTelecallers,
        staffNames,
        deletedStaffNames: deletedNames,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
