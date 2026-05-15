import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser, isAuthRedirect } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AllowedSpec = { ext: string; kind: "IMAGE" | "AUDIO"; maxBytes: number };

const ALLOWED = new Map<string, AllowedSpec>([
  ["image/png", { ext: ".png", kind: "IMAGE", maxBytes: 5 * 1024 * 1024 }],
  ["image/jpeg", { ext: ".jpg", kind: "IMAGE", maxBytes: 5 * 1024 * 1024 }],
  ["image/webp", { ext: ".webp", kind: "IMAGE", maxBytes: 5 * 1024 * 1024 }],
  ["audio/mpeg", { ext: ".mp3", kind: "AUDIO", maxBytes: 15 * 1024 * 1024 }],
  ["audio/wav", { ext: ".wav", kind: "AUDIO", maxBytes: 15 * 1024 * 1024 }],
  ["audio/x-wav", { ext: ".wav", kind: "AUDIO", maxBytes: 15 * 1024 * 1024 }],
  ["audio/ogg", { ext: ".ogg", kind: "AUDIO", maxBytes: 15 * 1024 * 1024 }],
]);

export async function POST(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    if (isAuthRedirect(err)) throw err;
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const intent = (form.get("kind") as string | null) ?? "misc";
  const projectIdRaw = form.get("projectId");
  const projectId = typeof projectIdRaw === "string" && projectIdRaw.length > 0 ? projectIdRaw : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const spec = ALLOWED.get(file.type);
  if (!spec) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (file.size > spec.maxBytes) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  // Confere ownership do projeto quando informado (usado para Asset)
  if (projectId) {
    const ok = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const subdir =
    intent === "map" ? "maps" : spec.kind === "AUDIO" ? "audio" : spec.kind === "IMAGE" ? "images" : "misc";
  const dir = path.resolve(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const fileName = `${crypto.randomBytes(12).toString("hex")}${spec.ext}`;
  const fullPath = path.join(dir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  const publicPath = `/uploads/${subdir}/${fileName}`;

  // Cria registro Asset quando o upload está associado a um projeto e o tipo é catalogável.
  let assetId: string | null = null;
  if (projectId && (spec.kind === "IMAGE" || spec.kind === "AUDIO")) {
    const asset = await prisma.asset.create({
      data: {
        projectId,
        kind: spec.kind,
        path: publicPath,
        mime: file.type,
        sizeBytes: file.size,
      },
      select: { id: true },
    });
    assetId = asset.id;
  }

  return NextResponse.json({ path: publicPath, assetId });
}
