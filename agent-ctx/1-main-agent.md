# Task 1 - Fix iptv-org URL and Rebuild NontonTV

## Summary
Fixed the core bug where the API used a WRONG iptv-org URL (`/master/streams/id.m3u` which doesn't exist) and rebuilt the entire channel pipeline with YouTube Live support and logo images.

## Files Changed
1. **`/src/lib/channels.ts`** - Updated TVChannel interface with youtubeUrl, logo, quality, isNot247, isGeoBlocked fields. Updated static fallback channels with known-working URLs. ~60 channels in static fallback.

2. **`/src/app/api/channels/route.ts`** - Complete rewrite:
   - Fixed URL from `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/id.m3u` to `https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/countries/id.m3u`
   - Added fallback URL: `https://iptv-org.github.io/iptv/countries/id.m3u`
   - Fixed M3U name parsing for entries with commas in http-user-agent attributes
   - Added tvg-logo extraction, YouTube Live URLs, geo-blocked flagging
   - 15-minute in-memory cache
   - Returns 195 channels from 191 M3U entries + supplementary

3. **`/src/hooks/use-auto-update-channels.ts`** - Updated to use new TVChannel interface with youtubeUrl and logo fields.

4. **`/src/components/video-player.tsx`** - Added YouTubeEmbed component for channels with youtubeUrl. Updated VideoPlayerProps with youtubeUrl field.

5. **`/src/app/page.tsx`** - Added youtubeUrl prop to VideoPlayer. Added logo image display in channel cards, now playing panel, and popular grid with fallback to logoText.

## Verification
- Lint: Clean
- API: Returns 195 channels with 172 logos and 3 YouTube URLs
- Dev server: Running on port 3000
- YouTube embeds work for Metro TV, tvOne, Kompas TV
