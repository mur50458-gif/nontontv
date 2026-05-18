import { NextResponse } from 'next/server';

// In-memory cache
let cachedData: { channels: TVChannelData[]; updatedAt: string; totalFromSource: number } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface TVChannelData {
  id: string;
  name: string;
  category: string;
  description: string;
  streamUrl: string;
  logoText: string;
  color: string;
  region: string;
  headers?: Record<string, string>;
  quality?: string;
  isNot247?: boolean;
}

interface ParsedChannel {
  name: string;
  streamUrl: string;
  headers?: Record<string, string>;
  tvgId: string;
  quality: string;
  isNot247: boolean;
}

const IPTV_ORG_URL = 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/id.m3u';

// ---- Parsing ----
function parseM3U(m3uText: string): ParsedChannel[] {
  const lines = m3uText.split('\n');
  const channels: ParsedChannel[] = [];
  const seen = new Map<string, ParsedChannel>(); // normalized name -> channel, prefer higher quality

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) {
      i++;
      continue;
    }

    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    const tvgId = tvgIdMatch?.[1] || '';
    const nameMatch = line.match(/,(.+)$/);
    const rawName = nameMatch?.[1]?.trim() || '';

    // Clean name
    const cleanName = rawName
      .replace(/\s*\(\d{3,4}[ip]\)\s*/g, '')
      .replace(/\s*\(\d{3,4}i\)\s*/g, '')
      .replace(/\s*\[Not 24\/7\]\s*/g, '')
      .replace(/\s*\(Am Media\)\s*/g, '')
      .trim();

    const qualityMatch = rawName.match(/\((\d{3,4}[ip])\)/);
    const quality = qualityMatch?.[1] || '';
    const isNot247 = rawName.includes('[Not 24/7]');

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
      if (urlLine.startsWith('#EXTINF')) break;
      j++;
    }

    if (streamUrl && cleanName) {
      const normalizedName = cleanName.toLowerCase().replace(/[\s\-_.]/g, '');
      
      // Prefer higher quality or same quality with headers
      const existing = seen.get(normalizedName);
      const qualityScore = getQualityScore(quality);
      const existingScore = existing ? getQualityScore(existing.quality) : 0;
      
      // Prefer: 1) higher quality, 2) not marked as not-24/7, 3) with headers for referrer
      if (!existing || qualityScore > existingScore || 
          (qualityScore === existingScore && !isNot247 && existing.isNot247) ||
          (qualityScore === existingScore && Object.keys(headers).length > 0 && !existing.headers)) {
        seen.set(normalizedName, {
          name: cleanName,
          streamUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          tvgId,
          quality,
          isNot247,
        });
      }
    }

    i = j + 1;
  }

  return Array.from(seen.values());
}

function getQualityScore(quality: string): number {
  const match = quality.match(/(\d+)/);
  if (!match) return 0;
  return parseInt(match[1]);
}

// ---- Categorization ----
function guessCategory(name: string, tvgId: string): string {
  const n = name.toLowerCase();
  const id = tvgId.toLowerCase();

  // TVRI (must check first)
  if (id.includes('tvri') || (n.includes('tvri') && !n.includes('sport'))) return 'tvri';
  if (id.includes('TVRISport') || (n.includes('tvri') && n.includes('sport'))) return 'olahraga';

  // National channels (check BEFORE regional - these are major national stations)
  const nationalKeywords = ['rcti', 'sctv', 'indosiar', 'trans7', 'trans tv', 'gtv', 'mnc', 'mdtv', 'garuda', 'daai',
    'nusantara tv', 'moji', 'antv', 'rajawali tv', 'nickelodeon', 'my kidz'];
  for (const kw of nationalKeywords) {
    if (n.includes(kw)) return 'nasional';
  }
  // Also check tvgId for national channels
  const nationalTvgIds = ['RCTI.id', 'SCTV.id', 'Indosiar.id', 'Trans7.id', 'TransTV.id', 'GTV.id', 'MNCTV.id',
    'MDTV.id', 'GarudaTV.id', 'DAAITV.id', 'NusantaraTV.id', 'ANTV.id', 'RajawaliTV.id',
    'Nickelodeon.id', 'MyKidz.id'];
  for (const kw of nationalTvgIds) {
    if (tvgId.includes(kw)) return 'nasional';
  }

  // Sports
  if (n.includes('sport') || n.includes('spotv') || id.toLowerCase().includes('spotv')) return 'olahraga';

  // Kids
  if (n.includes('kids') || n.includes('kidz') || n.includes('ananda')) return 'anak';

  // Music
  if (n.includes('music') || n.includes('musik') || n.includes('madu') || n.includes('izzah') || n.includes('lingkar')) return 'musik';

  // Religion
  if (n.includes('dakwah') || n.includes('islam') || n.includes('al-') || n.includes('rodja') || n.includes('mqtv') || n.includes('mta') || n.includes('dhamma') || n.includes('angel') || n.includes('wesal') || n.includes('salam') || n.includes('nabawi') || n.includes('madani') || n.includes('ashiil') || n.includes('mui') || n.includes('surau')) return 'religi';

  // News
  if (n.includes('berita') || n.includes('news') || n.includes('cnbc') || n.includes('kompas') || n.includes('metro') || n.includes('sindo') || n.includes('magna') || n.includes('btv') || n.includes('jakarta globe') || n.includes('beritasatu') || n.includes('sinpo') || n.includes('radar') || n.includes('one') || n.includes('idtv')) return 'berita';

  // Business
  if (n.includes('biznet') || n.includes('idx') || n.includes('parlemen') || n.includes('mbg')) return 'bisnis';

  // Lifestyle
  if (n.includes('lifestyle') || n.includes('gaya') || n.includes('salira') || n.includes('allegro')) return 'gaya_hidup';

  // Entertainment
  if (n.includes('ficom') || n.includes('indonesiana') || n.includes('elshinta') || n.includes('u channel') || n.includes('utv') || id.includes('UChannel')) return 'hiburan';

  // Regional patterns (check AFTER all other categories)
  const regionKeywords = ['bandung', 'jogja', 'yogya', 'semarang', 'surabaya', 'bali', 'banjar', 'batam', 'banten',
    'pontianak', 'samarinda', 'padang', 'riau', 'makassar', 'manado', 'kawanua', 'jambi', 'balikpapan',
    'banyumas', 'caruban', 'dhoho', 'duta', 'jtv', 'jek', 'matrix', 'kilisuci', 'astro blitar',
    'tvku', 'ugtv', 'jak tv', 'efarina', 'brtv', 'stara', 'sriwijaya', 'huma betang', 'bungo',
    'celebes', 'fajar', 'tatv', 'timor', 'davika', 'astha', 'tv9', 'sakti', 'sm tv', 'tv mu',
    'ktv', 'rinjani', 'rctv', 'pktv', 'atambua', 'ubtv', 'vtv', 'jawa pos', 'ntt', 'ntb',
    'gorontalo', 'maluku', 'papua', 'sulawesi', 'kalimantan', 'sumatera', 'aceh', 'bengkulu',
    'lampung', 'bangka', 'tangerang', 'bogor', 'cirebon', 'tasik', 'cianjur', 'bojonegoro', 'parahyangan',
    'rri', 'puja', 'sampit', 'sangaji', 'selaparang', 'simpang5', 'sultra', 'tegar',
    'pjtv', 'mgi', 'mgs', 'online tv'];

  for (const kw of regionKeywords) {
    if (n.includes(kw)) return 'daerah';
  }

  // Default for known TV channels
  if (id.includes('.id@')) return 'daerah';

  return 'daerah';
}

// ---- Region mapping ----
function guessRegion(name: string, tvgId: string): string {
  const n = name.toLowerCase();
  const id = tvgId.toLowerCase();

  const regionMap: Record<string, string[]> = {
    'Aceh': ['aceh', 'puja tv'],
    'Sumatera Utara': ['sumatera utara', 'sumut', 'medan', 'north sumatra'],
    'Sumatera Barat': ['sumatera barat', 'sumbar', 'padang', 'minang', 'west sumatra'],
    'Riau': ['riau', 'batam'],
    'Jambi': ['jambi', 'bungo', 'izzah'],
    'Sumatera Selatan': ['sumatera selatan', 'sumsel', 'sriwijaya', 'palembang', 'south sumatra'],
    'Bengkulu': ['bengkulu', 'rakyat bengkulu'],
    'Lampung': ['lampung', 'radar lampung', 'radar tv', 'tegar'],
    'Bangka Belitung': ['bangka', 'babel', 'belitung'],
    'Banten': ['banten', 'efarina', 'tangerang'],
    'DKI Jakarta': ['jakarta', 'jaktv', 'jak tv', 'ugtv'],
    'Jawa Barat': ['jawa barat', 'jabar', 'bandung', 'bogor', 'cirebon', 'salira', 'davika', 'brtv', 'tasik', 'cianjur', 'parahyangan', 'pjtv', 'mgi', 'west java'],
    'Jawa Tengah': ['jawa tengah', 'jateng', 'semarang', 'banyumas', 'caruban', 'tatv', 'sakti', 'tvku', 'central java'],
    'DI Yogyakarta': ['yogya', 'jogja', 'matrix'],
    'Jawa Timur': ['jawa timur', 'jatim', 'surabaya', 'malang', 'kediri', 'dhoho', 'jtv', 'jek', 'kilisuci', 'astro blitar', 'dmtv', 'sm tv', 'tv mu', 'rctv', 'tv9', 'astha', 'ubtv', 'bojonegoro', 'madiun', 'magelang', 'pktv', 'east java'],
    'Bali': ['bali', 'jawa pos tv bali'],
    'Nusa Tenggara Barat': ['ntb', 'nusa tenggara barat', 'rinjani', 'lombok', 'selaparang', 'west nusa tenggara'],
    'Nusa Tenggara Timur': ['ntt', 'nusa tenggara timur', 'timor', 'atambua', 'kupang', 'flores', 'east nusa tenggara'],
    'Kalimantan Barat': ['kalimantan barat', 'kalbar', 'pontianak', 'pontv', 'west kalimantan'],
    'Kalimantan Tengah': ['kalimantan tengah', 'kalteng', 'palangkaraya', 'huma betang', 'sampit', 'central kalimantan'],
    'Kalimantan Selatan': ['kalimantan selatan', 'kalsel', 'banjar', 'banjarmasin', 'tabalong', 'south kalimantan'],
    'Kalimantan Timur': ['kalimantan timur', 'kaltim', 'samarinda', 'balikpapan', 'stv', 'east kalimantan'],
    'Sulawesi Utara': ['sulawesi utara', 'sulut', 'manado', 'kawanua', 'north sulawesi'],
    'Gorontalo': ['gorontalo'],
    'Sulawesi Barat': ['sulawesi barat', 'sulbar', 'west sulawesi'],
    'Sulawesi Tengah': ['sulawesi tengah', 'sulteng', 'central sulawesi'],
    'Sulawesi Selatan': ['sulawesi selatan', 'sulsel', 'makassar', 'celebes', 'fajar', 'south sulawesi'],
    'Sulawesi Tenggara': ['sulawesi tenggara', 'sultra', 'southeast sulawesi'],
    'Maluku': ['maluku', 'ambon'],
    'Papua': ['papua'],
    'Papua Barat': ['papua barat', 'west papua', 'west papua'],
  };

  for (const [region, keywords] of Object.entries(regionMap)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return region;
    }
  }

  // TVRI regions from tvgId
  if (id.includes('tvri')) {
    const tvgIdRegionMap: Record<string, string> = {
      'Aceh': 'Aceh', 'Sumut': 'Sumatera Utara', 'Sumbar': 'Sumatera Barat',
      'Riau': 'Riau', 'Jambi': 'Jambi', 'Sumsel': 'Sumatera Selatan',
      'Bengkulu': 'Bengkulu', 'Lampung': 'Lampung', 'Babel': 'Bangka Belitung',
      'Jabar': 'Jawa Barat', 'Jateng': 'Jawa Tengah', 'Jatim': 'Jawa Timur',
      'Jogjakarta': 'DI Yogyakarta', 'DKI': 'DKI Jakarta', 'Bali': 'Bali',
      'NTB': 'Nusa Tenggara Barat', 'NTT': 'Nusa Tenggara Timur',
      'Kalbar': 'Kalimantan Barat', 'Kalsel': 'Kalimantan Selatan',
      'Kalteng': 'Kalimantan Tengah', 'Kaltim': 'Kalimantan Timur',
      'Sulut': 'Sulawesi Utara', 'Gorontalo': 'Gorontalo',
      'Sulbar': 'Sulawesi Barat', 'Sulteng': 'Sulawesi Tengah',
      'Sulsel': 'Sulawesi Selatan', 'Sultra': 'Sulawesi Tenggara',
      'Maluku': 'Maluku', 'Ambon': 'Maluku', 'Papua': 'Papua',
      'Pabar': 'Papua Barat',
    };
    for (const [key, region] of Object.entries(tvgIdRegionMap)) {
      if (id.includes(key)) return region;
    }
  }

  return 'Nasional';
}

// ---- Generate metadata ----
function generateLogoText(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function generateColor(name: string): string {
  const colors = ['#dc2626', '#ea580c', '#d97706', '#059669', '#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#9333ea', '#e11d48', '#b91c1c', '#1d4ed8', '#0e7490', '#16a34a', '#ca8a04'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function generateDescription(name: string, category: string, region: string, quality: string): string {
  const categoryDescriptions: Record<string, string> = {
    'nasional': 'Siaran TV nasional Indonesia',
    'berita': 'Siaran TV berita Indonesia',
    'hiburan': 'Siaran TV hiburan Indonesia',
    'anak': 'Siaran TV anak dan keluarga',
    'olahraga': 'Siaran TV olahraga',
    'musik': 'Siaran TV musik dan hiburan',
    'religi': 'Siaran TV dakwah dan religi',
    'daerah': `Siaran TV lokal ${region}`,
    'tvri': 'Siaran TVRI - TV publik Indonesia',
    'gaya_hidup': 'Siaran TV gaya hidup',
    'bisnis': 'Siaran TV bisnis dan ekonomi',
  };
  const base = categoryDescriptions[category] || 'Siaran TV Indonesia';
  const qualitySuffix = quality ? ` (${quality})` : '';
  return `${name} - ${base}${qualitySuffix}`;
}

function generateId(name: string, tvgId: string): string {
  // Use tvgId-based ID if available for stable identification
  if (tvgId) {
    return tvgId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
  return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

// ---- Build channel data ----
function buildChannels(parsed: ParsedChannel[]): TVChannelData[] {
  const seenIds = new Map<string, TVChannelData>();

  for (const ch of parsed) {
    const id = generateId(ch.name, ch.tvgId);
    const category = guessCategory(ch.name, ch.tvgId);
    const region = guessRegion(ch.name, ch.tvgId);
    
    // If same ID already exists, prefer the one with better quality
    const existing = seenIds.get(id);
    const newQualityScore = getQualityScore(ch.quality);
    const existingQualityScore = existing ? getQualityScore(existing.quality || '') : 0;
    
    if (!existing || newQualityScore > existingQualityScore) {
      seenIds.set(id, {
        id,
        name: ch.name,
        category,
        description: generateDescription(ch.name, category, region, ch.quality),
        streamUrl: ch.streamUrl,
        logoText: generateLogoText(ch.name),
        color: generateColor(ch.name),
        region,
        headers: ch.headers,
        quality: ch.quality,
        isNot247: ch.isNot247,
      });
    }
  }

  return Array.from(seenIds.values()).sort((a, b) => {
    // Sort: nasional first, then by category, then by name
    const catOrder: Record<string, number> = {
      'nasional': 0, 'berita': 1, 'hiburan': 2, 'olahraga': 3,
      'anak': 4, 'musik': 5, 'religi': 6, 'daerah': 7, 'tvri': 8,
      'gaya_hidup': 9, 'bisnis': 10,
    };
    const catDiff = (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function GET() {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(IPTV_ORG_URL, {
      next: { revalidate: 900 }, // 15 min cache for Next.js
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const m3uText = await response.text();
    const totalFromSource = (m3uText.match(/#EXTINF/g) || []).length;
    const parsed = parseM3U(m3uText);
    const channels = buildChannels(parsed);

    cachedData = {
      channels,
      updatedAt: new Date().toISOString(),
      totalFromSource,
    };
    cacheTime = Date.now();

    return NextResponse.json(cachedData);
  } catch (error) {
    // Return stale cache if available, otherwise error
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    return NextResponse.json(
      { error: 'Failed to fetch channel data', channels: [], updatedAt: new Date().toISOString(), totalFromSource: 0 },
      { status: 500 }
    );
  }
}
