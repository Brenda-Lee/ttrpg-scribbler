"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { buildResolverSchema } from "@/lib/sheets/zodFromSchema";
import { derive } from "@/lib/sheets/derive";
import type { ConditionInput } from "@/lib/sheets/applyModifiers";
import type {
  BreakdownEntry,
  FieldValue,
  SheetField,
  SheetFormValues,
  SheetSchema,
} from "@/lib/sheets/types";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { useWorkspace } from "@/stores/workspace";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TextField } from "./fields/TextField";
import { TextareaField } from "./fields/TextareaField";
import { NumberField } from "./fields/NumberField";
import { CheckboxField } from "./fields/CheckboxField";
import { SelectField } from "./fields/SelectField";
import { RepeatingListField } from "./fields/RepeatingListField";

export interface SheetRendererProps {
  projectId: string;
  characterId: string;
  schema: SheetSchema;
  base: SheetFormValues;
  effective: Record<string, FieldValue>;
  breakdown: Record<string, BreakdownEntry[]>;
  conditions: ConditionInput[];
}

interface LiveDerivation {
  effective: Record<string, FieldValue>;
  breakdown: Record<string, BreakdownEntry[]>;
}

function topLevelDiff(
  previous: SheetFormValues,
  next: SheetFormValues,
): Partial<SheetFormValues> {
  const diff: Partial<SheetFormValues> = {};
  for (const key of Object.keys(next)) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      diff[key] = next[key];
    }
  }
  return diff;
}

function formatDerivedValue(value: FieldValue | undefined): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "number") {
    return Number.isNaN(value) ? "—" : String(value);
  }
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function DerivedRow({
  field,
  value,
  breakdown,
}: {
  field: SheetField;
  value: FieldValue | undefined;
  breakdown?: BreakdownEntry[];
}) {
  const entries = breakdown ?? [];
  const hasEntries = entries.length > 0;
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {field.label ?? field.id}
        {field.unit ? (
          <span className="ml-1 text-muted-foreground/70">({field.unit})</span>
        ) : null}
      </Label>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-testid={`derived-${field.id}`}
              data-readonly="true"
              tabIndex={0}
              className="flex h-10 items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2 text-sm cursor-help"
            >
              <span>{formatDerivedValue(value)}</span>
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
                  const tag =
                    entry.source === "formula"
                      ? "Fórmula"
                      : entry.source === "preset"
                        ? "Condição"
                        : "Modificador";
                  const delta =
                    typeof entry.delta === "number"
                      ? `${entry.delta >= 0 ? "+" : ""}${entry.delta}`
                      : null;
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
    </div>
  );
}

function FieldDispatcher({
  field,
  control,
  derivation,
}: {
  field: SheetField;
  control: Control<SheetFormValues>;
  derivation: LiveDerivation;
}) {
  switch (field.type) {
    case "text":
      return <TextField name={field.id} control={control} field={field} />;
    case "textarea":
      return (
        <TextareaField name={field.id} control={control} field={field} />
      );
    case "number":
      return <NumberField name={field.id} control={control} field={field} />;
    case "checkbox":
      return (
        <CheckboxField name={field.id} control={control} field={field} />
      );
    case "select":
      return <SelectField name={field.id} control={control} field={field} />;
    case "repeating-list":
      return (
        <RepeatingListField name={field.id} control={control} field={field} />
      );
    case "derived":
      return (
        <DerivedRow
          field={field}
          value={derivation.effective[field.id]}
          breakdown={derivation.breakdown[field.id]}
        />
      );
    default:
      return null;
  }
}

export function SheetRenderer({
  projectId,
  characterId,
  schema,
  base,
  conditions,
}: SheetRendererProps) {
  const resolverSchema = useMemo(
    () => buildResolverSchema(schema),
    [schema],
  );

  // RHF's deep `FieldValues` inference blows up on the recursive `FieldValue`
  // type; widen here and re-narrow via the `Control<SheetFormValues>` cast
  // when passing into field components.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    defaultValues: base,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(resolverSchema as any),
    mode: "onChange",
  });
  const watched = useWatch({ control: form.control }) as
    | Record<string, FieldValue>
    | undefined;

  const liveBase = useMemo<SheetFormValues>(() => {
    return { ...base, ...(watched ?? {}) } as SheetFormValues;
  }, [base, watched]);

  const derivation = useMemo<LiveDerivation>(() => {
    const { effective, breakdown } = derive(liveBase, conditions, schema);
    return { effective, breakdown };
  }, [liveBase, conditions, schema]);

  const setSaveStatus = useWorkspace((s) => s.setSaveStatus);
  const setLastSavedAt = useWorkspace((s) => s.setLastSavedAt);
  const lastPersistedRef = useRef<SheetFormValues>(base);

  const autosave = useDebouncedAutosave<Partial<SheetFormValues>>({
    delayMs: 800,
    onSave: async (patch) => {
      if (Object.keys(patch).length === 0) return;
      const res = await fetch(
        `/api/characters/${projectId}/${characterId}/sheet`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patch }),
        },
      );
      if (!res.ok) {
        toast.error("Failed to save sheet");
        throw new Error(`save failed: ${res.status}`);
      }
      lastPersistedRef.current = {
        ...lastPersistedRef.current,
        ...patch,
      } as SheetFormValues;
      setLastSavedAt(Date.now());
    },
    onStatus: setSaveStatus,
  });
  const scheduleRef = useRef(autosave.schedule);
  scheduleRef.current = autosave.schedule;

  useEffect(() => {
    const diff = topLevelDiff(lastPersistedRef.current, liveBase);
    if (Object.keys(diff).length === 0) return;
    scheduleRef.current(diff);
  }, [liveBase]);

  return (
    <form className="flex flex-col gap-8">
      {schema.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h3>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            data-testid={`section-${section.id}`}
          >
            {section.fields.map((field) => (
              <FieldDispatcher
                key={field.id}
                field={field}
                control={form.control as unknown as Control<SheetFormValues>}
                derivation={derivation}
              />
            ))}
          </div>
        </section>
      ))}
    </form>
  );
}
