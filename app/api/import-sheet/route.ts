import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Please provide a valid Google Sheet URL." }, { status: 400 });
    }

    // Extract Sheet ID from URL
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch || !sheetIdMatch[1]) {
      return NextResponse.json(
        { error: "Invalid Google Sheet link. Make sure the URL has '/spreadsheets/d/<sheetId>'." },
        { status: 400 }
      );
    }

    const sheetId = sheetIdMatch[1];

    // Extract GID (Sheet tab ID), default to 0
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    // Direct Google Docs CSV Export URL
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    // Server-side fetch with follow redirect
    const res = await fetch(exportUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return NextResponse.json(
          {
            error:
              "Google Sheet is private or cannot be accessed. Please change Share settings to 'Anyone with the link can view' and try again.",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Google Docs returned HTTP status ${res.status}. Please check permissions.` },
        { status: res.status }
      );
    }

    const csvText = await res.text();

    // Check if Google returned an HTML login page instead of CSV
    if (csvText.includes("<!DOCTYPE html>") || csvText.includes("<html") || csvText.includes("accounts.google.com")) {
      return NextResponse.json(
        {
          error:
            "Google Sheet requires sign-in. In Google Sheets, click 'Share' -> change 'Restricted' to 'Anyone with the link can view'.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      csvText,
      sheetId,
      gid,
    });
  } catch (err: any) {
    console.error("import-sheet error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch Google Sheet data. Please check network connection." },
      { status: 500 }
    );
  }
}
