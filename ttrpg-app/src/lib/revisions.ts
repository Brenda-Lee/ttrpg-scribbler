import { prisma } from "@/lib/db";

export const AUTO_RETENTION = 20;
const MIN_GAP_MS = 5 * 60 * 1000; // 5 minutos
const MIN_WORD_DIFF = 50;

type AutoRevisionInput = {
  sceneId: string;
  contentJson: string;
  contentText: string;
  wordCount: number;
};

/**
 * Cria uma revisão AUTO da cena se ao menos uma das condições for satisfeita:
 * - não existe revisão AUTO anterior;
 * - a última revisão AUTO é mais antiga que MIN_GAP_MS;
 * - a diferença de wordCount em relação à última AUTO é ≥ MIN_WORD_DIFF.
 *
 * Aplica pruning automático mantendo ≤ AUTO_RETENTION revisões AUTO.
 * Revisões MANUAL nunca são apagadas pelo pruning.
 */
export async function maybeCreateAutoRevision(
  input: AutoRevisionInput,
): Promise<{ created: boolean }> {
  const lastAuto = await prisma.sceneRevision.findFirst({
    where: { sceneId: input.sceneId, kind: "AUTO" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, wordCount: true },
  });

  const now = Date.now();
  const shouldCreate =
    !lastAuto ||
    now - lastAuto.createdAt.getTime() >= MIN_GAP_MS ||
    Math.abs(input.wordCount - lastAuto.wordCount) >= MIN_WORD_DIFF;

  if (!shouldCreate) return { created: false };

  await prisma.$transaction(async (tx) => {
    await tx.sceneRevision.create({
      data: {
        sceneId: input.sceneId,
        contentJson: input.contentJson,
        contentText: input.contentText,
        wordCount: input.wordCount,
        kind: "AUTO",
      },
    });
    const autos = await tx.sceneRevision.findMany({
      where: { sceneId: input.sceneId, kind: "AUTO" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (autos.length > AUTO_RETENTION) {
      const toDelete = autos.slice(AUTO_RETENTION).map((r) => r.id);
      await tx.sceneRevision.deleteMany({ where: { id: { in: toDelete } } });
    }
  });

  return { created: true };
}

/**
 * Decide se uma revisão AUTO deve ser criada — versão pura, testável,
 * sem efeito colateral. Útil em testes unitários.
 */
export function shouldCreateAutoRevision(args: {
  now: number;
  lastAuto: { createdAt: Date; wordCount: number } | null;
  currentWordCount: number;
  minGapMs?: number;
  minWordDiff?: number;
}): boolean {
  const gap = args.minGapMs ?? MIN_GAP_MS;
  const wordDiff = args.minWordDiff ?? MIN_WORD_DIFF;
  if (!args.lastAuto) return true;
  if (args.now - args.lastAuto.createdAt.getTime() >= gap) return true;
  if (Math.abs(args.currentWordCount - args.lastAuto.wordCount) >= wordDiff)
    return true;
  return false;
}

/**
 * Aplica pruning a uma lista de revisões mantendo:
 * - todas as MANUAL;
 * - as `retention` AUTO mais novas.
 * Retorna os IDs a serem removidos. Função pura, testável.
 */
export function pruneRevisions(
  revisions: Array<{ id: string; kind: string; createdAt: Date }>,
  retention = AUTO_RETENTION,
): string[] {
  const autos = revisions
    .filter((r) => r.kind === "AUTO")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (autos.length <= retention) return [];
  return autos.slice(retention).map((r) => r.id);
}
