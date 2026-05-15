import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

type Props = {
  id: string;
  title: string;
  summary: string | null;
  systemName: string | null;
  status: string;
  sceneCount: number;
  characterCount: number;
};

export function ProjectCard({
  id,
  title,
  summary,
  systemName,
  status,
  sceneCount,
  characterCount,
}: Props) {
  return (
    <Link href={`/projects/${id}`} className="block group">
      <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              {title}
            </CardTitle>
            <Badge variant={status === "ACTIVE" ? "secondary" : "outline"}>
              {status === "ACTIVE" ? "Ativo" : "Arquivado"}
            </Badge>
          </div>
          {summary ? (
            <CardDescription className="line-clamp-3">{summary}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{systemName ?? "Sem sistema"}</span>
          <span>
            {sceneCount} cenas · {characterCount} personagens
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
