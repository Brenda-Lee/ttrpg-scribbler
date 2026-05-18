"use client";

import { useWatch, type Control } from "react-hook-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { FieldShell } from "./FieldShell";
import type {
  BreakdownEntry,
  FieldValue,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface DerivedFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

function formatValue(value: FieldValue | undefined): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "—";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatDelta(entry: BreakdownEntry): string | null {
  if (typeof entry.delta !== "number") return null;
  const sign = entry.delta >= 0 ? "+" : "";
  return `${sign}${entry.delta}`;
}

export function DerivedField({
  name,
  control,
  field,
  breakdown,
}: DerivedFieldProps) {
  const value = useWatch({
    control,
    name,
  }) as FieldValue | undefined;
  const entries = breakdown ?? [];
  const hasEntries = entries.length > 0;

  return (
    <FieldShell label={field.label} fallbackLabel={field.id} unit={field.unit}>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-testid={`derived-${name}`}
              data-readonly="true"
              tabIndex={0}
              className="flex h-10 items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2 text-sm cursor-help"
            >
              <span>{formatValue(value)}</span>
              {hasEntries ? (
                <Info
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
              ) : null}
            </div>
          </TooltipTrigger>
          {hasEntries ? (
            <TooltipContent className="max-w-xs">
              <ul className="flex flex-col gap-1">
                {entries.map((entry, index) => {
                  const delta = formatDelta(entry);
                  const tag =
                    entry.source === "formula"
                      ? "Fórmula"
                      : entry.source === "preset"
                        ? "Condição"
                        : "Modificador";
                  const reason = entry.reason ?? "";
                  return (
                    <li
                      key={`${entry.source}-${index}`}
                      className="flex gap-2 text-xs"
                    >
                      <span className="font-medium">{tag}</span>
                      {delta ? <span>{delta}</span> : null}
                      {reason ? <span>· {reason}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </TooltipContent>
          ) : null}
        </Tooltip>
      </TooltipProvider>
    </FieldShell>
  );
}
