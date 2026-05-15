import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/projects"];
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  if (isProtected && !req.auth) {
    const url = nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // raiz e demais rotas continuam livres
  return NextResponse.next();
});

export const config = {
  // Não roda em assets estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
