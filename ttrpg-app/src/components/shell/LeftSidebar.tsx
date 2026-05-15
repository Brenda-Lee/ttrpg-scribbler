"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, User, MapPin, Package, Scroll } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";

type Entity = { id: string; name: string; role?: string };

type Props = {
  projectId: string;
  characters: Entity[];
  locations: Entity[];
  items: Entity[];
  lore: Entity[];
};

export function LeftSidebar({ projectId, characters, locations, items, lore }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          <Section
            title="Personagens"
            count={characters.length}
            icon={User}
            href={`/projects/${projectId}/characters`}
          >
            {characters.map((c) => (
              <EntityRow
                key={c.id}
                href={`/projects/${projectId}/characters/${c.id}`}
                name={c.name}
                badge={c.role}
              />
            ))}
          </Section>
          <Section
            title="Locais"
            count={locations.length}
            icon={MapPin}
            href={`/projects/${projectId}/world`}
          >
            {locations.map((l) => (
              <EntityRow
                key={l.id}
                href={`/projects/${projectId}/world/locations/${l.id}`}
                name={l.name}
              />
            ))}
          </Section>
          <Section
            title="Itens"
            count={items.length}
            icon={Package}
            href={`/projects/${projectId}/world`}
          >
            {items.map((i) => (
              <EntityRow
                key={i.id}
                href={`/projects/${projectId}/world/items/${i.id}`}
                name={i.name}
              />
            ))}
          </Section>
          <Section
            title="Lore"
            count={lore.length}
            icon={Scroll}
            href={`/projects/${projectId}/lore`}
          >
            {lore.map((l) => (
              <EntityRow
                key={l.id}
                href={`/projects/${projectId}/world/lore/${l.id}`}
                name={l.name}
                badge={l.role}
              />
            ))}
          </Section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Icon className="h-3.5 w-3.5" />
          {title}
          <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">{count}</span>
        </button>
        <Button asChild variant="ghost" size="icon" className="h-6 w-6">
          <Link href={href} aria-label={`Adicionar em ${title}`}>
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      {open && (
        <div className="mt-1 space-y-0.5">
          {children}
          {/* (empty state inline) */}
        </div>
      )}
    </div>
  );
}

function EntityRow({
  href,
  name,
  badge,
}: {
  href: string;
  name: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate">{name}</span>
      {badge ? (
        <Badge variant="outline" className="text-[10px] font-normal">
          {badge}
        </Badge>
      ) : null}
    </Link>
  );
}
