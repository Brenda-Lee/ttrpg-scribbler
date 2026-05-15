import { prisma } from "./db";

/**
 * Recupera o usuário ativo da requisição.
 *
 * - Em testes (AUTH_BYPASS=1), retorna o usuário mais antigo do banco
 *   — preserva o padrão usado pelos testes existentes sem precisar mockar `auth()`.
 * - Em produção/desenvolvimento, lê a sessão do NextAuth.
 */
export async function getCurrentUser() {
  if (process.env.AUTH_BYPASS === "1") {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) {
      throw new Error(
        "Nenhum usuário no banco de testes. Use as factories para criar antes do teste.",
      );
    }
    return user;
  }

  const { auth } = await import("@/auth");
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new Error("Não autenticado.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuário da sessão não existe mais.");
  }
  return user;
}
