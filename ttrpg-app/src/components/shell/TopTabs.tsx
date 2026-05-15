"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PenLine,
  Users,
  Map,
  BookA,
  Clock,
  FileDown,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

type Tab = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function TopTabs({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs: Tab[] = [
    { href: `${base}/write`, label: "Escrita", icon: PenLine },
    { href: `${base}/characters`, label: "Personagens", icon: Users },
    { href: `${base}/world`, label: "Mundo", icon: Map },
    { href: `${base}/glossary`, label: "Glossário", icon: BookA },
    { href: `${base}/timeline`, label: "Linha do tempo", icon: Clock },
    { href: `${base}/export`, label: "Exportar", icon: FileDown },
  ];

  return (
    <header className="flex h-12 items-center gap-4 border-b bg-card px-3">
      <Link
        href="/projects"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="max-w-[180px] truncate font-medium text-foreground">{projectTitle}</span>
      </Link>
      <nav className="flex items-center gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="Configurações do projeto">
          <Link href={`${base}/settings`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
