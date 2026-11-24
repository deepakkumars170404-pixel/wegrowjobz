import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { initialTelecallers, initialUsers } from "@/data/dummy-data";

const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "crm_storage.json");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
    let telecallers = storage.telecallers;

    if (!telecallers || !Array.isArray(telecallers) || telecallers.length === 0) {
      telecallers = initialTelecallers;
      storage.telecallers = telecallers;
      writeStorage(storage);
    }

    const staffNames = Array.from(new Set(telecallers.map((t: any) => t.name).filter(Boolean)));

    return NextResponse.json(
      {
        success: true,
        count: telecallers.length,
        telecallers,
        staffNames,
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
    let currentTelecallers = Array.isArray(storage.telecallers) && storage.telecallers.length > 0
      ? storage.telecallers
      : [...initialTelecallers];

    if (body.telecallers && Array.isArray(body.telecallers)) {
      // Bulk update/replace
      currentTelecallers = body.telecallers;
    } else if (body.name) {
      // Single caller upsert
      const incomingName = body.name.trim();
      const existingIdx = currentTelecallers.findIndex(
        (t: any) => t.name.toLowerCase() === incomingName.toLowerCase() || (body.id && t.id === body.id)
      );

      if (existingIdx >= 0) {
        currentTelecallers[existingIdx] = {
          ...currentTelecallers[existingIdx],
          ...body,
          name: incomingName,
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
          password: body.password || "1234",
          mustChangePassword: body.mustChangePassword ?? false,
          isFrozen: body.isFrozen ?? false,
          lastLoginAt: body.lastLoginAt || "",
        });
      }
    }

    storage.telecallers = currentTelecallers;
    storage.staffUpdatedAt = new Date().toISOString();
    writeStorage(storage);

    const staffNames = Array.from(new Set(currentTelecallers.map((t: any) => t.name).filter(Boolean)));

    return NextResponse.json(
      {
        success: true,
        count: currentTelecallers.length,
        telecallers: currentTelecallers,
        staffNames,
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
