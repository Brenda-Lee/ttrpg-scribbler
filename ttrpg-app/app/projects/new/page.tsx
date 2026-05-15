import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

async function createProject(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const systemId = String(formData.get("systemId") ?? "") || null;

  if (!title) throw new Error("Título é obrigatório.");

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      systemId,
      title,
      summary,
    },
  });

  await prisma.member.create({
    data: { userId: user.id, projectId: project.id, role: "DM" },
  });

  redirect(`/projects/${project.id}`);
}

export default async function NewProjectPage() {
  const systems = await prisma.system.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen px-8 py-10">
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/projects">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight">Novo projeto</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Crie uma campanha, romance ou compêndio de mundo.
        </p>

        <form action={createProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required placeholder="Ex: A Queda de Valoran" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemId">Sistema</Label>
            <select
              id="systemId"
              name="systemId"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sem sistema</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={4}
              placeholder="Um parágrafo descrevendo a premissa do projeto."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Criar projeto</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
