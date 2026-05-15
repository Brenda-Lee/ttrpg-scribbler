"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, LogIn } from "lucide-react";

export function LoginForm({
  from,
  error: initialError,
  stale,
}: {
  from?: string;
  error?: string;
  stale?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? "Credenciais inválidas." : null,
  );
  const [notice, setNotice] = useState<string | null>(
    stale ? "Sua sessão expirou (o usuário não existe mais). Entre novamente." : null,
  );

  // Quando a página foi aberta com ?stale=1, limpa o cookie da sessão antiga
  // do NextAuth no cliente sem redirect (já estamos na tela de login).
  useEffect(() => {
    if (!stale) return;
    signOut({ redirect: false }).catch(() => {
      // silencioso — o objetivo é apenas limpar o cookie inválido
    });
  }, [stale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError("Email ou senha incorretos.");
      return;
    }
    router.push(from || searchParams.get("from") || "/projects");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-5 p-6">
        <header className="space-y-1 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            TTRPG Scribbler
          </h1>
          <p className="text-sm text-muted-foreground">Entre na sua conta.</p>
        </header>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {notice ? (
            <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            <LogIn className="h-4 w-4" /> Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Sem conta?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </main>
  );
}
