import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Optional isolated PostgreSQL engine; never connects to the user's Supabase database.
test("media migration database integration", { skip: !process.env.PGLITE_MODULE }, async (t) => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table journey_settings(journey_id text primary key);
      create table journey_stops(journey_id text references journey_settings on delete cascade, stop_id text, sort_order integer, updated_at timestamptz);
      create table journey_photos(id uuid primary key, journey_id text references journey_settings on delete set null, stop_id text,
        latitude double precision, longitude double precision, location_name text, is_highlight boolean default false,
        storage_bucket text not null default 'media', storage_path text not null default 'original.jpg', thumbnail_path text);
      create table journey_video_links(id uuid primary key, journey_id text references journey_settings on delete set null, stop_id text,
        latitude double precision, longitude double precision, location_name text, is_highlight boolean default false);
      create table live_location_history(journey_id text);
      create table live_locations(journey_id text);
      create table journey_stop_overrides(journey_id text, stop_id text);
    `);
    const previous = readFileSync("supabase/migrations/20260907000000_multiple_journeys.sql", "utf8");
    await db.exec(previous.match(/create function public.delete_map_journey[\s\S]*?end \$\$;/)[0]);
    await db.exec("revoke all on function delete_map_journey(text) from public, anon, authenticated; grant execute on function delete_map_journey(text) to service_role;");
    await db.exec(previous.slice(previous.indexOf("create function public.reorder_map_stop"), previous.lastIndexOf("commit;")));
    await db.exec(readFileSync("supabase/migrations/20260919000000_media_categories_and_cleanup.sql", "utf8"));
    const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const remove = (items) => db.query("select delete_unlocated_media($1::jsonb) as removed", [JSON.stringify(items)]);
    await t.test("mixed photo/video deletion is idempotent and queues both image sizes", async () => {
      await db.query("insert into journey_photos(id,thumbnail_path) values($1,'thumbnail.jpg')", [id(1)]);
      await db.query("insert into journey_video_links(id) values($1)", [id(2)]);
      const items = [{kind:"photo",id:id(1)}, {kind:"video",id:id(2)}, {kind:"photo",id:id(1)}];
      assert.equal((await remove(items)).rows[0].removed, 2);
      assert.equal((await remove(items)).rows[0].removed, 0);
      assert.deepEqual((await db.query("select paths from media_storage_cleanup")).rows[0].paths, ["original.jpg", "thumbnail.jpg"]);
    });
    await t.test("a stale selection with journey or located media rolls back all removals", async () => {
      await db.exec("insert into journey_settings values('trip');");
      await db.query("insert into journey_photos(id) values($1)", [id(3)]);
      await db.query("insert into journey_video_links(id,journey_id) values($1,'trip')", [id(4)]);
      await assert.rejects(remove([{kind:"photo",id:id(3)}, {kind:"video",id:id(4)}]), /Only Unlocated/);
      assert.equal((await db.query("select count(*)::integer as n from journey_photos where id=$1", [id(3)])).rows[0].n, 1);
      await db.query("insert into journey_photos(id,latitude,longitude) values($1,0,0)", [id(5)]);
      await assert.rejects(remove([{kind:"photo",id:id(5)}]), /Only Unlocated/);
      assert.equal((await db.query("select count(*)::integer as n from media_storage_cleanup")).rows[0].n, 1);
    });
    await t.test("deleting a stop still moves both media types to the next stop", async () => {
      await db.exec("insert into journey_stops(journey_id,stop_id,sort_order) values('trip','start',0),('trip','one',1),('trip','two',2);");
      await db.query("update journey_video_links set stop_id='one' where id=$1", [id(4)]);
      await db.query("insert into journey_photos(id,journey_id,stop_id,latitude,longitude) values($1,'trip','one',1,2)", [id(6)]);
      assert.equal((await db.query("select reorder_map_stop('trip','one','delete') as target")).rows[0].target, "two");
      for (const table of ["journey_photos", "journey_video_links"]) {
        assert.equal((await db.query(`select stop_id from ${table} where journey_id='trip'`)).rows[0].stop_id, "two");
      }
    });
    await t.test("deleting a journey retains media in Unlocated without enqueuing their files", async () => {
      await db.query("select delete_map_journey('trip')");
      for (const [table, key] of [["journey_photos", id(6)], ["journey_video_links", id(4)]]) {
        assert.deepEqual((await db.query(`select journey_id,stop_id,latitude,longitude,location_name,is_highlight from ${table} where id=$1`, [key])).rows[0],
          { journey_id:null, stop_id:null, latitude:null, longitude:null, location_name:null, is_highlight:true });
      }
      assert.equal((await db.query("select count(*)::integer as n from media_storage_cleanup")).rows[0].n, 1);
    });
    await t.test("visitors and ordinary signed-in users cannot delete or inspect cleanup jobs", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const fn of ["delete_unlocated_media(jsonb)", "delete_map_journey(text)"]) {
          assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') as allowed", [role,fn])).rows[0].allowed, false);
        }
        assert.equal((await db.query("select has_table_privilege($1,'media_storage_cleanup','SELECT') as allowed", [role])).rows[0].allowed, false);
      }
    });
  } finally { await db.close(); }
});
