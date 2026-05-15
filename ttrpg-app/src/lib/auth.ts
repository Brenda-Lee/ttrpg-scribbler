import { prisma } from "./db";

/**
 * MVP single-user: retorna sempre o usuário "owner" semeado.
 * Quando NextAuth entrar (fase pós-MVP), basta substituir esta função.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error(
      "Nenhum usuário encontrado. Rode `npm run db:seed` para inicializar.",
    );
  }
  return user;
}
