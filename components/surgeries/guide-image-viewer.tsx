"use client";

import { useState } from "react";
import { Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const MIN = 0.5;
const MAX = 4;

/** Foto da guia com ampliar, reduzir, girar e tela cheia. */
export function GuideImageViewer({ src, className }: { src: string; className?: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [full, setFull] = useState(false);

  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));

  function renderControls(compact?: boolean) {
    const size = compact ? "h-8 w-8" : "h-9 w-9";
    return (
      <div className="flex items-center gap-1" role="toolbar" aria-label="Controles da imagem">
        <Button type="button" variant="outline" size="icon" className={size} aria-label="Reduzir" disabled={zoom <= MIN} onClick={() => setZoom((z) => clamp(z - 0.25))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-12 rounded px-1 text-xs tabular-nums text-muted-foreground hover:text-foreground"
          onClick={() => setZoom(1)}
          aria-label="Voltar ao tamanho original"
          title="Tamanho original"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button type="button" variant="outline" size="icon" className={size} aria-label="Ampliar" disabled={zoom >= MAX} onClick={() => setZoom((z) => clamp(z + 0.25))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" className={size} aria-label="Girar 90 graus" onClick={() => setRotation((r) => (r + 90) % 360)}>
          <RotateCw className="h-4 w-4" />
        </Button>
        {!compact ? (
          <Button type="button" variant="outline" size="icon" className={size} aria-label="Tela cheia" onClick={() => setFull(true)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    );
  }

  function renderPicture(tall?: boolean) {
    // Girada em 90/270°, a largura vira altura: reserva espaço para não cortar.
    const sideways = rotation % 180 !== 0;
    return (
      <div
        className={cn(
          "overflow-auto rounded-lg border border-border bg-muted/40",
          tall ? "h-full" : "max-h-72 lg:max-h-[calc(92vh-17rem)]"
        )}
      >
        <div className="flex min-h-full items-center justify-center p-2" style={{ minHeight: sideways ? `${zoom * 100}%` : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Foto da guia original"
            draggable={false}
            className="max-w-none select-none transition-transform"
            style={{
              width: `${zoom * 100}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center",
              margin: sideways ? `${zoom * 12}% 0` : undefined,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Guia original</p>
        {renderControls()}
      </div>
      {renderPicture()}

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="flex h-[96vh] max-h-[96vh] w-[calc(100%-1rem)] max-w-[96vw] flex-col gap-3 overflow-hidden p-3">
          <DialogTitle className="sr-only">Guia original em tela cheia</DialogTitle>
          <DialogDescription className="sr-only">Use os botões para ampliar, reduzir ou girar a imagem.</DialogDescription>
          <div className="flex items-center justify-between pr-10">
            <p className="text-sm font-semibold text-foreground">Guia original</p>
            {renderControls(true)}
          </div>
          <div className="min-h-0 flex-1">
            {renderPicture(true)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
