"use client";

import { Controller, type Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface CheckboxFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

export function CheckboxField({ name, control, field }: CheckboxFieldProps) {
  const labelText = field.label ?? field.id;
  return (
    <div className="flex items-center gap-2">
      <Controller
        control={control}
        name={name}
        render={({ field: rhf }) => (
          <Checkbox
            id={name}
            checked={Boolean(rhf.value)}
            onCheckedChange={(value) => rhf.onChange(value === true)}
            ref={rhf.ref}
          />
        )}
      />
      <Label htmlFor={name} className="text-sm">
        {labelText}
        {field.unit ? (
          <span className="ml-1 text-muted-foreground/70">({field.unit})</span>
        ) : null}
      </Label>
    </div>
  );
}
