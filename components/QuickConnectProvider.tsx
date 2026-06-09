"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { QuickConnectForm } from "@/components/QuickConnectForm";

interface QuickConnectContextValue {
  openQuickConnect: () => void;
}

const QuickConnectContext = createContext<QuickConnectContextValue | null>(null);

export function useQuickConnect() {
  const ctx = useContext(QuickConnectContext);
  if (!ctx) {
    throw new Error("useQuickConnect must be used within QuickConnectProvider");
  }
  return ctx;
}

export function QuickConnectProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const openQuickConnect = useCallback(() => setOpen(true), []);

  const handleSuccess = useCallback(
    (sessionId: string) => {
      setOpen(false);
      router.push(`/connect/${sessionId}`);
    },
    [router],
  );

  const value = useMemo(() => ({ openQuickConnect }), [openQuickConnect]);

  return (
    <QuickConnectContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Quick connect"
        description="Connect immediately without saving. You can save the connection later from the session toolbar."
        className="max-w-xl"
      >
        <QuickConnectForm variant="dialog" onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </Dialog>
    </QuickConnectContext.Provider>
  );
}
