"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldShellProps {
  htmlFor?: string;
  label?: string;
  fallbackLabel: string;
  unit?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  htmlFor,
  label,
  fallbackLabel,
  unit,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label ?? fallbackLabel}
        {unit ? (
          <span className="ml-1 text-muted-foreground/70">({unit})</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}
