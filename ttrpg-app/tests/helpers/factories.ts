import { prisma } from "@/lib/db";

let counter = 0;
function uniq() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export async function makeUser(name = "Mestre Teste") {
  return prisma.user.create({
    data: { name, email: `${uniq()}@local` },
  });
}

export async function makeProject(
  ownerId: string,
  overrides: { title?: string; summary?: string; systemId?: string | null; status?: string } = {},
) {
  return prisma.project.create({
    data: {
      ownerId,
      title: overrides.title ?? "Projeto Teste",
      summary: overrides.summary ?? null,
      systemId: overrides.systemId ?? null,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function makeAct(projectId: string, title = "Ato 1", order = 0) {
  return prisma.act.create({ data: { projectId, title, order } });
}

export async function makeChapter(actId: string, title = "Capítulo 1", order = 0) {
  return prisma.chapter.create({ data: { actId, title, order } });
}

export async function makeScene(chapterId: string, title = "Cena 1", order = 0) {
  return prisma.scene.create({ data: { chapterId, title, order } });
}

export async function makeCharacter(projectId: string, name = "Sa'Elis", role = "PC") {
  return prisma.character.create({ data: { projectId, name, role } });
}

export async function makeLocation(projectId: string, name = "Valoran", parentId?: string) {
  return prisma.location.create({ data: { projectId, name, parentId } });
}

export async function makeItem(projectId: string, name = "Espelho de Anethel") {
  return prisma.item.create({ data: { projectId, name } });
}

export async function makeTag(projectId: string, name = "suspense", color = "#94a3b8") {
  return prisma.tag.create({ data: { projectId, name, color } });
}

export async function makeLore(
  projectId: string,
  overrides: { title?: string; category?: string; excerpt?: string | null; body?: string } = {},
) {
  return prisma.lore.create({
    data: {
      projectId,
      title: overrides.title ?? "Lore Teste",
      category: overrides.category ?? "OTHER",
      excerpt: overrides.excerpt ?? null,
      body: overrides.body ?? "",
    },
  });
}

export async function makeGlossaryTerm(
  projectId: string,
  overrides: { term?: string; slug?: string; definition?: string } = {},
) {
  const term = overrides.term ?? "Glamour";
  return prisma.glossaryTerm.create({
    data: {
      projectId,
      term,
      slug: overrides.slug ?? term.toLowerCase(),
      definition: overrides.definition ?? "Ilusão arcana.",
    },
  });
}

/**
 * Cria dois usuários: o "ativo" (será retornado por getCurrentUser pois é o mais antigo)
 * e um "outro" usuário. Útil para testar ownership.
 */
export async function makeTwoUsers() {
  const active = await makeUser("Usuário Ativo");
  // garante createdAt > active
  await new Promise((r) => setTimeout(r, 5));
  const other = await makeUser("Outro Usuário");
  return { active, other };
}
