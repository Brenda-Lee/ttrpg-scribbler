"use client";

import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldShell } from "./FieldShell";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface NumberFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

function toNumber(input: string): number | "" {
  if (input === "" || input === "-") return "";
  const n = Number(input);
  return Number.isFinite(n) ? n : "";
}

export function NumberField({ name, control, field }: NumberFieldProps) {
  return (
    <FieldShell
      htmlFor={name}
      label={field.label}
      fallbackLabel={field.id}
      unit={field.unit}
    >
      <Controller
        control={control}
        name={name}
        render={({ field: rhf }) => (
          <Input
            id={name}
            type="number"
            inputMode="decimal"
            value={
              typeof rhf.value === "number" && Number.isFinite(rhf.value)
                ? rhf.value
                : typeof rhf.value === "string"
                  ? rhf.value
                  : ""
            }
            onChange={(e) => {
              const next = toNumber(e.target.value);
              rhf.onChange(next);
            }}
            onBlur={rhf.onBlur}
            ref={rhf.ref}
          />
        )}
      />
    </FieldShell>
  );
}
