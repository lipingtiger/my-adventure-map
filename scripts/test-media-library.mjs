import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function moduleUrl(path, imports = {}) {
  let source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [key, value] of Object.entries(imports)) source = source.replaceAll(key, value);
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
const cleanupUrl = moduleUrl("supabase/functions/admin-tools/media-cleanup.ts");
const { cleanupMediaFiles } = await import(cleanupUrl);
const { manageLibrary } = await import(moduleUrl("supabase/functions/admin-tools/journeys.ts", { "./media-cleanup.ts": cleanupUrl }));
const { mediaCategory } = await import(moduleUrl("src/utils/mediaCategory.ts"));

test("media belongs to exactly one category, with journey taking precedence", () => {
  for (const kind of ["photo", "video"]) {
    for (const is_highlight of [true, false]) {
      assert.equal(mediaCategory({ kind, is_highlight, journey_id: "trip", latitude: null, longitude: null }), "journey");
      assert.equal(mediaCategory({ kind, is_highlight, journey_id: "trip", latitude: 1, longitude: 2 }), "journey");
      assert.equal(mediaCategory({ kind, is_highlight, journey_id: null, latitude: null, longitude: null }), "unlocated");
      assert.equal(mediaCategory({ kind, is_highlight, journey_id: null, latitude: 0, longitude: 0 }), "located");
    }
  }
});

function cleanupStub() {
  const jobs = [{ id: "a", storage_bucket: "media", paths: ["original.jpg", "thumb.jpg"] },
    { id: "b", storage_bucket: "media", paths: ["second.jpg"] }];
  const calls = [];
  const db = {
    jobs, calls, failStorage: false, failAcknowledgment: false,
    storage: { from(bucket) { return { async remove(paths) {
      calls.push({ bucket, paths }); return { error: db.failStorage ? new Error("Storage unavailable") : null };
    } }; } },
    from(table) {
      assert.equal(table, "media_storage_cleanup");
      return {
        select(_columns, options) {
          if (options?.head) return Promise.resolve({ count: jobs.length });
          return this;
        }, order() { return this; }, async limit() { return { data: [...jobs] }; },
        delete() { return this; }, async in(_column, ids) {
          if (db.failAcknowledgment) return { error: new Error("Database unavailable") };
          for (let i = jobs.length - 1; i >= 0; i--) if (ids.includes(jobs[i].id)) jobs.splice(i, 1);
          return { error: null };
        },
      };
    },
  };
  return db;
}

test("cleanup removes originals and thumbnails before acknowledging queued work", async () => {
  const db = cleanupStub();
  assert.equal(await cleanupMediaFiles(db), 0);
  assert.deepEqual(db.calls, [{ bucket: "media", paths: ["original.jpg", "thumb.jpg", "second.jpg"] }]);
});
test("storage failures and interrupted acknowledgment retain paths for retry", async () => {
  const db = cleanupStub(); db.failStorage = true;
  assert.equal(await cleanupMediaFiles(db), 2);
  db.failStorage = false; db.failAcknowledgment = true;
  assert.equal(await cleanupMediaFiles(db), 2);
  db.failAcknowledgment = false;
  assert.equal(await cleanupMediaFiles(db), 0);
});
const photo = { kind: "photo", id: "00000000-0000-0000-0000-000000000001" };
const request = (items) => new Request("https://test.invalid/library-delete-unlocated", {
  method: "POST", body: JSON.stringify({ items }),
});
test("bulk deletion rejects malformed input without touching storage or the database", async () => {
  for (const items of [[], [null], [{ ...photo, kind: "other" }], [{ ...photo, id: "bad" }], Array(101).fill(photo)]) {
    await assert.rejects(() => manageLibrary("library-delete-unlocated", request(items), { supabase: {}, userId: "admin" }), /valid media/);
  }
});
test("server eligibility rejection happens before storage deletion", async () => {
  await assert.rejects(() => manageLibrary("library-delete-unlocated", request([photo]), {
    userId: "admin", supabase: { async rpc() { return { error: new Error("Only Unlocated media") }; } },
  }), /Only Unlocated/);
});
test("bulk deletion reports pending cleanup without claiming files were removed", async () => {
  const db = cleanupStub(); db.failStorage = true;
  db.rpc = async (name, args) => {
    assert.equal(name, "delete_unlocated_media"); assert.deepEqual(args, { p_items: [photo] });
    return { data: 1, error: null };
  };
  assert.deepEqual(await manageLibrary("library-delete-unlocated", request([photo]), { supabase: db, userId: "admin" }), { deleted: 1, pending: 2 });
});
