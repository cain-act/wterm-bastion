export interface AsciinemaHeader {
  version: number;
  width: number;
  height: number;
  timestamp: number;
  env?: Record<string, string>;
}

export type AsciinemaEvent = [number, "o", string];

export function parseAsciinemaCast(text: string): {
  header: AsciinemaHeader;
  events: AsciinemaEvent[];
  duration: number;
} | null {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return null;

  const header = JSON.parse(lines[0]) as AsciinemaHeader;
  const rawEvents = lines
    .slice(1)
    .map((line) => {
      try {
        return JSON.parse(line) as AsciinemaEvent;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as AsciinemaEvent[];

  let lastTime = 0;
  let timeOffset = 0;
  const events = rawEvents.map((ev) => {
    let t = ev[0] - timeOffset;
    const delta = t - lastTime;
    if (delta > 2.0) {
      const skip = delta - 2.0;
      timeOffset += skip;
      t -= skip;
    }
    lastTime = t;
    return [t, ev[1], ev[2]] as AsciinemaEvent;
  });

  return {
    header,
    events,
    duration: events.length > 0 ? events[events.length - 1][0] : 0,
  };
}

export function outputEventsUpTo(events: AsciinemaEvent[], time: number): string {
  let out = "";
  for (const ev of events) {
    if (ev[0] > time) break;
    if (ev[1] === "o") out += ev[2];
  }
  return out;
}

/** Pick a non-empty terminal snapshot for card previews. */
export function pickPreviewFrame(events: AsciinemaEvent[], duration: number): string {
  const times = [
    0,
    1,
    2,
    Math.min(5, duration),
    duration * 0.25,
    duration * 0.5,
    duration,
  ];
  const seen = new Set<number>();
  for (const raw of times) {
    const t = Math.max(0, raw);
    if (seen.has(t)) continue;
    seen.add(t);
    const out = outputEventsUpTo(events, t);
    if (out.replace(/\s/g, "").length > 0) return out;
  }
  return outputEventsUpTo(events, duration);
}
