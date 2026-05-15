import { redirect } from "next/navigation";
import { prisma } from "./db";

/**
 * Recupera o usuário ativo da requisição.
 *
 * - Em testes (AUTH_BYPASS=1), retorna o usuário mais antigo do banco
 *   — preserva o padrão usado pelos testes existentes sem precisar mockar `auth()`.
 * - Em produção/desenvolvimento, lê a sessão do NextAuth.
 *
 * Se a sessão referenciar um usuário que não existe mais (ex.: depois de
 * `db:reset`), invoca `redirect("/login?stale=1")` em vez de lançar.
 * Server Components e Server Actions tratam isso normalmente; route handlers
 * que envolvem esta chamada em try/catch devem re-lançar erros de redirect
 * (use {@link isAuthRedirect} para identificar).
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
    // Sessão válida (cookie/JWT intacto) mas o usuário sumiu do banco.
    // Força o caller a ir para o login — o cliente lá limpa o cookie via signOut.
    redirect("/login?stale=1");
  }
  return user;
}

/**
 * Identifica erros lançados por `redirect()` do Next.js — usado em catches
 * que tratam erros de autenticação para distinguir "não autenticado" (deve
 * virar 401) de "sessão expirada" (deve propagar o redirect).
 */
export function isAuthRedirect(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
