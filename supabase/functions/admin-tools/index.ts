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

type UpdateStopBody = {
  city?: string | null;
  country?: string;
  date?: string;
  description?: string;
  destination?: string | null;
  drivingDistanceKm?: number | null;
  drivingDistanceNote?: string | null;
  journeyId?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  overnight?: string | null;
  startPoint?: string | null;
  stateOrProvince?: string;
  stopId?: string;
};

type UpdatePhotoBody = {
  caption?: string | null;
  journeyId?: string;
  photoId?: string;
  stopId?: string | null;
  takenAt?: string | null;
  title?: string;
};

type DeletePhotoBody = {
  journeyId?: string;
  photoId?: string;
};

type VideoLinkBody = {
  caption?: string | null;
  journeyId?: string;
  stopId?: string | null;
  takenAt?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  videoId?: string;
  videoUrl?: string;
};

type DeleteVideoLinkBody = {
  journeyId?: string;
  videoId?: string;
};

function normalizeNullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  return text || null;
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function isOptionalIsoDate(value: string | null) {
  return value === null || isIsoDate(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function updateStop(req: Request, context: AdminContext) {
  const body = (await req.json()) as UpdateStopBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const stopId = normalizeRequiredText(body.stopId);
  const name = normalizeRequiredText(body.name);
  const stateOrProvince = normalizeRequiredText(body.stateOrProvince);
  const country = normalizeRequiredText(body.country);
  const date = normalizeRequiredText(body.date);
  const description = normalizeRequiredText(body.description);
  const latitude = normalizeNumber(body.latitude);
  const longitude = normalizeNumber(body.longitude);
  const drivingDistanceKm = normalizeNumber(body.drivingDistanceKm);

  if (!stopId) {
    return jsonResponse({ error: "Stop is required" }, 400);
  }

  if (!name) {
    return jsonResponse({ error: "Stop name is required" }, 400);
  }

  if (!stateOrProvince || !country || !description) {
    return jsonResponse({ error: "State/province, country, and description are required" }, 400);
  }

  if (!isIsoDate(date)) {
    return jsonResponse({ error: "A valid stop date is required" }, 400);
  }

  if (latitude === null || latitude < -90 || latitude > 90 || longitude === null || longitude < -180 || longitude > 180) {
    return jsonResponse({ error: "Valid latitude and longitude are required" }, 400);
  }

  const { data, error } = await context.supabase
    .from("journey_stop_overrides")
    .upsert(
      {
        city: normalizeNullableText(body.city),
        country,
        date,
        description,
        destination: normalizeNullableText(body.destination),
        driving_distance_km: drivingDistanceKm,
        driving_distance_note: normalizeNullableText(body.drivingDistanceNote),
        journey_id: journeyId,
        latitude,
        longitude,
        name,
        overnight: normalizeNullableText(body.overnight),
        start_point: normalizeNullableText(body.startPoint),
        state_or_province: stateOrProvince,
        stop_id: stopId,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "journey_id,stop_id" },
    )
    .select(
      "city, country, date, description, destination, driving_distance_km, driving_distance_note, journey_id, latitude, longitude, name, overnight, start_point, state_or_province, stop_id, updated_at",
    )
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, stop: data });
}

async function updatePhoto(req: Request, context: AdminContext) {
  const body = (await req.json()) as UpdatePhotoBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const photoId = normalizeRequiredText(body.photoId);
  const title = normalizeRequiredText(body.title);
  const takenAt = normalizeNullableText(body.takenAt);

  if (!photoId) {
    return jsonResponse({ error: "Photo is required" }, 400);
  }

  if (!title) {
    return jsonResponse({ error: "Photo title is required" }, 400);
  }

  if (!isOptionalIsoDate(takenAt)) {
    return jsonResponse({ error: "A valid photo date is required" }, 400);
  }

  const { data, error } = await context.supabase
    .from("journey_photos")
    .update({
      caption: normalizeNullableText(body.caption),
      stop_id: normalizeNullableText(body.stopId),
      taken_at: takenAt,
      title,
    })
    .eq("id", photoId)
    .eq("journey_id", journeyId)
    .select("id, journey_id, stop_id, title, caption, public_url, taken_at, created_at")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, photo: data });
}

async function deletePhoto(req: Request, context: AdminContext) {
  const body = (await req.json()) as DeletePhotoBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const photoId = normalizeRequiredText(body.photoId);

  if (!photoId) {
    return jsonResponse({ error: "Photo is required" }, 400);
  }

  const { data: photo, error: selectError } = await context.supabase
    .from("journey_photos")
    .select("id, storage_bucket, storage_path")
    .eq("id", photoId)
    .eq("journey_id", journeyId)
    .single();

  if (selectError) {
    return jsonResponse({ error: selectError.message }, 500);
  }

  const { error: storageError } = await context.supabase.storage
    .from(photo.storage_bucket)
    .remove([photo.storage_path]);

  if (storageError) {
    return jsonResponse({ error: storageError.message }, 500);
  }

  const { error: deleteError } = await context.supabase
    .from("journey_photos")
    .delete()
    .eq("id", photoId)
    .eq("journey_id", journeyId);

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ ok: true, photoId });
}

function getVideoLinkPayload(body: VideoLinkBody) {
  const title = normalizeRequiredText(body.title);
  const videoUrl = normalizeRequiredText(body.videoUrl);
  const thumbnailUrl = normalizeNullableText(body.thumbnailUrl);
  const takenAt = normalizeNullableText(body.takenAt);

  if (!title) {
    return { error: "Video title is required" };
  }

  if (!videoUrl || !isHttpUrl(videoUrl)) {
    return { error: "A valid video URL is required" };
  }

  if (thumbnailUrl && !isHttpUrl(thumbnailUrl)) {
    return { error: "Thumbnail URL must be a valid URL" };
  }

  if (!isOptionalIsoDate(takenAt)) {
    return { error: "A valid video date is required" };
  }

  return {
    payload: {
      caption: normalizeNullableText(body.caption),
      stop_id: normalizeNullableText(body.stopId),
      taken_at: takenAt,
      thumbnail_url: thumbnailUrl,
      title,
      video_url: videoUrl,
    },
  };
}

async function addVideoLink(req: Request, context: AdminContext) {
  const body = (await req.json()) as VideoLinkBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const result = getVideoLinkPayload(body);

  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  const { data, error } = await context.supabase
    .from("journey_video_links")
    .insert({
      ...result.payload,
      journey_id: journeyId,
      uploaded_by: context.userId,
    })
    .select("id, journey_id, stop_id, title, caption, video_url, thumbnail_url, taken_at, created_at")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, video: data });
}

async function updateVideoLink(req: Request, context: AdminContext) {
  const body = (await req.json()) as VideoLinkBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const videoId = normalizeRequiredText(body.videoId);
  const result = getVideoLinkPayload(body);

  if (!videoId) {
    return jsonResponse({ error: "Video is required" }, 400);
  }

  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  const { data, error } = await context.supabase
    .from("journey_video_links")
    .update(result.payload)
    .eq("id", videoId)
    .eq("journey_id", journeyId)
    .select("id, journey_id, stop_id, title, caption, video_url, thumbnail_url, taken_at, created_at")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, video: data });
}

async function deleteVideoLink(req: Request, context: AdminContext) {
  const body = (await req.json()) as DeleteVideoLinkBody;
  const journeyId = normalizeRequiredText(body.journeyId) || "toronto-seattle-2026";
  const videoId = normalizeRequiredText(body.videoId);

  if (!videoId) {
    return jsonResponse({ error: "Video is required" }, 400);
  }

  const { error } = await context.supabase
    .from("journey_video_links")
    .delete()
    .eq("id", videoId)
    .eq("journey_id", journeyId);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, videoId });
}

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

  if (url.pathname.endsWith("/update-stop")) {
    return updateStop(req, context);
  }

  if (url.pathname.endsWith("/update-photo")) {
    return updatePhoto(req, context);
  }

  if (url.pathname.endsWith("/delete-photo")) {
    return deletePhoto(req, context);
  }

  if (url.pathname.endsWith("/add-video-link")) {
    return addVideoLink(req, context);
  }

  if (url.pathname.endsWith("/update-video-link")) {
    return updateVideoLink(req, context);
  }

  if (url.pathname.endsWith("/delete-video-link")) {
    return deleteVideoLink(req, context);
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
