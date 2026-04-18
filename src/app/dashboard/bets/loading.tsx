import { PageContainer } from "@/components/ui/page-container";

export default function BetsLoading() {
  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer className="flex flex-col gap-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-48 animate-pulse rounded-xl border border-border bg-surface-muted" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-muted" />
      </PageContainer>
    </main>
  );
}
