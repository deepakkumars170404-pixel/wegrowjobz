import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "192.168.1.41:3001";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "http";
  
  // Clean host (remove port if needed for port 8080 or use host)
  const hostIp = host.split(":")[0];

  return NextResponse.json({
    appName: "WeGrow Telecaller & Jobz CRM",
    packageName: "com.wegrow.telecaller",
    versionCode: 3,
    versionName: "1.0.3",
    releaseDate: "2026-11-19",
    apkUrl: `http://${hostIp}:8080/WegrowJobz.apk`,
    fallbackApkUrl: `${protocol}://${host}/api/download-apk`,
    forceUpdate: false,
    releaseNotes: [
      "🕒 Live Clock & Step Adjuster: Real-time clock with +/-1s, +/-5s, +/-10s and presets",
      "🔄 Dual Dialer Switch: Automatic WeGrow Dialer for Admission and Google Dialer for Jobz",
      "👤 Caller Identity Chips: One-tap staff selection before saving outcome",
      "⚡ Instant Supabase Sync: All calls saved live without offline queue"
    ]
  });
}
