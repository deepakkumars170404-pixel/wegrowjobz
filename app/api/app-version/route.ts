import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "192.168.1.41:3001";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "http";
  
  // Clean host (remove port if needed for port 8080 or use host)
  const hostIp = host.split(":")[0];

  return NextResponse.json({
    appName: "WeGrow Telecaller & Jobz CRM",
    packageName: "com.wegrow.telecaller",
    versionCode: 2,
    versionName: "1.0.2",
    releaseDate: "2026-11-19",
    apkUrl: `http://${hostIp}:8080/WegrowTelecaller_Jobz.apk`,
    fallbackApkUrl: `${protocol}://${host}/api/download-apk`,
    forceUpdate: false,
    releaseNotes: [
      "⏱️ Accurate Talk Duration: Real cellular call talk time with seconds",
      "🔍 Job Roles Search: Instant filter across 40+ job profiles",
      "🎓 All-India Colleges Autocomplete",
      "⚡ Instant Sync: Web CRM auto-refreshes within 3 seconds of call save",
      "🔄 In-App Auto Update: Upgrade directly from app without reinstalling"
    ]
  });
}
