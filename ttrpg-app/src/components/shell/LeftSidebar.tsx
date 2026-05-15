"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  User,
  MapPin,
  Package,
  Scroll,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, initials } from "@/lib/utils";
import { useWorkspace } from "@/stores/workspace";

type Entity = { id: string; name: string; role?: string };

type Props = {
  projectId: string;
  characters: Entity[];
  locations: Entity[];
  items: Entity[];
  lore: Entity[];
};

type SectionConfig = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  rootHref: string;
  items: Entity[];
  itemHref: (entity: Entity) => string;
};

export function LeftSidebar({ projectId, characters, locations, items, lore }: Props) {
  const collapsed = useWorkspace((s) => s.leftSidebarCollapsed);
  const toggle = useWorkspace((s) => s.toggleLeftSidebar);

  const sections: SectionConfig[] = [
    {
      key: "characters",
      title: "Personagens",
      icon: User,
      href: `/projects/${projectId}/characters`,
      rootHref: `/projects/${projectId}/characters`,
      items: characters,
      itemHref: (e) => `/projects/${projectId}/characters/${e.id}`,
    },
    {
      key: "locations",
      title: "Locais",
      icon: MapPin,
      href: `/projects/${projectId}/world`,
      rootHref: `/projects/${projectId}/world/locations`,
      items: locations,
      itemHref: (e) => `/projects/${projectId}/world/locations/${e.id}`,
    },
    {
      key: "items",
      title: "Itens",
      icon: Package,
      href: `/projects/${projectId}/world`,
      rootHref: `/projects/${projectId}/world/items`,
      items: items,
      itemHref: (e) => `/projects/${projectId}/world/items/${e.id}`,
    },
    {
      key: "lore",
      title: "Lore",
      icon: Scroll,
      href: `/projects/${projectId}/world`,
      rootHref: `/projects/${projectId}/world/lore`,
      items: lore,
      itemHref: (e) => `/projects/${projectId}/world/lore/${e.id}`,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "hidden h-full shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[3.25rem]" : "w-64",
        )}
        style={{
          // fallback caso a variável CSS --sidebar não esteja definida no tema
          backgroundColor: "hsl(var(--sidebar, var(--card)))",
        }}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center border-b px-2",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {!collapsed ? (
            <span className="px-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entidades
            </span>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-7 w-7"
                aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              >
                {collapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expandir" : "Recolher"}
            </TooltipContent>
          </Tooltip>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <nav
            className={cn(
              "flex flex-col gap-1 py-2",
              collapsed ? "px-1.5 items-center" : "px-2",
            )}
          >
            {sections.map((section) =>
              collapsed ? (
                <CollapsedSectionIcon key={section.key} section={section} />
              ) : (
                <SectionExpanded key={section.key} section={section} />
              ),
            )}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}

function SectionExpanded({ section }: { section: SectionConfig }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const Icon = section.icon;

  // Mantém aberto enquanto navega dentro da seção.
  useEffect(() => {
    if (pathname?.startsWith(section.rootHref)) setOpen(true);
  }, [pathname, section.rootHref]);

  return (
    <div className="flex flex-col">
      <div className="group flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{section.title}</span>
          <span className="text-[10px] font-normal text-muted-foreground/70">
            {section.items.length}
          </span>
        </button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <Link href={section.href} aria-label={`Adicionar em ${section.title}`}>
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      {open ? (
        <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-1">
          {section.items.length === 0 ? (
            <li className="px-2 py-1 text-[11px] italic text-muted-foreground/70">
              Vazio
            </li>
          ) : (
            section.items.map((entity) => {
              const href = section.itemHref(entity);
              const active = pathname === href;
              return (
                <li key={entity.id}>
                  <Link
                    href={href}
                    title={
                      entity.role ? `${entity.name} · ${entity.role}` : entity.name
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[9px]">
                        {initials(entity.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate">{entity.name}</p>
                      {entity.role ? (
                        <p className="truncate text-[10px] font-normal text-muted-foreground/80">
                          {entity.role}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

function CollapsedSectionIcon({ section }: { section: SectionConfig }) {
  const pathname = usePathname();
  const active = pathname?.startsWith(section.rootHref);
  const Icon = section.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={section.href}
          aria-label={section.title}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
            active
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        {section.title}
        <span className="ml-1.5 text-muted-foreground">({section.items.length})</span>
      </TooltipContent>
    </Tooltip>
  );
}
