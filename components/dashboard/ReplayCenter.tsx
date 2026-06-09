"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clapperboard, Loader2, Play, Trash2 } from "lucide-react";
import { AsciinemaPlayer } from "@/components/AsciinemaPlayer";
import { AsciinemaPreview } from "@/components/AsciinemaPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { cn } from "@/lib/utils";

interface Recording {
  id: string;
  name: string;
  duration: number;
  created_at: string;
  connection_name: string;
  hostname: string;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ReplayCenter() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);

  const fetchRecordings = () => {
    setLoading(true);
    fetch("/api/recordings")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch recordings");
        return res.json();
      })
      .then((data) => {
        setRecordings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch recordings", err);
        setRecordings([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const deleteRecording = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this recording?")) return;

    fetch(`/api/recordings/${id}`, { method: "DELETE" })
      .then(() => fetchRecordings())
      .catch((err) => console.error("Failed to delete", err));
  };

  if (loading) {
    return (
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Session replays</h2>
        </div>
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading replays…
        </div>
      </section>
    );
  }

  if (recordings.length === 0) {
    return (
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Session replays</h2>
        </div>
        <EmptyState
          icon={<Clapperboard className="h-5 w-5" />}
          title="No recordings yet"
          description="Start recording from an SSH session toolbar to replay terminal output here."
        />
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium text-foreground">Session replays</h2>
            <p className="text-xs text-muted">{recordings.length} recording{recordings.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {recordings.map((recording) => (
          <Card
            key={recording.id}
            className="group cursor-pointer overflow-hidden transition-colors hover:border-primary/30"
            onClick={() => setActiveRecordingId(recording.id)}
          >
            <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-black">
              <AsciinemaPreview recordingId={recording.id} className="absolute inset-0" />
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                <div className="flex h-10 w-10 scale-90 items-center justify-center rounded-full bg-primary/90 text-primary-foreground opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100">
                  <Play className="ml-0.5 h-4 w-4" />
                </div>
              </div>
            </div>
            <CardContent className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {recording.name || recording.connection_name || "Untitled recording"}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {recording.connection_name || recording.hostname}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                  {" · "}
                  {formatDuration(recording.duration)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive",
                  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                )}
                onClick={(e) => deleteRecording(recording.id, e)}
                title="Delete recording"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeRecordingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-10">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
            <AsciinemaPlayer
              recordingId={activeRecordingId}
              onClose={() => setActiveRecordingId(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
