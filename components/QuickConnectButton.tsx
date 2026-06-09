"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useQuickConnect } from "@/components/QuickConnectProvider";

export function QuickConnectButton({
  children,
  onClick,
  ...props
}: ButtonProps) {
  const { openQuickConnect } = useQuickConnect();

  return (
    <Button
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) openQuickConnect();
      }}
    >
      {children}
    </Button>
  );
}
