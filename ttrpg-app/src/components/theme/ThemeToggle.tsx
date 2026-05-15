"use client";

import { Moon, Sun, BookOpen, Check } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: Array<{ value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "sepia", label: "Sépia", icon: BookOpen },
];

export function ThemeToggle({ size = "icon" }: { size?: "icon" | "default" }) {
  const { theme, setTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[1];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={size === "icon" ? "icon" : "sm"} aria-label="Tema">
          <CurrentIcon className="h-4 w-4" />
          {size !== "icon" ? <span>{current.label}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = opt.value === theme;
          return (
            <DropdownMenuItem key={opt.value} onSelect={() => setTheme(opt.value)}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{opt.label}</span>
              {active ? <Check className="h-3.5 w-3.5 text-muted-foreground" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
