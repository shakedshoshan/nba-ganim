import { CreateGroupForm } from "@/app/dashboard/groups/new/create-group-form";
import { PageContainer } from "@/components/ui/page-container";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create group",
};

export default function NewGroupPage() {
  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer>
        <Link
          href="/dashboard/groups"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to groups
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Create a group
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          You will become the group creator. You can rename the group, share an
          invite link, regenerate the link if it leaks, and remove members.
        </p>
        <CreateGroupForm />
      </PageContainer>
    </main>
  );
}
