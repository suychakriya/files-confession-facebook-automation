/**
 * post-to-facebook.ts
 * Fetches all unposted confessions from Supabase and posts them
 * to a Facebook Page as a single combined post, then marks them
 * as posted in the database.
 *
 * Run via GitHub Actions on a schedule.
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FACEBOOK_PAGE_ID
 *   FACEBOOK_PAGE_ACCESS_TOKEN
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
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!supabaseUrl || !serviceRoleKey || !pageId || !pageToken) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch unposted confessions ordered oldest first
  const { data: confessions, error: fetchError } = await db
    .from("confessions")
    .select("id, confession_number, content, created_at")
    .eq("is_posted", false)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch confessions:", fetchError.message);
    process.exit(1);
  }

  if (!confessions || confessions.length === 0) {
    console.log("No new confessions to post.");
    return;
  }

  console.log(`Found ${confessions.length} unposted confession(s).`);

  const postedIds: string[] = [];

  // Post each confession individually so each gets its own Facebook post
  for (const confession of confessions as Confession[]) {
    const messageText = buildFacebookMessage(confession.confession_number, confession.content);
    const success = await postToFacebook(pageId, pageToken, messageText);

    if (success) {
      postedIds.push(confession.id);
      console.log(`Posted confession ${confession.id}`);
    } else {
      console.warn(`Failed to post confession ${confession.id}, skipping.`);
    }

    // Small delay between posts to respect rate limits
    await sleep(1500);
  }

  if (postedIds.length === 0) {
    console.log("No confessions were successfully posted.");
    return;
  }

  // Mark posted confessions in the database
  const { error: updateError } = await db
    .from("confessions")
    .update({ is_posted: true, posted_at: new Date().toISOString() })
    .in("id", postedIds);

  if (updateError) {
    console.error("Failed to mark confessions as posted:", updateError.message);
    process.exit(1);
  }

  console.log(`Successfully posted ${postedIds.length} confession(s) to Facebook.`);
}

function buildFacebookMessage(number: number, content: string): string {
  return `#filesConfessions${number} 💬\n\n${content}`;
}

async function postToFacebook(
  pageId: string,
  accessToken: string,
  message: string
): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Facebook API error:", JSON.stringify(err));
    return false;
  }

  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
