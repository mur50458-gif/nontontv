import { NextResponse } from 'next/server';

// ─── Data Types ──────────────────────────────────────────────────────────────

interface TVChannelData {
  id: string;
  name: string;
  category: string;
  description: string;
  streamUrl: string;
  youtubeUrl?: string;
  logoText: string;
  color: string;
  region: string;
  logo?: string;
  headers?: Record<string, string>;
  quality?: string;
  isNot247?: boolean;
  isGeoBlocked?: boolean;
}

interface ParsedChannel {
  name: string;
  streamUrl: string;
  headers?: Record<string, string>;
  tvgId: string;
  tvgLogo: string;
  quality: string;
  isNot247: boolean;
  isGeoBlocked: boolean;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let cachedData: { channels: TVChannelData[]; updatedAt: string; totalFromSource: number } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// ─── URLs ────────────────────────────────────────────────────────────────────

const IPTV_ORG_PRIMARY = 'https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/countries/id.m3u';
const IPTV_ORG_FALLBACK = 'https://iptv-org.github.io/iptv/countries/id.m3u';

// ─── YouTube Live IDs for major Indonesian channels ─────────────────────────

const YOUTUBE_LIVE_IDS: Record<string, string> = {
  'metro tv': 'AUE5iHINUIw',
  'metrotv': 'AUE5iHINUIw',
  'tvone': 'yNKvkPJl-tg',
  'tv one': 'yNKvkPJl-tg',
  'kompas tv': 'DOOrIxw5xOw',
  'kompastv': 'DOOrIxw5xOw',
  'cnn indonesia': 'qbxprL02jWk',
  'cnnindonesia': 'qbxprL02jWk',
};

function getYoutubeUrl(name: string): string | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [pattern, videoId] of Object.entries(YOUTUBE_LIVE_IDS)) {
    const normalizedPattern = pattern.replace(/[^a-z0-9]/g, '');
    if (key === normalizedPattern || key.includes(normalizedPattern)) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;
    }
  }
  return undefined;
}

// ─── Supplementary channels NOT in iptv-org but known to work ───────────────

const SUPPLEMENTARY_CHANNELS: TVChannelData[] = [
  { id: "sctv", name: "SCTV", category: "nasional", description: "SCTV - TV swasta nasional", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/sctv/manifest.mpd", logoText: "SC", color: "#ea580c", region: "Nasional" },
  { id: "indosiar", name: "Indosiar", category: "nasional", description: "Indosiar - TV hiburan dan informasi", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/indosiar/manifest.mpd", logoText: "IS", color: "#f59e0b", region: "Nasional" },
  { id: "gtv", name: "GTV", category: "nasional", description: "GTV - Stasiun TV nasional MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/globaltv/manifest.mpd", logoText: "GT", color: "#7c3aed", region: "Nasional" },
  { id: "mnctv", name: "MNC TV", category: "nasional", description: "MNC TV - TV nasional", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mnctv/manifest.mpd", logoText: "MN", color: "#ea580c", region: "Nasional" },
  { id: "inews", name: "iNews", category: "berita", description: "iNews - TV berita MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/inews/manifest.mpd", logoText: "iN", color: "#ea580c", region: "Nasional" },
  { id: "idxchannel", name: "IDX Channel", category: "bisnis", description: "IDX Channel - TV pasar modal dan investasi", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/idx/manifest.mpd", logoText: "IX", color: "#1d4ed8", region: "Nasional" },
  { id: "jtv", name: "JTV Surabaya", category: "daerah", description: "JTV - TV lokal Surabaya", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/jtv/manifest.mpd", logoText: "JV", color: "#ea580c", region: "Jawa Timur" },
  { id: "jaktv", name: "Jak TV", category: "daerah", description: "Jak TV - TV lokal Jakarta", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/JAK_TV/manifest.mpd", logoText: "JK", color: "#0284c7", region: "DKI Jakarta" },
  { id: "balitv", name: "Bali TV", category: "daerah", description: "Bali TV - TV lokal Bali", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/balitv/manifest.mpd", logoText: "BL", color: "#f59e0b", region: "Bali" },
  { id: "mtatv", name: "MTA TV", category: "religi", description: "MTA TV - TV Islam Ahmadiyya", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mtatv/manifest.mpd", logoText: "MT", color: "#065f46", region: "Nasional" },
  { id: "mykidz", name: "My Kidz", category: "nasional", description: "My Kidz - Channel anak-anak", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mykids/manifest.mpd", logoText: "MK", color: "#ec4899", region: "Nasional" },
  { id: "sinpotv", name: "Sin Po TV", category: "berita", description: "Sin Po TV - TV berita dan olahraga", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/sinpotv/manifest.mpd", logoText: "SP", color: "#9333ea", region: "Nasional" },
  { id: "sindonews", name: "Sindo News TV", category: "berita", description: "Sindo News TV - TV berita MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mncnews/manifest.mpd", logoText: "SN", color: "#b91c1c", region: "Nasional" },
  { id: "nickelodeon", name: "Nickelodeon", category: "nasional", description: "Nickelodeon Asia - TV anak dan kartun", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/nickelodeon/manifest.mpd", logoText: "NK", color: "#f59e0b", region: "Nasional" },
  { id: "metrotv", name: "Metro TV", category: "berita", description: "Metro TV - Stasiun TV berita pertama di Indonesia", streamUrl: "https://edge.medcom.id/live-edge/smil:metro.smil/playlist.m3u8", youtubeUrl: "https://www.youtube.com/embed/AUE5iHINUIw?autoplay=1&mute=1&playsinline=1", logoText: "MT", color: "#0284c7", region: "Nasional" },
  { id: "kompastv", name: "Kompas TV", category: "berita", description: "Kompas TV - TV berita terpercaya", streamUrl: "https://wahyu1ptv.pages.dev/KompasTV-HD.m3u8", youtubeUrl: "https://www.youtube.com/embed/DOOrIxw5xOw?autoplay=1&mute=1&playsinline=1", logoText: "KT", color: "#1d4ed8", region: "Nasional" },
  { id: "beritasatu", name: "BeritaSatu", category: "berita", description: "BeritaSatu - TV berita 24 jam", streamUrl: "https://beritasatu.secureswiftcontent.com/han/beritasatu/bsatu10008r/srtoutput/manifest.m3u8", logoText: "BS", color: "#0e7490", region: "Nasional" },
  { id: "btv", name: "BTV", category: "berita", description: "BTV - TV berita Indonesia", streamUrl: "https://btv.secureswiftcontent.com/han/btv/btv10005r/srtoutput/manifest.m3u8", logoText: "BV", color: "#dc2626", region: "Nasional" },
  { id: "cnbcindonesia", name: "CNBC Indonesia", category: "berita", description: "CNBC Indonesia - TV berita bisnis dan pasar modal", streamUrl: "https://live.cnbcindonesia.com/livecnbc/smil:cnbctv.smil/master.m3u8", logoText: "CB", color: "#0e7490", region: "Nasional" },
  { id: "cnnindonesia", name: "CNN Indonesia", category: "berita", description: "CNN Indonesia - TV berita 24 jam", streamUrl: "https://live.cnnindonesia.com/livecnbc/smil:cnbctv.smil/master.m3u8", youtubeUrl: "https://www.youtube.com/embed/qbxprL02jWk?autoplay=1&mute=1&playsinline=1", logoText: "CI", color: "#dc2626", region: "Nasional" },
  { id: "jakartaglobe", name: "Jakarta Globe News", category: "berita", description: "Jakarta Globe News Channel", streamUrl: "https://jktglobe.secureswiftcontent.com/han/jktglobe/jktglober/srtoutput/manifest.m3u8", logoText: "JG", color: "#0284c7", region: "Nasional" },
  { id: "saliratv", name: "Salira TV", category: "gaya_hidup", description: "Salira TV - TV budaya dan gaya hidup Sunda", streamUrl: "https://live.salira.tv/p/3870/hybrid/play.m3u8", logoText: "SA", color: "#0e7490", region: "Jawa Barat" },
  { id: "allegro", name: "Allegro", category: "gaya_hidup", description: "Allegro - Channel gaya hidup", streamUrl: "https://vodcdn.bamboo-cloud.com/livehls/68c525e1063044539b09c253/master.m3u8", logoText: "AL", color: "#7c3aed", region: "Nasional", headers: { "http-referrer": "https://allegrotelkomvision.renderforestsites.com/" } },
  { id: "tvrparlemen", name: "TVR Parlemen", category: "bisnis", description: "TVR Parlemen - TV parlemen Indonesia", streamUrl: "https://ssv1.dpr.go.id/golive/livestream/playlist.m3u8", logoText: "VP", color: "#0e7490", region: "Nasional" },
  { id: "tvrisport", name: "TVRI Sport", category: "olahraga", description: "TVRI Sport - Channel olahraga Indonesia", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/SportHD/hls/SportHD.m3u8", logoText: "TS", color: "#dc2626", region: "Nasional" },
  { id: "angeltv", name: "Angel TV", category: "religi", description: "Angel TV Indonesia - TV Kristiani", streamUrl: "https://janya-digimix.akamaized.net/vglive-sk-234616/indonesia/ngrp:angelindonesia_all/playlist.m3u8", logoText: "AG", color: "#7c3aed", region: "Nasional" },
  { id: "iamchannel", name: "I Am Channel", category: "religi", description: "I Am Channel - TV Kristiani Indonesia", streamUrl: "https://61146e7ab7a66.streamlock.net:8089/tes/1/chunklist.m3u8", logoText: "IA", color: "#0369a1", region: "Nasional", headers: { "http-referrer": "https://iamchannel.org/" } },
];

// ─── M3U Parsing ─────────────────────────────────────────────────────────────

function parseM3U(m3uText: string): ParsedChannel[] {
  const lines = m3uText.split('\n');
  const seen = new Map<string, ParsedChannel>();

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
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    const tvgLogo = tvgLogoMatch?.[1] || '';

    // Extract name: find the LAST comma that appears after all quoted attributes.
    // The M3U format puts channel name after the last comma, but http-user-agent
    // attributes can contain commas (e.g., "KHTML, like Gecko"), so we need to
    // handle that by finding the last comma that comes after the group-title attribute.
    // Strategy: find group-title="..." and take everything after the last comma following it.
    const groupTitleMatch = line.match(/group-title="[^"]*"/);
    let rawName = '';
    if (groupTitleMatch) {
      const afterGroupTitle = line.substring(groupTitleMatch.index! + groupTitleMatch[0].length);
      const commaIdx = afterGroupTitle.indexOf(',');
      if (commaIdx >= 0) {
        rawName = afterGroupTitle.substring(commaIdx + 1).trim();
      }
    }
    // Fallback: if no group-title found, use the last comma approach
    if (!rawName) {
      // Find the last comma that's not inside quotes
      const lastCommaIdx = line.lastIndexOf(',');
      if (lastCommaIdx >= 0) {
        rawName = line.substring(lastCommaIdx + 1).trim();
      }
    }

    // Clean name - remove quality tags, not 24/7 markers, geo-blocked markers
    const cleanName = rawName
      .replace(/\s*\(\d{3,4}[ip]\)\s*/g, '')
      .replace(/\s*\(\d{3,4}i\)\s*/g, '')
      .replace(/\s*\[Not 24\/7\]\s*/g, '')
      .replace(/\s*\(Am Media\)\s*/g, '')
      .replace(/\s*\[Geo-blocked\]\s*/g, '')
      .trim();

    const qualityMatch = rawName.match(/\((\d{3,4}[ip])\)/);
    const quality = qualityMatch?.[1] || '';
    const isNot247 = rawName.includes('[Not 24/7]');
    const isGeoBlocked = rawName.includes('[Geo-blocked]');

    // Parse EXTVLCOPT headers
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

    // Find stream URL
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

      const existing = seen.get(normalizedName);
      const qualityScore = getQualityScore(quality);
      const existingScore = existing ? getQualityScore(existing.quality) : 0;

      // Keep the best quality version; prefer non-geo-blocked over geo-blocked
      if (!existing || qualityScore > existingScore ||
          (qualityScore === existingScore && !isGeoBlocked && existing.isGeoBlocked) ||
          (qualityScore === existingScore && !isNot247 && existing.isNot247) ||
          (qualityScore === existingScore && Object.keys(headers).length > 0 && !existing.headers)) {
        seen.set(normalizedName, {
          name: cleanName,
          streamUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          tvgId,
          tvgLogo,
          quality,
          isNot247,
          isGeoBlocked,
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

// ─── Categorization ──────────────────────────────────────────────────────────

function guessCategory(name: string, tvgId: string): string {
  const n = name.toLowerCase();
  const id = tvgId.toLowerCase();

  // TVRI channels (except sport)
  if (id.includes('tvri') || (n.includes('tvri') && !n.includes('sport'))) return 'tvri';
  if (n.includes('tvri') && n.includes('sport')) return 'olahraga';

  // National channels
  const nationalKeywords = ['rcti', 'sctv', 'indosiar', 'trans7', 'trans tv', 'gtv', 'mnc tv', 'mnctv', 'mdtv', 'garuda', 'daai',
    'nusantara tv', 'moji', 'antv', 'rajawali tv', 'nickelodeon', 'my kidz'];
  for (const kw of nationalKeywords) {
    if (n.includes(kw)) return 'nasional';
  }
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

  // Religious
  if (n.includes('dakwah') || n.includes('islam') || n.includes('al-') || n.includes('rodja') || n.includes('mqtv') || n.includes('mta') ||
      n.includes('dhamma') || n.includes('angel') || n.includes('wesal') || n.includes('salam') || n.includes('nabawi') ||
      n.includes('madani') || n.includes('ashiil') || n.includes('mui') || n.includes('surau') || n.includes('tawaf') ||
      n.includes('bahjah') || n.includes('imantv')) return 'religi';

  // News
  if (n.includes('berita') || n.includes('news') || n.includes('cnbc') || n.includes('cnn') || n.includes('kompas') || n.includes('metro') ||
      n.includes('sindo') || n.includes('magna') || n.includes('btv') || n.includes('jakarta globe') || n.includes('beritasatu') ||
      n.includes('sinpo') || n.includes('radar') || n.includes('tvone') || n.includes('idtv') || n.includes('one')) return 'berita';

  // Business
  if (n.includes('biznet') || n.includes('idx') || n.includes('parlemen') || n.includes('mbg')) return 'bisnis';

  // Lifestyle
  if (n.includes('lifestyle') || n.includes('gaya') || n.includes('salira') || n.includes('allegro')) return 'gaya_hidup';

  // Entertainment
  if (n.includes('ficom') || n.includes('indonesiana') || n.includes('elshinta') || n.includes('u channel') || n.includes('utv') || id.includes('UChannel')) return 'hiburan';

  // Regional channels
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

  if (id.includes('.id@')) return 'daerah';
  return 'daerah';
}

// ─── Region Mapping ──────────────────────────────────────────────────────────

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
    'Papua Barat': ['papua barat', 'west papua'],
  };

  for (const [region, keywords] of Object.entries(regionMap)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return region;
    }
  }

  // TVRI region mapping from tvg-id
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

// ─── Generate Metadata ──────────────────────────────────────────────────────

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
  if (tvgId) {
    return tvgId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
  return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

// ─── Build Channel Data ─────────────────────────────────────────────────────

function buildChannels(parsed: ParsedChannel[]): TVChannelData[] {
  const seenIds = new Map<string, TVChannelData>();

  // Add supplementary channels first (they take priority for matching names)
  for (const ch of SUPPLEMENTARY_CHANNELS) {
    seenIds.set(ch.id, ch);
  }

  for (const ch of parsed) {
    const id = generateId(ch.name, ch.tvgId);
    const category = guessCategory(ch.name, ch.tvgId);
    const region = guessRegion(ch.name, ch.tvgId);

    // Skip if supplementary channel with same base name exists
    const baseName = ch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSupplemented = SUPPLEMENTARY_CHANNELS.some(sup =>
      sup.name.toLowerCase().replace(/[^a-z0-9]/g, '') === baseName
    );
    if (isSupplemented) continue;

    const existing = seenIds.get(id);
    const newQualityScore = getQualityScore(ch.quality);
    const existingQualityScore = existing ? getQualityScore(existing.quality || '') : 0;

    if (!existing || newQualityScore > existingQualityScore) {
      const youtubeUrl = getYoutubeUrl(ch.name);

      seenIds.set(id, {
        id,
        name: ch.name,
        category,
        description: generateDescription(ch.name, category, region, ch.quality),
        streamUrl: ch.streamUrl,
        youtubeUrl,
        logoText: generateLogoText(ch.name),
        color: generateColor(ch.name),
        region,
        logo: ch.tvgLogo || undefined,
        headers: ch.headers,
        quality: ch.quality,
        isNot247: ch.isNot247,
        isGeoBlocked: ch.isGeoBlocked,
      });
    }
  }

  return Array.from(seenIds.values()).sort((a, b) => {
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

// ─── Fetch with Fallback ────────────────────────────────────────────────────

async function fetchM3U(): Promise<string> {
  // Try primary URL first
  try {
    const response = await fetch(IPTV_ORG_PRIMARY, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Primary failed, try fallback
  }

  // Try fallback URL
  try {
    const response = await fetch(IPTV_ORG_FALLBACK, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Fallback also failed
  }

  throw new Error('Failed to fetch M3U from both primary and fallback URLs');
}

// ─── API Route ───────────────────────────────────────────────────────────────

export async function GET() {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const m3uText = await fetchM3U();
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
    console.error('Failed to fetch channels from iptv-org:', error);

    // Return cached data if available (even if stale)
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Final fallback: return supplementary channels
    return NextResponse.json({
      channels: SUPPLEMENTARY_CHANNELS,
      updatedAt: new Date().toISOString(),
      totalFromSource: SUPPLEMENTARY_CHANNELS.length,
    });
  }
}
