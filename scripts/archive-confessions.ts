/**
 * archive-confessions.ts
 * Runs on the 3rd of every month via GitHub Actions.
 * 1. Exports previous month's confessions to a CSV file.
 * 2. Uploads the CSV to Supabase Storage (archives bucket).
 * 3. Deletes those confessions from the database.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

type Confession = {
  id: string;
  confession_number: number;
  content: string;
  created_at: string;
  is_posted: boolean;
  posted_at: string | null;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Calculate previous month date range
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthLabel = firstOfLastMonth.toISOString().slice(0, 7); // e.g. "2026-02"

  console.log(`Archiving confessions for ${monthLabel}...`);

  const { data: confessions, error: fetchError } = await db
    .from("confessions")
    .select("id, confession_number, content, created_at, is_posted, posted_at")
    .gte("created_at", firstOfLastMonth.toISOString())
    .lt("created_at", firstOfThisMonth.toISOString())
    .order("confession_number", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch confessions:", fetchError.message);
    process.exit(1);
  }

  if (!confessions || confessions.length === 0) {
    console.log("No confessions found for the previous month. Nothing to archive.");
    return;
  }

  console.log(`Found ${confessions.length} confession(s) to archive.`);

  // Build CSV
  const csv = buildCsv(confessions as Confession[]);
  const fileName = `confessions-${monthLabel}.csv`;

  // Ensure the archives bucket exists
  await db.storage.createBucket("archives", { public: false }).catch(() => {
    // Bucket already exists — ignore error
  });

  // Upload CSV to Supabase Storage
  const { error: uploadError } = await db.storage
    .from("archives")
    .upload(fileName, Buffer.from(csv, "utf-8"), {
      contentType: "text/csv",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload CSV to Supabase Storage:", uploadError.message);
    process.exit(1);
  }

  console.log(`Uploaded ${fileName} to Supabase Storage (archives bucket).`);

  // Delete archived confessions from DB
  const ids = (confessions as Confession[]).map((c) => c.id);
  const { error: deleteError } = await db
    .from("confessions")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("Failed to delete confessions:", deleteError.message);
    process.exit(1);
  }

  console.log(`Deleted ${ids.length} confession(s) from the database.`);
}

function buildCsv(confessions: Confession[]): string {
  const headers = ["confession_number", "content", "created_at", "is_posted", "posted_at"];
  const rows = confessions.map((c) => [
    c.confession_number,
    `"${c.content.replace(/"/g, '""')}"`,
    c.created_at,
    c.is_posted,
    c.posted_at ?? "",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
