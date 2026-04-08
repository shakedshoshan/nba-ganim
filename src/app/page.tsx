import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const cookieStore = await cookies();
  let seriesCount: number | null = null;
  let dbMessage: string | null = null;

  try {
    const supabase = createClient(cookieStore);
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
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          {dbMessage != null
            ? `Database: ${dbMessage}`
            : `Series rows in Supabase: ${seriesCount}`}
        </p>
      </main>
    </div>
  );
}
