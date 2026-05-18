import { NextResponse } from 'next/server';

// In-memory cache
let cachedData: { channels: IptvChannel[]; updatedAt: string } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface IptvChannel {
  name: string;
  streamUrl: string;
  headers?: Record<string, string>;
  tvgId: string;
  quality: string;
}

const IPTV_ORG_URL = 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/id.m3u';

function parseM3U(m3uText: string): IptvChannel[] {
  const lines = m3uText.split('\n');
  const channels: IptvChannel[] = [];
  const seen = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) {
      i++;
      continue;
    }

    // Parse EXTINF line
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    const tvgId = tvgIdMatch?.[1] || '';
    const nameMatch = line.match(/,(.+)$/);
    const rawName = nameMatch?.[1]?.trim() || '';

    // Clean name: remove quality suffix like (720p), [Not 24/7], etc.
    const cleanName = rawName
      .replace(/\s*\(\d{3,4}[ip]\)\s*/g, '')
      .replace(/\s*\(\d{3,4}i\)\s*/g, '')
      .replace(/\s*\[Not 24\/7\]\s*/g, '')
      .replace(/\s*\(Am Media\)\s*/g, '')
      .trim();

    // Extract quality
    const qualityMatch = rawName.match(/\((\d{3,4}[ip])\)/);
    const quality = qualityMatch?.[1] || '';

    // Collect EXTVLCOPT headers
    const headers: Record<string, string> = {};
    let j = i + 1;
    while (j < lines.length && lines[j].trim().startsWith('#EXTVLCOPT:')) {
      const optLine = lines[j].trim();
      const optContent = optLine.replace('#EXTVLCOPT:', '');
      const colonIdx = optContent.indexOf('=');
      if (colonIdx > 0) {
        const key = optContent.substring(0, colonIdx).trim();
        const val = optContent.substring(colonIdx + 1).trim();
        if (key && val) headers[key] = val;
      }
      j++;
    }

    // Find URL line
    let streamUrl = '';
    while (j < lines.length) {
      const urlLine = lines[j].trim();
      if (urlLine && !urlLine.startsWith('#')) {
        streamUrl = urlLine;
        break;
      }
      if (urlLine.startsWith('#EXTINF')) break; // next channel
      j++;
    }

    if (streamUrl && cleanName) {
      // Deduplicate by normalized name
      const normalizedName = cleanName.toLowerCase().replace(/[\s\-_.]/g, '');
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        channels.push({
          name: cleanName,
          streamUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          tvgId,
          quality,
        });
      }
    }

    i = j + 1;
  }

  return channels;
}

export async function GET() {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(IPTV_ORG_URL, {
      next: { revalidate: 1800 }, // 30 min cache
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const m3uText = await response.text();
    const channels = parseM3U(m3uText);

    cachedData = {
      channels,
      updatedAt: new Date().toISOString(),
    };
    cacheTime = Date.now();

    return NextResponse.json(cachedData);
  } catch (error) {
    // Return stale cache if available, otherwise error
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    return NextResponse.json(
      { error: 'Failed to fetch channel data', channels: [] },
      { status: 500 }
    );
  }
}
