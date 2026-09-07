import { FormEvent, useMemo, useState } from "react";
import { gps } from "exifr";
import { Check, ChevronLeft, ChevronRight, ExternalLink, MapPin, Play, Save, Trash2, Upload, X } from "lucide-react";
import { LibraryMedia, useMediaLibrary } from "../hooks/useMediaLibrary";
import { adminRequest } from "../utils/admin";
import { PickedPoint, PointPicker } from "./PointPicker";

async function thumbnail(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Thumbnail failed.")), "image/jpeg", 0.8));
}

export function LibraryManager({ token }: { token: string }) {
  const { items, loading, error, refresh } = useMediaLibrary();
  const params = new URLSearchParams(window.location.search);
  const [filter, setFilter] = useState(params.has("media") ? "all" : "unlocated");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>(params.get("media")?.split(",") ?? []);
  const [editing, setEditing] = useState<LibraryMedia | null>(null);
  const [point, setPoint] = useState<PickedPoint | null>(() => {
    const latitude = Number(params.get("lat")), longitude = Number(params.get("lng"));
    return params.has("lat") && params.has("lng") && Number.isFinite(latitude) && Number.isFinite(longitude)
      && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadMode, setUploadMode] = useState("photo");
  const visible = useMemo(() => items.filter((item) => filter === "all" ||
    (filter === "unlocated" && item.latitude === null) ||
    (filter === "located" && item.is_highlight && item.latitude !== null) ||
    (filter === "independent" && item.journey_id === null)), [filter, items]);
  const maxPage = Math.max(0, Math.ceil(visible.length / 24) - 1);
  const currentPage = Math.min(page, maxPage);
  const chosen = items.filter((item) => selected.includes(item.id));
  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await task(); refresh(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    await run(async () => {
      if (uploadMode === "video") {
        await adminRequest("library-video", token, { title: data.get("title"), caption: data.get("caption"), videoUrl: data.get("videoUrl") });
        setMessage("YouTube link added to Unlocated."); form.reset(); return;
      }
      const files = data.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
      const failed: string[] = [];
      let count = 0;
      for (const file of files) {
        setMessage(`Uploading ${count + failed.length + 1} of ${files.length}: ${file.name}`);
        try {
          const formData = new FormData();
          const position = await gps(file).catch(() => undefined);
          formData.set("file", file); formData.set("title", file.name.replace(/\.[^.]+$/, ""));
          if (position && Number.isFinite(position.latitude) && Number.isFinite(position.longitude)) {
            formData.set("latitude", String(position.latitude)); formData.set("longitude", String(position.longitude));
          }
          formData.set("thumbnail", await thumbnail(file), "thumbnail.jpg");
          await adminRequest("library-upload", token, formData); count++;
        } catch (err) { failed.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`); }
      }
      setMessage(`${count} uploaded.${failed.length ? ` Failed: ${failed.join("; ")}` : ""}`);
      if (!failed.length) form.reset();
    });
  }
  async function locate(remove = false) {
    if (!chosen.length || (!remove && !point)) return;
    await run(async () => {
      await adminRequest("library-locate", token, { items: chosen.map(({ id, kind }) => ({ id, kind })),
        latitude: remove ? null : point!.latitude, longitude: remove ? null : point!.longitude,
        locationName: remove ? null : point?.address });
      setSelected([]); setMessage(remove ? "Map positions removed. Media retained in Unlocated." : "Map positions saved.");
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      await adminRequest("library-update", token, { id: editing.id, kind: editing.kind,
        title: data.get("title"), caption: data.get("caption"), videoUrl: data.get("videoUrl") });
      setEditing(null); setMessage("Media updated.");
    });
  }
  return <section className="library-manager">
    <h2>Highlight spots &amp; independent library</h2>
    <form className="admin-form library-upload" onSubmit={upload}>
      <label>Add media<select value={uploadMode} onChange={(e) => setUploadMode(e.target.value)} disabled={busy}>
        <option value="photo">Upload highlight photos</option><option value="video">Add YouTube link</option>
      </select></label>
      {uploadMode === "photo" ? <label>Photos<input name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/gif" /></label> : <>
        <label>Title<input name="title" required /></label><label>YouTube URL<input name="videoUrl" type="url" required /></label>
        <label>Caption<textarea name="caption" /></label></>}
      <button disabled={busy} type="submit"><Upload size={17} />{busy ? "Working..." : "Add media"}</button>
    </form>
    {(message || error) && <p role="status" className="library-message">{message || error}</p>}
    <div className="admin-toolbar"><label>Show<select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); setSelected([]); }}>
      <option value="unlocated">Unlocated</option><option value="located">Highlight spots</option>
      <option value="independent">Independent library</option><option value="all">All media</option>
    </select></label><span>{visible.length} items / {chosen.length} selected</span></div>
    {loading && <p>Loading media...</p>}
    {!loading && !visible.length && <p>No media in this view.</p>}
    <div className="library-grid">
      {visible.slice(currentPage * 24, currentPage * 24 + 24).map((item) => <article className="library-item" key={item.id}>
        <label className="library-check"><input type="checkbox" checked={selected.includes(item.id)} disabled={busy}
          onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} />Select</label>
        <button className="library-preview" onClick={() => setEditing(item)} title={`Edit ${item.title}`}>
          <img loading="lazy" src={item.thumbnail_url || item.public_url} alt={item.title} />
          {item.kind === "video" && <Play size={22} className="media-play" />}
        </button><strong>{item.title}</strong><span>{item.latitude === null ? "Unlocated" : item.location_name || `${item.latitude.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</span>
      </article>)}
    </div>
    <div className="media-pagination"><button title="Previous page" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></button>
      <span>{currentPage + 1} / {maxPage + 1}</span><button title="Next page" aria-label="Next page" disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)}><ChevronRight /></button></div>
    {chosen.length > 0 && <div className="library-location"><h3>Selected media location</h3><PointPicker value={point} onChange={setPoint} />
      <div className="admin-toolbar"><button disabled={busy || !point || chosen.length > 100} onClick={() => void locate()}><MapPin size={17} />Save map position</button>
        <button disabled={busy || chosen.length > 100} onClick={() => void locate(true)}><X size={17} />Remove map position</button>
        <button disabled={busy} onClick={() => setSelected([])}><Check size={17} />Clear selection</button></div></div>}
    {editing && <div className="media-modal" role="dialog" aria-modal="true" aria-label="Edit media">
      <form className="admin-form media-editor" onSubmit={save} key={editing.id}>
        <button type="button" className="media-close" title="Close editor" aria-label="Close editor" onClick={() => setEditing(null)}><X /></button>
        <img src={editing.public_url || editing.thumbnail_url || ""} alt={editing.title} />
        <a href={editing.video_url || editing.public_url} target="_blank" rel="noreferrer"><ExternalLink size={16} />{editing.kind === "video" ? "Watch on YouTube" : "Open photo"}</a>
        <label>Title<input name="title" defaultValue={editing.title} required /></label>
        <label>Caption<textarea name="caption" defaultValue={editing.caption ?? ""} /></label>
        {editing.kind === "video" && <label>YouTube URL<input type="url" name="videoUrl" defaultValue={editing.video_url} required /></label>}
        <div className="admin-toolbar"><button type="submit" disabled={busy}><Save size={17} />Save</button>
          <button type="button" disabled={busy} onClick={() => { setSelected([editing.id]); setEditing(null); }}><MapPin size={17} />Edit location</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(`Permanently delete "${editing.title}"? This also removes it from any journey.`)) void run(async () => {
              await adminRequest("library-delete", token, { id: editing.id, kind: editing.kind }); setEditing(null); setMessage("Media deleted.");
            });
          }}><Trash2 size={17} />Delete</button></div>
      </form>
    </div>}
  </section>;
}
