import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  let apkPath = path.resolve(process.cwd(), "WegrowJobz.apk");
  if (!fs.existsSync(apkPath)) {
    apkPath = path.resolve(process.cwd(), "WegrowTelecaller_Jobz.apk");
  }

  if (!fs.existsSync(apkPath)) {
    return NextResponse.json({ error: "APK build not found on server" }, { status: 404 });
  }

  const fileStat = fs.statSync(apkPath);
  const fileStream = fs.createReadStream(apkPath);

  // Convert Node readable stream to Web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk) => controller.enqueue(chunk));
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="WegrowJobz.apk"',
      "Content-Length": fileStat.size.toString(),
      "Cache-Control": "no-cache",
    },
  });
}
