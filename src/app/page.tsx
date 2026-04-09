import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function Home() {
  const cookieStore = await cookies();
  let seriesCount: number | null = null;
  let dbMessage: string | null = null;
  let userEmail: string | null = null;

  try {
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    const { count, error } = await supabase
      .from("series")
      .select("*", { count: "exact", head: true });

    if (error) {
      dbMessage = error.message;
    } else {
      seriesCount = count ?? 0;
    }
  } catch (e) {
    dbMessage = e instanceof Error ? e.message : "Supabase configuration error";
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-4xl font-bold text-red-500">NBA Playoff Challenge</h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
          {userEmail != null ? (
            <>
              Signed in as {userEmail} ·{" "}
              <Link
                href="/dashboard"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Log in
              </Link>
              {" · "}
              <Link
                href="/signup"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Sign up
              </Link>
            </>
          )}
        </p>
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          {dbMessage != null
            ? `Database: ${dbMessage}`
            : `Series rows in Supabase: ${seriesCount}`}
        </p>
      </main>
    </div>
  );
}
