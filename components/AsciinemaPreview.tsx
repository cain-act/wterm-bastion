"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";
import { createGhosttyCore } from "@/lib/ghostty/shared-core";
import {
  pickPreviewFrame,
  parseAsciinemaCast,
  type AsciinemaHeader,
} from "@/lib/recordings/parse-cast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type TermSize = { width: number; height: number };

function measureTerminalSize(termEl: HTMLElement): TermSize | null {
  const grid = termEl.querySelector(".term-grid");
  if (!grid) return null;

  const gridRect = grid.getBoundingClientRect();
  const cs = getComputedStyle(termEl);
  const padX =
    (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padY =
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

  const width = gridRect.width + padX;
  const height = gridRect.height + padY;
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}

export function AsciinemaPreview({
  recordingId,
  className,
}: {
  recordingId: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termWrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ghosttyCore, setGhosttyCore] = useState<any>(null);
  const [header, setHeader] = useState<AsciinemaHeader | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [termSize, setTermSize] = useState<TermSize | null>(null);
  const [scale, setScale] = useState(1);
  const paintedRef = useRef(false);
  const { ref: termRef, write, resize } = useTerminal();

  const updateScale = useCallback(() => {
    const container = containerRef.current;
    const termEl = termWrapRef.current?.querySelector(".wterm") as
      | HTMLElement
      | null;
    if (!container || !termEl) return;

    const measured = measureTerminalSize(termEl);
    if (!measured) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;

    setTermSize(measured);
    setScale(Math.min(cw / measured.width, ch / measured.height));
  }, []);

  useEffect(() => {
    let active = true;
    createGhosttyCore().then((core) => {
      if (active) setGhosttyCore(core);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    paintedRef.current = false;
    setReady(false);
    setHeader(null);
    setFrame(null);
    setLoading(true);
    setError(false);
    setTermSize(null);
    setScale(1);

    let cancelled = false;

    fetch(`/api/recordings/${recordingId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseAsciinemaCast(text);
        if (!parsed) throw new Error("Invalid recording");
        setHeader(parsed.header);
        setFrame(pickPreviewFrame(parsed.events, parsed.duration));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordingId]);

  useEffect(() => {
    if (!ready || !header || !frame || paintedRef.current) return;

    resize(header.width, header.height);
    write("\x1b[2J\x1b[3J\x1b[H");
    write(frame);
    paintedRef.current = true;

    const raf = requestAnimationFrame(() => {
      updateScale();
      requestAnimationFrame(updateScale);
    });
    return () => cancelAnimationFrame(raf);
  }, [ready, header, frame, resize, write, updateScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const ro = new ResizeObserver(() => updateScale());
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready, updateScale]);

  const showTerminal = ghosttyCore && header && !error;
  const scaledWidth = termSize ? termSize.width * scale : 0;
  const scaledHeight = termSize ? termSize.height * scale : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "recording-preview relative overflow-hidden bg-black",
        className,
      )}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 px-3 text-center">
          <p className="font-mono text-[10px] text-muted-foreground">
            Preview unavailable
          </p>
        </div>
      )}
      {showTerminal && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="pointer-events-none overflow-hidden"
            style={
              termSize
                ? { width: scaledWidth, height: scaledHeight }
                : { visibility: "hidden" }
            }
          >
            <div
              className="will-change-transform"
              style={
                termSize
                  ? {
                      width: termSize.width,
                      height: termSize.height,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }
                  : undefined
              }
            >
              <div ref={termWrapRef} className="recording-preview-terminal">
                <Terminal
                  core={ghosttyCore}
                  ref={termRef}
                  cols={header.width}
                  rows={header.height}
                  theme="black"
                  cursorBlink={false}
                  className="recording-preview-wterm"
                  style={{ height: "auto", width: "max-content" }}
                  onReady={() => setReady(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
