import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

type AdminContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

function getAdminEmails() {
  return (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getServiceRoleKey() {
  let secretKeys: Record<string, string> = {};

  try {
    secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
  } catch {
    secretKeys = {};
  }

  return secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

async function getAdminContext(req: Request): Promise<AdminContext | Response> {
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!accessToken) {
    return jsonResponse({ error: "Missing admin access token" }, 401);
  }

  const serviceRoleKey = getServiceRoleKey();

  if (!serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service role key" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!supabaseUrl) {
    return jsonResponse({ error: "Missing Supabase URL" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    return jsonResponse({ error: "Invalid admin session" }, 401);
  }

  const adminEmails = getAdminEmails();

  if (!adminEmails.includes(data.user.email.toLowerCase())) {
    return jsonResponse({ error: "This account is not allowed to use admin tools" }, 403);
  }

  return { supabase, userId: data.user.id };
}

function safeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function uploadPhoto(req: Request, context: AdminContext) {
  const formData = await req.formData();
  const file = formData.get("file");
  const journeyId = String(formData.get("journeyId") ?? "toronto-seattle-2026");
  const stopId = String(formData.get("stopId") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const takenAt = String(formData.get("takenAt") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return jsonResponse({ error: "Choose an image file to upload" }, 400);
  }

  if (!file.type.startsWith("image/")) {
    return jsonResponse({ error: "Only image uploads are supported" }, 400);
  }

  if (!title) {
    return jsonResponse({ error: "Photo title is required" }, 400);
  }

  const bucket = Deno.env.get("MEDIA_BUCKET") ?? "journey-media";
  const storagePath = `${journeyId}/${Date.now()}-${safeFileName(file.name) || "photo"}`;
  const { error: uploadError } = await context.supabase.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return jsonResponse({ error: uploadError.message }, 500);
  }

  const { data: publicUrlData } = context.supabase.storage.from(bucket).getPublicUrl(storagePath);
  const { data: photo, error: insertError } = await context.supabase
    .from("journey_photos")
    .insert({
      caption,
      journey_id: journeyId,
      public_url: publicUrlData.publicUrl,
      stop_id: stopId,
      storage_bucket: bucket,
      storage_path: storagePath,
      taken_at: takenAt,
      title,
      uploaded_by: context.userId,
    })
    .select("id, journey_id, stop_id, title, caption, public_url, taken_at, created_at")
    .single();

  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500);
  }

  return jsonResponse({ ok: true, photo });
}

type ClearHistoryBody = {
  endAt?: string;
  journeyId?: string;
  startAt?: string;
  trackerId?: string;
};

async function clearLocationHistory(req: Request, context: AdminContext) {
  const body = (await req.json()) as ClearHistoryBody;
  const journeyId = body.journeyId ?? "toronto-seattle-2026";
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;

  if (!startAt || Number.isNaN(startAt.getTime()) || !endAt || Number.isNaN(endAt.getTime())) {
    return jsonResponse({ error: "Start and end date-times are required" }, 400);
  }

  if (startAt.getTime() > endAt.getTime()) {
    return jsonResponse({ error: "Start time must be before end time" }, 400);
  }

  let query = context.supabase
    .from("live_location_history")
    .delete()
    .eq("journey_id", journeyId)
    .gte("recorded_at", startAt.toISOString())
    .lte("recorded_at", endAt.toISOString())
    .select("id");

  if (body.trackerId) {
    query = query.eq("tracker_id", body.trackerId);
  }

  const { data, error } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ deletedCount: data?.length ?? 0, ok: true });
}

async function handleAdminRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const context = await getAdminContext(req);

  if (context instanceof Response) {
    return context;
  }

  const url = new URL(req.url);

  if (url.pathname.endsWith("/upload-photo")) {
    return uploadPhoto(req, context);
  }

  if (url.pathname.endsWith("/clear-location-history")) {
    return clearLocationHistory(req, context);
  }

  return jsonResponse({ error: "Admin action not found" }, 404);
}

Deno.serve(async (req) => {
  try {
    return await handleAdminRequest(req);
  } catch (error) {
    console.error("Admin tools endpoint failed", error);

    return jsonResponse({ error: getErrorMessage(error) }, 500);
  }
});
