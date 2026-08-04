# Live Location Setup

This project supports OwnTracks -> Supabase Edge Function -> website live location sharing.

## Data Flow

1. OwnTracks runs on your phone.
2. OwnTracks sends location updates to the Supabase Edge Function.
3. The Edge Function validates your private token or HTTP Basic credentials.
4. The Edge Function writes the latest location to `public.live_locations`.
5. The React website reads `live_locations` with the public Supabase anon key and shows the shared marker on the trip map.

## Supabase Setup

Create a Supabase project, then run the SQL migration in:

```text
supabase/migrations/20260804000000_create_live_locations.sql
```

Deploy the Edge Function:

```bash
supabase functions deploy owntracks-location
```

The function has its own OwnTracks authentication, so `supabase/config.toml` sets `verify_jwt = false` for `owntracks-location`.

Set production secrets:

```bash
supabase secrets set DEFAULT_JOURNEY_ID=toronto-seattle-2026
supabase secrets set OWNTRACKS_TRACKER_TOKEN=replace-with-a-long-random-token
```

You can use HTTP Basic authentication instead of the token:

```bash
supabase secrets set OWNTRACKS_HTTP_USERNAME=your-owntracks-user
supabase secrets set OWNTRACKS_HTTP_PASSWORD=replace-with-a-long-random-password
```

## Website Environment Variables

Add these to your hosting provider and to local `.env.local`:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Never put the Supabase service role key in Vite, React, or any browser-exposed environment variable.

## OwnTracks HTTP Configuration

In OwnTracks, use HTTP mode and set the endpoint to:

```text
https://your-project-ref.functions.supabase.co/owntracks-location?journey_id=toronto-seattle-2026&tracker_id=phone
```

Add this header if using token authentication:

```text
x-owntracks-token: replace-with-a-long-random-token
```

If using HTTP Basic authentication, set the OwnTracks username and password to match `OWNTRACKS_HTTP_USERNAME` and `OWNTRACKS_HTTP_PASSWORD`.

## Privacy Notes

The migration allows public read access only for rows where `sharing_enabled = true`. To pause sharing, set the row's `sharing_enabled` value to `false` in Supabase.

For a private family-only version, add authentication or a private share token before sharing the live page widely.
