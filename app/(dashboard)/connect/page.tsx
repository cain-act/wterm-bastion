"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuickConnect } from "@/components/QuickConnectProvider";

export default function QuickConnectPage() {
  const router = useRouter();
  const { openQuickConnect } = useQuickConnect();

  useEffect(() => {
    openQuickConnect();
    router.replace("/");
  }, [openQuickConnect, router]);

  return null;
}
