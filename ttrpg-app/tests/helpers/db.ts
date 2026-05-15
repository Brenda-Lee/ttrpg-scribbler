import { prisma } from "@/lib/db";

export async function resetDb() {
  await prisma.chapterTag.deleteMany();
  await prisma.chapterCharacter.deleteMany();
  await prisma.glossaryTerm.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.lore.deleteMany();
  await prisma.event.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.act.deleteMany();
  await prisma.character.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.member.deleteMany();
  await prisma.project.deleteMany();
  await prisma.system.deleteMany();
  await prisma.user.deleteMany();
}
