import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; stale?: string }>;
}) {
  const sp = await searchParams;
  return <LoginForm from={sp.from} error={sp.error} stale={sp.stale === "1"} />;
}
