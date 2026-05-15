import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  // Garante que existe usuário (não é multi-tenant ainda, mas mantém autorização básica).
  try {
    await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as string | null) ?? "misc";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const subdir = kind === "map" ? "maps" : "misc";
  const dir = path.resolve(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const fileName = `${crypto.randomBytes(12).toString("hex")}${ext}`;
  const fullPath = path.join(dir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  const publicPath = `/uploads/${subdir}/${fileName}`;
  return NextResponse.json({ path: publicPath });
}
