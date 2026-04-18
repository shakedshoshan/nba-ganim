import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <DashboardTopBar />
      {children}
    </div>
  );
}
