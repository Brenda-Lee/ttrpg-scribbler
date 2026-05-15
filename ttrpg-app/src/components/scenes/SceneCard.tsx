import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

type Props = {
  projectId: string;
  sceneId: string;
  title: string;
  snippet: string;
  status: string;
  wordCount: number;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  REVISING: "Revisão",
  DONE: "Pronto",
};

export function SceneCard({ projectId, sceneId, title, snippet, status, wordCount }: Props) {
  return (
    <Link href={`/projects/${projectId}/write/${sceneId}`}>
      <Card className="group cursor-pointer p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <div className="flex items-start justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium leading-tight">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            {title}
          </h4>
          <Badge variant="outline" className="text-[10px] font-normal">
            {statusLabel[status] ?? status}
          </Badge>
        </div>
        {snippet ? (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{snippet}</p>
        ) : (
          <p className="mt-1.5 text-xs italic text-muted-foreground/60">(cena vazia)</p>
        )}
        <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {wordCount} palavras
        </p>
      </Card>
    </Link>
  );
}
