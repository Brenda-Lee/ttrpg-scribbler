"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, UserPlus } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "email_in_use") {
          setError("Já existe uma conta com este email.");
        } else if (data.error === "invalid") {
          setError("Verifique os campos (senha mínima de 6 caracteres).");
        } else {
          setError("Erro ao criar conta.");
        }
        return;
      }
      // Auto-login após criar
      const signRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!signRes || signRes.error) {
        router.push("/login");
        return;
      }
      router.push("/projects");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-5 p-6">
        <header className="space-y-1 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            TTRPG Scribbler
          </h1>
          <p className="text-sm text-muted-foreground">Crie sua conta.</p>
        </header>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            <UserPlus className="h-4 w-4" /> Criar conta
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  );
}
