"use client";

import { Controller, type Control } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FieldShell } from "./FieldShell";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface TextareaFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

export function TextareaField({ name, control, field }: TextareaFieldProps) {
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
          <Textarea
            id={name}
            value={typeof rhf.value === "string" ? rhf.value : ""}
            onChange={(e) => rhf.onChange(e.target.value)}
            onBlur={rhf.onBlur}
            ref={rhf.ref}
            rows={4}
          />
        )}
      />
    </FieldShell>
  );
}
