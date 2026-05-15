"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  onRename?: () => void;
  onDelete?: () => void;
  size?: "sm" | "default";
  className?: string;
  /** Impede que cliques propaguem para um <Link> pai. */
  stopPropagation?: boolean;
};

export function EntityKebabMenu({
  onRename,
  onDelete,
  size = "sm",
  className,
  stopPropagation = false,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mais ações"
          className={cn(size === "sm" ? "h-7 w-7" : "h-8 w-8", className)}
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
          }}
          onPointerDown={(e) => {
            if (stopPropagation) e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {onRename ? (
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="h-3.5 w-3.5" />
            Renomear
          </DropdownMenuItem>
        ) : null}
        {onRename && onDelete ? <DropdownMenuSeparator /> : null}
        {onDelete ? (
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
