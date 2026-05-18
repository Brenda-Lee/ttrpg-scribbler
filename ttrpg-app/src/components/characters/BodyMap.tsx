"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  BODY_REGIONS,
  BODY_REGION_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  CONDITION_SEVERITIES,
  type BodyRegion,
  type ConditionSeverity,
} from "@/lib/bodyRegions";

export type Condition = {
  id: string;
  region: BodyRegion;
  severity: ConditionSeverity;
  description: string | null;
  modifiersJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModifierEntry = {
  field: string;
  delta: number;
  reason?: string;
};

type Props = {
  projectId: string;
  characterId: string;
  onConditionsChange?: (conditions: Condition[]) => void;
};

const SEVERITY_RANK: Record<ConditionSeverity, number> = {
  LIGHT: 0,
  MODERATE: 1,
  SEVERE: 2,
  CRITICAL: 3,
};

function parseModifiers(raw: string | null | undefined): ModifierEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m: unknown): m is ModifierEntry =>
          !!m &&
          typeof m === "object" &&
          typeof (m as { field?: unknown }).field === "string" &&
          typeof (m as { delta?: unknown }).delta === "number",
      )
      .map((m) => ({
        field: m.field,
        delta: m.delta,
        reason: m.reason,
      }));
  } catch {
    return [];
  }
}

export function BodyMap({ projectId, characterId, onConditionsChange }: Props) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerRegion, setPickerRegion] = useState<BodyRegion | null>(null);
  const [editing, setEditing] = useState<Condition | null>(null);
  const [modifying, setModifying] = useState<Condition | null>(null);

  const emit = useCallback(
    (rows: Condition[]) => {
      onConditionsChange?.(rows);
    },
    [onConditionsChange],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/characters/${projectId}/${characterId}/conditions`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { conditions: Condition[] };
      setConditions(data.conditions);
      emit(data.conditions);
    } finally {
      setLoading(false);
    }
  }, [projectId, characterId, emit]);

  useEffect(() => {
    load();
  }, [load]);

  const worstByRegion = useMemo(() => {
    const map = new Map<BodyRegion, ConditionSeverity>();
    for (const c of conditions) {
      const prev = map.get(c.region);
      if (!prev || SEVERITY_RANK[c.severity] > SEVERITY_RANK[prev]) {
        map.set(c.region, c.severity);
      }
    }
    return map;
  }, [conditions]);

  const countByRegion = useMemo(() => {
    const counts = new Map<BodyRegion, number>();
    for (const c of conditions) {
      counts.set(c.region, (counts.get(c.region) ?? 0) + 1);
    }
    return counts;
  }, [conditions]);

  async function createCondition(
    region: BodyRegion,
    severity: ConditionSeverity,
    description: string,
  ) {
    const res = await fetch(
      `/api/characters/${projectId}/${characterId}/conditions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          severity,
          description: description || undefined,
        }),
      },
    );
    if (!res.ok) {
      toast.error("Não foi possível salvar a condição.");
      return;
    }
    toast.success("Condição registrada.");
    await load();
    setPickerRegion(null);
  }

  async function updateCondition(
    id: string,
    patch: Partial<Pick<Condition, "severity" | "description">>,
  ) {
    const res = await fetch(
      `/api/characters/${projectId}/${characterId}/conditions/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    await load();
    setEditing(null);
  }

  async function saveModifiers(id: string, modifiers: ModifierEntry[] | null) {
    const res = await fetch(
      `/api/characters/${projectId}/${characterId}/conditions/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modifiersJson: modifiers }),
      },
    );
    if (!res.ok) {
      toast.error("Não foi possível salvar os modificadores.");
      return;
    }
    toast.success("Modificadores atualizados.");
    await load();
    setModifying(null);
  }

  async function removeCondition(id: string) {
    const res = await fetch(
      `/api/characters/${projectId}/${characterId}/conditions/${id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Condição removida.");
    await load();
    setEditing(null);
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Condições / Ferimentos{" "}
          {loading ? (
            <Loader2 className="inline h-3 w-3 animate-spin" />
          ) : null}
        </h3>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {CONDITION_SEVERITIES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLOR[s] }}
              />
              {SEVERITY_LABEL[s]}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
        <AnatomicalBody
          worstByRegion={worstByRegion}
          countByRegion={countByRegion}
          onSelectRegion={(r) => setPickerRegion(r)}
        />

        <div className="space-y-1.5">
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma condição registrada. Clique em uma região do mapa para
              adicionar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {conditions.map((c) => {
                const modifiers = parseModifiers(c.modifiersJson);
                return (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 rounded-md border px-2 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLOR[c.severity] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">
                          {BODY_REGION_LABEL[c.region]}
                        </span>
                        <Badge variant="secondary" className="text-[9px]">
                          {SEVERITY_LABEL[c.severity]}
                        </Badge>
                        {modifiers.length > 0 ? (
                          <Badge variant="outline" className="text-[9px]">
                            {modifiers.length} mod
                          </Badge>
                        ) : null}
                      </div>
                      {c.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditing(c)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModifying(c)}
                      >
                        Modificadores
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <NewConditionDialog
        region={pickerRegion}
        onCancel={() => setPickerRegion(null)}
        onConfirm={(severity, desc) => {
          if (pickerRegion) createCondition(pickerRegion, severity, desc);
        }}
      />

      <EditConditionDialog
        condition={editing}
        onCancel={() => setEditing(null)}
        onUpdate={updateCondition}
        onDelete={removeCondition}
      />

      <ModifiersDialog
        condition={modifying}
        onCancel={() => setModifying(null)}
        onSave={saveModifiers}
      />
    </section>
  );
}

function AnatomicalBody({
  worstByRegion,
  countByRegion,
  onSelectRegion,
}: {
  worstByRegion: Map<BodyRegion, ConditionSeverity>;
  countByRegion: Map<BodyRegion, number>;
  onSelectRegion: (r: BodyRegion) => void;
}) {
  function fillFor(region: BodyRegion): string {
    const sev = worstByRegion.get(region);
    return sev ? SEVERITY_COLOR[sev] : "#e5e7eb"; // gray-200
  }

  function strokeFor(region: BodyRegion): string {
    return worstByRegion.has(region) ? "#1f2937" : "#9ca3af";
  }

  const regionProps = (region: BodyRegion) => ({
    fill: fillFor(region),
    stroke: strokeFor(region),
    strokeWidth: 1.2,
    onClick: () => onSelectRegion(region),
    role: "button" as const,
    "aria-label": BODY_REGION_LABEL[region],
    "data-region": region,
    style: { cursor: "pointer" as const },
  });

  // Anatomical paths use rounded curves to approximate a human silhouette,
  // one path per region. Coordinates kept compact so the SVG can be reviewed
  // by hand and stays under ~80 columns per element. Layout:
  // - Left half = front view; Right half = back view.
  // - Head, neck, torso_front, torso_back are unique to one side.
  // - Arms/hands/legs/feet share the same region id across views — clicking
  //   any of them targets the same record (matches existing enum).

  function CountBadge({ region, cx, cy }: { region: BodyRegion; cx: number; cy: number }) {
    const count = countByRegion.get(region) ?? 0;
    if (count <= 1) return null;
    return (
      <g pointerEvents="none" data-testid={`badge-${region}`}>
        <circle cx={cx} cy={cy} r={7} fill="#0f172a" stroke="#ffffff" strokeWidth={1} />
        <text
          x={cx}
          y={cy + 3}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          fill="#ffffff"
        >
          {count}
        </text>
      </g>
    );
  }

  return (
    <div className="flex justify-center" data-testid="bodymap-svg-wrap">
      <svg
        viewBox="0 0 240 360"
        width={240}
        height={360}
        role="img"
        aria-label="Mapa de corpo (frente e costas)"
        className="select-none"
      >
        {/* ===== FRENTE ===== */}
        <text x="55" y="14" fontSize="9" fill="#6b7280" textAnchor="middle">
          Frente
        </text>
        {/* HEAD — oval (rounded) */}
        <path
          d="M55 18 C66 18, 72 28, 72 38 C72 48, 66 58, 55 58 C44 58, 38 48, 38 38 C38 28, 44 18, 55 18 Z"
          {...regionProps("HEAD")}
        />
        <CountBadge region="HEAD" cx={72} cy={22} />
        {/* NECK — trapezoid */}
        <path
          d="M48 58 L62 58 L65 70 L45 70 Z"
          {...regionProps("NECK")}
        />
        <CountBadge region="NECK" cx={68} cy={64} />
        {/* TORSO_FRONT — chest+abdomen silhouette */}
        <path
          d="M28 70 C30 68, 80 68, 82 70 L86 130 C86 150, 75 158, 55 158 C35 158, 24 150, 24 130 Z"
          {...regionProps("TORSO_FRONT")}
        />
        <CountBadge region="TORSO_FRONT" cx={86} cy={110} />
        {/* RIGHT_ARM (do personagem; à esquerda do observador) */}
        <path
          d="M24 76 C18 80, 14 100, 16 130 C17 142, 23 144, 29 142 L34 95 C34 88, 30 80, 24 76 Z"
          {...regionProps("RIGHT_ARM")}
        />
        <CountBadge region="RIGHT_ARM" cx={20} cy={110} />
        {/* LEFT_ARM */}
        <path
          d="M86 76 C92 80, 96 100, 94 130 C93 142, 87 144, 81 142 L76 95 C76 88, 80 80, 86 76 Z"
          {...regionProps("LEFT_ARM")}
        />
        <CountBadge region="LEFT_ARM" cx={94} cy={110} />
        {/* RIGHT_HAND */}
        <path
          d="M16 142 C12 142, 10 150, 14 156 C18 162, 28 160, 30 154 L30 144 C26 142, 20 141, 16 142 Z"
          {...regionProps("RIGHT_HAND")}
        />
        <CountBadge region="RIGHT_HAND" cx={32} cy={150} />
        {/* LEFT_HAND */}
        <path
          d="M94 142 C98 142, 100 150, 96 156 C92 162, 82 160, 80 154 L80 144 C84 142, 90 141, 94 142 Z"
          {...regionProps("LEFT_HAND")}
        />
        <CountBadge region="LEFT_HAND" cx={78} cy={150} />
        {/* RIGHT_LEG */}
        <path
          d="M28 158 C32 156, 50 156, 53 158 L52 250 C52 258, 46 260, 38 260 C30 260, 26 256, 26 250 Z"
          {...regionProps("RIGHT_LEG")}
        />
        <CountBadge region="RIGHT_LEG" cx={52} cy={210} />
        {/* LEFT_LEG */}
        <path
          d="M57 158 C60 156, 78 156, 82 158 L84 250 C84 256, 80 260, 72 260 C64 260, 58 258, 58 250 Z"
          {...regionProps("LEFT_LEG")}
        />
        <CountBadge region="LEFT_LEG" cx={86} cy={210} />
        {/* RIGHT_FOOT */}
        <path
          d="M26 260 C26 268, 32 276, 42 276 C50 276, 54 270, 54 264 L52 260 Z"
          {...regionProps("RIGHT_FOOT")}
        />
        <CountBadge region="RIGHT_FOOT" cx={56} cy={272} />
        {/* LEFT_FOOT */}
        <path
          d="M58 260 C58 270, 62 276, 70 276 C80 276, 86 268, 86 264 L84 260 Z"
          {...regionProps("LEFT_FOOT")}
        />
        <CountBadge region="LEFT_FOOT" cx={88} cy={272} />

        {/* ===== COSTAS ===== */}
        <text x="175" y="14" fontSize="9" fill="#6b7280" textAnchor="middle">
          Costas
        </text>
        {/* HEAD silhouette (decorative reflection) */}
        <path
          d="M175 18 C186 18, 192 28, 192 38 C192 48, 186 58, 175 58 C164 58, 158 48, 158 38 C158 28, 164 18, 175 18 Z"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={1}
          pointerEvents="none"
        />
        {/* NECK decorative */}
        <path
          d="M168 58 L182 58 L185 70 L165 70 Z"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={1}
          pointerEvents="none"
        />
        {/* TORSO_BACK */}
        <path
          d="M148 70 C150 68, 200 68, 202 70 L206 130 C206 150, 195 158, 175 158 C155 158, 144 150, 144 130 Z"
          {...regionProps("TORSO_BACK")}
        />
        <CountBadge region="TORSO_BACK" cx={206} cy={110} />
        {/* Decorative back arms/legs/feet (regions are shared with the front;
           we don't make these clickable to avoid double-handling). */}
        <path
          d="M144 76 C138 80, 134 100, 136 130 C137 142, 143 144, 149 142 L154 95 C154 88, 150 80, 144 76 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M206 76 C212 80, 216 100, 214 130 C213 142, 207 144, 201 142 L196 95 C196 88, 200 80, 206 76 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M136 142 C132 142, 130 150, 134 156 C138 162, 148 160, 150 154 L150 144 C146 142, 140 141, 136 142 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M214 142 C218 142, 220 150, 216 156 C212 162, 202 160, 200 154 L200 144 C204 142, 210 141, 214 142 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M148 158 C152 156, 170 156, 173 158 L172 250 C172 258, 166 260, 158 260 C150 260, 146 256, 146 250 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M177 158 C180 156, 198 156, 202 158 L204 250 C204 256, 200 260, 192 260 C184 260, 178 258, 178 250 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M146 260 C146 268, 152 276, 162 276 C170 276, 174 270, 174 264 L172 260 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M178 260 C178 270, 182 276, 190 276 C200 276, 206 268, 206 264 L204 260 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}

function NewConditionDialog({
  region,
  onCancel,
  onConfirm,
}: {
  region: BodyRegion | null;
  onCancel: () => void;
  onConfirm: (severity: ConditionSeverity, description: string) => void;
}) {
  const [severity, setSeverity] = useState<ConditionSeverity>("LIGHT");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (region) {
      setSeverity("LIGHT");
      setDescription("");
    }
  }, [region]);

  async function submit() {
    setPending(true);
    try {
      await onConfirm(severity, description);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!region} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nova condição{region ? ` em ${BODY_REGION_LABEL[region]}` : ""}
          </DialogTitle>
          <DialogDescription>
            Marque um dano ou condição nessa região (ex: corte, queimadura,
            atordoamento).
          </DialogDescription>
        </DialogHeader>
        <SeverityPicker value={severity} onChange={setSeverity} />
        <div className="space-y-1">
          <Label htmlFor="cond-desc">Descrição (opcional)</Label>
          <Textarea
            id="cond-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: corte profundo, sangrando lentamente"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditConditionDialog({
  condition,
  onCancel,
  onUpdate,
  onDelete,
}: {
  condition: Condition | null;
  onCancel: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Condition, "severity" | "description">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [severity, setSeverity] = useState<ConditionSeverity>("LIGHT");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (condition) {
      setSeverity(condition.severity);
      setDescription(condition.description ?? "");
    }
  }, [condition]);

  async function submit() {
    if (!condition) return;
    setPending(true);
    try {
      await onUpdate(condition.id, {
        severity,
        description: description || null,
      });
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!condition) return;
    setPending(true);
    try {
      await onDelete(condition.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!condition} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Editar condição
            {condition ? ` — ${BODY_REGION_LABEL[condition.region]}` : ""}
          </DialogTitle>
        </DialogHeader>
        <SeverityPicker value={severity} onChange={setSeverity} />
        <div className="space-y-1">
          <Label htmlFor="cond-edit-desc">Descrição</Label>
          <Textarea
            id="cond-edit-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModifiersDialog({
  condition,
  onCancel,
  onSave,
}: {
  condition: Condition | null;
  onCancel: () => void;
  onSave: (id: string, modifiers: ModifierEntry[] | null) => Promise<void>;
}) {
  const [rows, setRows] = useState<ModifierEntry[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (condition) {
      setRows(parseModifiers(condition.modifiersJson));
    }
  }, [condition]);

  function updateRow(index: number, patch: Partial<ModifierEntry>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { field: "", delta: 0, reason: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!condition) return;
    setPending(true);
    try {
      // Drop incomplete rows (empty `field`) silently before sending.
      const sanitized = rows.filter((r) => r.field.trim().length > 0);
      const payload = sanitized.length > 0 ? sanitized : null;
      await onSave(condition.id, payload);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!condition} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modificadores
            {condition ? ` — ${BODY_REGION_LABEL[condition.region]}` : ""}
          </DialogTitle>
          <DialogDescription>
            Cada modificador soma `delta` ao campo da ficha durante a derivação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rows.length === 0 ? (
            <p
              data-testid="modifiers-empty"
              className="rounded-md border border-dashed border-input/60 p-3 text-center text-sm text-muted-foreground"
            >
              Nenhum modificador. Use “Adicionar” para criar um.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[2fr_1fr_2fr_auto] items-end gap-2"
                  data-testid="modifier-row"
                >
                  <div className="space-y-1">
                    <Label
                      htmlFor={`mod-field-${index}`}
                      className="text-xs text-muted-foreground"
                    >
                      Campo
                    </Label>
                    <Input
                      id={`mod-field-${index}`}
                      value={row.field}
                      onChange={(e) =>
                        updateRow(index, { field: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`mod-delta-${index}`}
                      className="text-xs text-muted-foreground"
                    >
                      Delta
                    </Label>
                    <Input
                      id={`mod-delta-${index}`}
                      type="number"
                      value={row.delta}
                      onChange={(e) =>
                        updateRow(index, { delta: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`mod-reason-${index}`}
                      className="text-xs text-muted-foreground"
                    >
                      Motivo (opcional)
                    </Label>
                    <Input
                      id={`mod-reason-${index}`}
                      value={row.reason ?? ""}
                      onChange={(e) =>
                        updateRow(index, { reason: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    aria-label={`Remover modificador ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addRow}
            data-testid="modifiers-add"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeverityPicker({
  value,
  onChange,
}: {
  value: ConditionSeverity;
  onChange: (v: ConditionSeverity) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Severidade</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {CONDITION_SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={
              "rounded-md border px-2 py-1.5 text-xs transition-colors " +
              (value === s
                ? "border-primary bg-primary/10"
                : "border-input hover:bg-accent")
            }
          >
            <span
              aria-hidden
              className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: SEVERITY_COLOR[s] }}
            />
            {SEVERITY_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

// Re-export the canonical region list so consumers can ensure the SVG and
// the enum stay in sync if they ever need to enumerate regions in tests.
export { BODY_REGIONS };
