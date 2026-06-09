import { AppShell } from "@/components/AppShell";
import { QuickConnectProvider } from "@/components/QuickConnectProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuickConnectProvider>
      <AppShell>{children}</AppShell>
    </QuickConnectProvider>
  );
}
