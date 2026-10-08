import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_connection")
    .select("*");

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-2xl bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-800">
          Student AI
        </h1>

        {error ? (
          <p className="mt-4 text-red-600">
            Supabase connected, but the test table does not exist yet.
          </p>
        ) : (
          <p className="mt-4 text-green-600">
            Supabase connection successful!
          </p>
        )}

        <pre className="mt-4 text-sm text-slate-500">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  );
}