"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultPort } from "@/lib/utils";
import type { ConnectionProtocol } from "@/lib/protocols";
import { PROTOCOL_LABELS } from "@/lib/protocols";
import { Loader2, Zap } from "lucide-react";

const PROTOCOLS: ConnectionProtocol[] = ["ssh", "telnet", "vnc", "rdp"];

interface QuickConnectFormProps {
  variant?: "page" | "dialog";
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
}

export function QuickConnectForm({
  variant = "page",
  onSuccess,
  onCancel,
}: QuickConnectFormProps) {
  const router = useRouter();
  const [protocol, setProtocol] = useState<ConnectionProtocol>("ssh");
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState(String(defaultPort("ssh")));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "privateKey">("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onProtocolChange(next: ConnectionProtocol) {
    setProtocol(next);
    setPort(String(defaultPort(next)));
    if (next !== "ssh") setAuthMethod("password");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/quick-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol,
          hostname,
          port: parseInt(port, 10) || defaultPort(protocol),
          username: username || undefined,
          password: authMethod === "password" ? password : undefined,
          privateKey: authMethod === "privateKey" ? privateKey : undefined,
          macAddress: macAddress.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      if ((protocol === "vnc" || protocol === "rdp") && macAddress.trim()) {
        const wakeRes = await fetch(`/api/quick-connect/${data.id}/wake`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wait: true }),
        });
        const wakeData = await wakeRes.json();
        if (!wakeRes.ok) {
          setError(wakeData.error || "Wake failed");
          return;
        }
        if (!wakeData.ready) {
          setError("Host did not wake — on Ubuntu run: sudo ethtool -s eth0 wol g");
          return;
        }
      }

      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/connect/${data.id}`);
      }
    } catch {
      setError("Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Protocol</Label>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={protocol === p ? "secondary" : "outline"}
              onClick={() => onProtocolChange(p)}
              title={PROTOCOL_LABELS[p].hint}
            >
              {PROTOCOL_LABELS[p].label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted">{PROTOCOL_LABELS[protocol].hint}</p>
        {protocol === "telnet" && (
          <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-500">
            <strong>Warning:</strong> Telnet sends data (including credentials) in plaintext. Use only on trusted internal networks.
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
        <div className="space-y-1">
          <Label htmlFor="qc-host">Host</Label>
          <Input
            id="qc-host"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="192.168.1.10 or host.example.com"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qc-port">Port</Label>
          <Input
            id="qc-port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qc-user">
          Username
          {protocol === "vnc"
            ? " (macOS: use your Mac login name)"
            : protocol === "ssh"
              ? " (Ubuntu login name)"
              : ""}
        </Label>
        <Input
          id="qc-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required={protocol === "rdp"}
        />
      </div>

      {protocol === "ssh" && (
        <div className="space-y-1">
          <Label>Authentication</Label>
          <select
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as "password" | "privateKey")}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="password">Password</option>
            <option value="privateKey">Private key</option>
          </select>
        </div>
      )}

      {protocol === "ssh" && authMethod === "privateKey" ? (
        <div className="space-y-1">
          <Label htmlFor="qc-key">Private key</Label>
          <Textarea
            id="qc-key"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={4}
            required
            className="font-mono text-xs"
          />
        </div>
      ) : null}

      {(protocol === "ssh" || protocol === "telnet") && authMethod === "password" ? (
        <div className="space-y-1">
          <Label htmlFor="qc-pass">Password</Label>
          <Input
            id="qc-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={protocol === "ssh"}
          />
        </div>
      ) : null}

      {(protocol === "vnc" || protocol === "rdp") && (
        <>
          <div className="space-y-1">
            <Label htmlFor="qc-desktop-pass">Password</Label>
            <Input
              id="qc-desktop-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qc-mac">MAC address (optional, for wake-on-LAN)</Label>
            <Input
              id="qc-mac"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="aa:bb:cc:dd:ee:ff"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted">
              Sends a wake packet before connecting if the remote machine is asleep.
            </p>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className={variant === "dialog" ? "flex justify-end gap-2 pt-1" : ""}>
        {variant === "dialog" && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" className={variant === "page" ? "w-full" : ""} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect
        </Button>
      </div>
    </form>
  );

  if (variant === "dialog") {
    return form;
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-amber-400" />
          Quick connect
        </CardTitle>
        <p className="text-sm text-muted">
          Connect immediately without saving. You can save the connection later from the session.
        </p>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
}
