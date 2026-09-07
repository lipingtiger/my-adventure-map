import type { createClient } from "npm:@supabase/supabase-js@2";
type Context = { supabase: ReturnType<typeof createClient>; userId: string };

export async function manageJourney(action: string, body: Record<string, any>, context: Context) {
  if (action === "create-journey") {
    const title = String(body.title ?? "").trim();
    const subtitle = String(body.subtitle ?? "").trim();
    const start = body.start;
    if (!title || !subtitle || !start?.name?.trim() ||
      !Number.isFinite(start.latitude) || Math.abs(start.latitude) > 90 ||
      !Number.isFinite(start.longitude) || Math.abs(start.longitude) > 180) {
      throw new Error("Journey name, description, and a route start with valid coordinates are required.");
    }
    const id = crypto.randomUUID();
    const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "journey";
    let slug = base;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await context.supabase.rpc("create_map_journey", {
        p_id: id, p_slug: slug, p_title: title, p_subtitle: subtitle, p_start: start, p_user: context.userId,
      });
      if (!error) return { journeyId: id, slug };
      if (error.code !== "23505") throw error;
      slug = `${base}-${id.slice(0, 8)}`;
    }
    throw new Error("Unable to create a unique journey link.");
  }
  if (!body.journeyId) throw new Error("Choose a journey.");
  const { error } = await context.supabase.rpc("delete_map_journey", { p_id: body.journeyId });
  if (error) throw error;
  return { ok: true };
}

export async function manageLibrary(action: string, req: Request, context: Context) {
  if (action === "library-upload") {
    const form = await req.formData();
    const file = form.get("file");
    const thumbnail = form.get("thumbnail");
    if (!(file instanceof File) || !["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)
      || file.size > 10 * 1024 * 1024) throw new Error("Choose a JPG, PNG, WebP or GIF image under 10 MB.");
    const latitude = form.get("latitude") ? Number(form.get("latitude")) : null;
    const longitude = form.get("longitude") ? Number(form.get("longitude")) : null;
    validatePosition(latitude, longitude);
    const bucket = Deno.env.get("MEDIA_BUCKET") ?? "journey-media";
    const path = `library/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const paths = [path];
    const { error } = await context.supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    try {
      let thumbnailPath: string | null = null;
      if (thumbnail instanceof File) {
        if (thumbnail.type !== "image/jpeg" || thumbnail.size > 1024 * 1024) throw new Error("Invalid thumbnail.");
        thumbnailPath = `${path}.thumb.jpg`;
        const { error: thumbError } = await context.supabase.storage.from(bucket).upload(thumbnailPath, thumbnail, { contentType: "image/jpeg" });
        if (thumbError) throw thumbError;
        paths.push(thumbnailPath);
      }
      const { error: insertError } = await context.supabase.from("journey_photos").insert({
        journey_id: null, title: String(form.get("title") || file.name),
        caption: String(form.get("caption") || "") || null, latitude, longitude, is_highlight: true,
        storage_bucket: bucket, storage_path: path, uploaded_by: context.userId,
        public_url: context.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
        thumbnail_path: thumbnailPath,
        thumbnail_url: thumbnailPath ? context.supabase.storage.from(bucket).getPublicUrl(thumbnailPath).data.publicUrl : null,
      });
      if (insertError) throw insertError;
    } catch (error) {
      await context.supabase.storage.from(bucket).remove(paths);
      throw error;
    }
    return { ok: true };
  }
  const body = await req.json();
  const table = body.kind === "video" ? "journey_video_links" : "journey_photos";
  if (action === "library-video") {
    const id = youtubeId(body.videoUrl);
    if (!id) throw new Error("Enter a valid YouTube video link.");
    const { error } = await context.supabase.from("journey_video_links").insert({
      journey_id: null, title: String(body.title || "YouTube video").trim(), caption: body.caption || null,
      video_url: `https://www.youtube.com/watch?v=${id}`, thumbnail_url: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      is_highlight: true, uploaded_by: context.userId,
    });
    if (error) throw error;
  } else if (action === "library-locate") {
    validatePosition(body.latitude, body.longitude);
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new Error("Choose 1 to 100 media items.");
    // One update per media kind; the client reports any failure and keeps selection available for retry.
    for (const kind of ["photo", "video"]) {
      const ids = body.items.filter((item: any) => item.kind === kind).map((item: any) => item.id);
      if (!ids.length) continue;
      const { error } = await context.supabase.from(kind === "photo" ? "journey_photos" : "journey_video_links")
        .update({ latitude: body.latitude, longitude: body.longitude, location_name: body.locationName || null, is_highlight: true })
        .in("id", ids);
      if (error) throw error;
    }
  } else if (action === "library-update") {
    if (!body.id || !String(body.title ?? "").trim()) throw new Error("Media and title are required.");
    const values: Record<string, unknown> = { title: String(body.title).trim(), caption: body.caption || null };
    if (body.kind === "video") {
      const id = youtubeId(body.videoUrl);
      if (!id) throw new Error("Enter a valid YouTube video link.");
      values.video_url = `https://www.youtube.com/watch?v=${id}`;
      values.thumbnail_url = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    const { error } = await context.supabase.from(table).update(values).eq("id", body.id);
    if (error) throw error;
  } else if (action === "library-delete") {
    if (!body.id) throw new Error("Choose a media item.");
    if (body.kind !== "video") {
      const { data, error } = await context.supabase.from(table).select("storage_bucket,storage_path,thumbnail_path").eq("id", body.id).single();
      if (error) throw error;
      const { error: storageError } = await context.supabase.storage.from(data.storage_bucket).remove([data.storage_path, data.thumbnail_path].filter(Boolean));
      if (storageError) throw storageError;
    }
    const { error } = await context.supabase.from(table).delete().eq("id", body.id);
    if (error) throw error;
  } else throw new Error("Unknown media action.");
  return { ok: true };
}

function validatePosition(latitude: unknown, longitude: unknown) {
  if (latitude === null && longitude === null) return;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180)
    throw new Error("Choose a valid map position.");
}

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const id = host === "youtu.be" ? url.pathname.split("/")[1]
      : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
        ? url.searchParams.get("v") || (/^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split("/")[2] : null) : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
