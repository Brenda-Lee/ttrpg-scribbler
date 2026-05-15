"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, MapPin, X, Loader2 } from "lucide-react";

export type Marker = { id: string; x: number; y: number; label: string };

export type MapData = {
  imagePath?: string;
  markers?: Marker[];
};

export function LocationMap({
  projectId,
  locationId,
  initialMap,
  baseMeta,
}: {
  projectId: string;
  locationId: string;
  initialMap: MapData;
  /** Outros campos do metaJson, preservados ao salvar. */
  baseMeta: Record<string, unknown>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const [imagePath, setImagePath] = useState<string | undefined>(initialMap.imagePath);
  const [markers, setMarkers] = useState<Marker[]>(initialMap.markers ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  async function persist(next: MapData) {
    setSaving(true);
    try {
      const meta = { ...baseMeta, map: next };
      const res = await fetch(`/api/world/${projectId}/location/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaJson: meta }),
      });
      if (!res.ok) {
        alert("Erro ao salvar mapa.");
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("kind", "map");
      const res = await fetch(`/api/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Falha no upload: ${err.error ?? res.status}`);
        return;
      }
      const data = (await res.json()) as { path: string };
      setImagePath(data.path);
      setMarkers([]); // reset markers on new map
      await persist({ imagePath: data.path, markers: [] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onClickImage(e: React.MouseEvent<HTMLDivElement>) {
    if (!imagePath) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newMarker: Marker = {
      id: crypto.randomUUID(),
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
      label: "",
    };
    const next = [...markers, newMarker];
    setMarkers(next);
    setSelectedId(newMarker.id);
    setLabelDraft("");
    persist({ imagePath, markers: next });
  }

  async function updateMarker(id: string, patch: Partial<Marker>) {
    const next = markers.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setMarkers(next);
    await persist({ imagePath, markers: next });
  }

  async function removeMarker(id: string) {
    const next = markers.filter((m) => m.id !== id);
    setMarkers(next);
    if (selectedId === id) setSelectedId(null);
    await persist({ imagePath, markers: next });
  }

  async function removeImage() {
    setImagePath(undefined);
    setMarkers([]);
    setSelectedId(null);
    await persist({ imagePath: undefined, markers: [] });
  }

  const selected = markers.find((m) => m.id === selectedId) ?? null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Mapa
          </h3>
          {imagePath ? (
            <p className="text-xs text-muted-foreground">
              Clique na imagem para adicionar um marcador. Clique em um marcador para editar.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {imagePath ? "Trocar imagem" : "Carregar mapa"}
          </Button>
          {imagePath ? (
            <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
              <X className="h-3.5 w-3.5" /> Remover
            </Button>
          ) : null}
        </div>
      </div>

      {!imagePath ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Sem mapa carregado. Envie uma imagem (PNG/JPG/WEBP, até 5 MB).
        </div>
      ) : (
        <div className="space-y-3">
          <div
            ref={imgWrapRef}
            onClick={onClickImage}
            className="relative w-full overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt="Mapa do local"
              className="block w-full select-none"
              draggable={false}
            />
            {markers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(m.id);
                  setLabelDraft(m.label);
                }}
                className={
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow ring-2 ring-amber-500/40 transition-transform hover:scale-110 " +
                  (selectedId === m.id ? "h-5 w-5 scale-110" : "h-4 w-4")
                }
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                aria-label={m.label || "Marcador sem rótulo"}
                title={m.label || "(sem rótulo)"}
              />
            ))}
          </div>

          {selected ? (
            <div className="flex items-end gap-2 rounded-lg border bg-card/40 p-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="marker-label" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Marcador selecionado
                </Label>
                <Input
                  id="marker-label"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={() => {
                    if (selected.label !== labelDraft) {
                      updateMarker(selected.id, { label: labelDraft });
                    }
                  }}
                  placeholder="Ex: portão norte, taverna do Olho"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMarker(selected.id)}
                aria-label="Remover marcador"
                className="text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {markers.length} marcador{markers.length === 1 ? "" : "es"} no mapa.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
