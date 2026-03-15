import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { containsProfanity } from "@/lib/profanity";

const MAX_CHARS = 10000;
const RATE_LIMIT_MINUTES = 5;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// GET /api/confessions — fetch latest 50 confessions
export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("confessions")
    .select("id, confession_number, content, created_at, is_posted, posted_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch confessions." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/confessions — submit a new confession
export async function POST(req: NextRequest) {
  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Confession cannot be empty." }, { status: 400 });
  }
  if (content.length > MAX_CHARS) {
    return NextResponse.json({ error: `Confession exceeds ${MAX_CHARS} characters.` }, { status: 400 });
  }
  if (containsProfanity(content)) {
    return NextResponse.json({ error: "Your confession contains disallowed content." }, { status: 400 });
  }

  // Rate limiting — 1 submission per IP every 5 minutes
  const forwarded = req.headers.get("x-forwarded-for");
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const ipHash = await hashIp(rawIp);

  const db = supabaseAdmin();
  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();

  const { data: recent } = await db
    .from("confessions")
    .select("id")
    .eq("ip_hash", ipHash)
    .gte("created_at", since)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: `Please wait ${RATE_LIMIT_MINUTES} minutes before posting again.` },
      { status: 429 }
    );
  }

  const { error } = await db.from("confessions").insert({ content, ip_hash: ipHash });

  if (error) {
    return NextResponse.json({ error: "Failed to save confession." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
