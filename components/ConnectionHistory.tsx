"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { cn } from "@/lib/utils";
import { History, Monitor, Terminal, X } from "lucide-react";
import type { ConnectionProtocol } from "@/lib/protocols";

export interface HistoryItem {
  id: string;
  connection_id: string | null;
  quick_session_id?: string | null;
  connection_name: string | null;
  hostname: string | null;
  protocol: string;
  workspace_name?: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  is_live?: boolean;
}

function parseHistoryDate(value: string): Date {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized);
}

function sessionHref(item: HistoryItem): string | null {
  if (item.connection_id) {
    return `/session/${item.connection_id}?via=${item.protocol as ConnectionProtocol}`;
  }
  if (item.quick_session_id) {
    return `/connect/${item.quick_session_id}`;
  }
  return null;
}

function protocolBadgeVariant(protocol: string): "ssh" | "vnc" | "rdp" | "secondary" {
  if (protocol === "ssh" || protocol === "vnc" || protocol === "rdp") {
    return protocol;
  }
  return "secondary";
}

function ProtocolIcon({ protocol, className }: { protocol: string; className?: string }) {
  const Icon = protocol === "ssh" ? Terminal : Monitor;
  return <Icon className={className} />;
}

function SessionRow({
  item,
  onEnd,
  endingId,
}: {
  item: HistoryItem;
  onEnd?: (id: string) => void;
  endingId?: string | null;
}) {
  const href = sessionHref(item);
  const started = parseHistoryDate(item.started_at);
  const timeLabel = item.is_live
    ? "Live now"
    : formatDistanceToNow(started, { addSuffix: true });

  const content = (
    <>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          item.is_live ? "bg-emerald-500/10" : "bg-accent",
        )}
      >
        {item.is_live ?
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        : <ProtocolIcon protocol={item.protocol} className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground" title={item.connection_name || ""}>
            {item.connection_name || "Session"}
          </p>
          <Badge
            variant={protocolBadgeVariant(item.protocol)}
            className="shrink-0 px-1.5 py-0 font-mono text-[10px] uppercase"
          >
            {item.protocol}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground" title={item.hostname || ""}>
          {item.hostname || "—"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden text-[11px] text-muted sm:inline">{timeLabel}</span>
        {item.status === "active" && onEnd && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={endingId === item.id}
            title="End session"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEnd(item.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </>
  );

  const rowClass = cn(
    "group flex items-center gap-3 px-4 py-3 transition-colors",
    href && "hover:bg-accent/60",
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}

export function ConnectionHistory({
  activeItems,
  recentItems,
}: {
  activeItems: HistoryItem[];
  recentItems: HistoryItem[];
}) {
  const router = useRouter();
  const [endingId, setEndingId] = useState<string | null>(null);

  async function endSession(id: string) {
    if (!confirm("End this session? The connection will be disconnected if still active.")) {
      return;
    }
    setEndingId(id);
    try {
      const res = await fetch(`/api/history/${id}/end`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to end session");
        return;
      }
      router.refresh();
    } finally {
      setEndingId(null);
    }
  }

  const hasActive = activeItems.length > 0;
  const hasRecent = recentItems.length > 0;

  if (!hasActive && !hasRecent) {
    return (
      <Card className="lg:sticky lg:top-6">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Recent sessions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="No sessions yet"
            description="Connections you open will show up here for quick access."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader className="space-y-1 pb-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Recent sessions</CardTitle>
        </div>
        <p className="text-xs text-muted">
          {hasActive ?
            `${activeItems.length} active · ${recentItems.length} recent`
          : `${recentItems.length} recent`}
        </p>
      </CardHeader>

      <CardContent className="p-0 pt-3">
        {hasActive && (
          <div className="border-b border-border">
            <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
              Active
            </p>
            <div className="divide-y divide-border">
              {activeItems.map((item) => (
                <SessionRow
                  key={item.id}
                  item={item}
                  onEnd={endSession}
                  endingId={endingId}
                />
              ))}
            </div>
          </div>
        )}

        {hasRecent && (
          <div>
            {hasActive && (
              <p className="px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide text-muted">
                Recent
              </p>
            )}
            <div
              className={cn(
                "divide-y divide-border",
                !hasActive && "border-t border-border",
              )}
            >
              <div className="max-h-[min(52vh,480px)] overflow-y-auto overscroll-contain">
                {recentItems.map((item) => (
                  <SessionRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
