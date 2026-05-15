"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  const p = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!p) throw new Error("Projeto não encontrado");
  return p.id;
}

export async function createAct(formData: FormData) {
  const projectId = await assertProjectOwner(String(formData.get("projectId")));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const last = await prisma.act.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });
  await prisma.act.create({
    data: { projectId, title, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/projects/${projectId}/write`);
}

export async function createChapter(formData: FormData) {
  const projectId = await assertProjectOwner(String(formData.get("projectId")));
  const actId = String(formData.get("actId"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const act = await prisma.act.findFirst({ where: { id: actId, projectId } });
  if (!act) throw new Error("Ato inválido");
  const last = await prisma.chapter.findFirst({
    where: { actId },
    orderBy: { order: "desc" },
  });
  await prisma.chapter.create({
    data: { actId, title, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/projects/${projectId}/write`);
}

export async function createScene(formData: FormData) {
  const projectId = await assertProjectOwner(String(formData.get("projectId")));
  const chapterId = String(formData.get("chapterId"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, act: { projectId } },
  });
  if (!chapter) throw new Error("Capítulo inválido");
  const last = await prisma.scene.findFirst({
    where: { chapterId },
    orderBy: { order: "desc" },
  });
  await prisma.scene.create({
    data: {
      chapterId,
      title,
      order: (last?.order ?? -1) + 1,
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      contentText: "",
    },
  });
  revalidatePath(`/projects/${projectId}/write`);
}
