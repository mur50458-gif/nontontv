'use client';

import { useState, useEffect, useCallback } from 'react';
import { channels as staticChannels, TVChannel } from '@/lib/channels';

interface IptvChannel {
  name: string;
  streamUrl: string;
  headers?: Record<string, string>;
  tvgId: string;
  quality: string;
}

interface UpdateResult {
  channels: TVChannel[];
  updatedCount: number;
  newCount: number;
  updatedAt: string | null;
  isUpdating: boolean;
  lastError: string | null;
}

// Normalize channel name for matching
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/tv/g, '')  // remove "tv" for better matching
    .replace(/\d{3,4}[ip]/g, '') // remove quality
    .trim();
}

// Category mapping based on channel name patterns
function guessCategory(name: string, tvgId: string): string {
  const n = name.toLowerCase();
  const id = tvgId.toLowerCase();

  if (id.includes('tvri') || n.includes('tvri')) return 'tvri';
  if (n.includes('sport') || n.includes('spottv') || n.includes('spoto')) return 'olahraga';
  if (n.includes('kids') || n.includes('nickelodeon') || n.includes('kidz') || n.includes('ananda')) return 'anak';
  if (n.includes('music') || n.includes('musik') || n.includes('madu') || n.includes('izzah') || n.includes('lingkar')) return 'musik';
  if (n.includes('dakwah') || n.includes('islam') || n.includes('al-') || n.includes('rodja') || n.includes('mqtv') || n.includes('mta') || n.includes('dhamma') || n.includes('angel') || n.includes('wesal') || n.includes('salam') || n.includes('nabawi') || n.includes('madani') || n.includes('ashiil') || n.includes('mui')) return 'religi';
  if (n.includes('berita') || n.includes('news') || n.includes('cnbc') || n.includes('kompas') || n.includes('metro') || n.includes('sindo') || n.includes('magna') || n.includes('btv') || n.includes('jakarta globe') || n.includes('beritasatu') || n.includes('sinpo') || n.includes('radar') || n.includes('one')) return 'berita';
  if (n.includes('biznet') || n.includes('idx') || n.includes('parlemen') || n.includes('mbg')) return 'bisnis';
  if (n.includes('lifestyle') || n.includes('gaya') || n.includes('salira') || n.includes('allegro')) return 'gaya_hidup';
  if (n.includes('ficom') || n.includes('indonesiana') || n.includes('elshinta') || n.includes('u channel') || n.includes('utv')) return 'hiburan';
  
  // Check for regional patterns
  const regionKeywords = ['bandung', 'jogja', 'yogya', 'semarang', 'surabaya', 'bali', 'banjar', 'batam', 'banten',
    'pontianak', 'samarinda', 'padang', 'riau', 'makassar', 'manado', 'kawanua', 'jambi', 'balikpapan',
    'banyumas', 'caruban', 'dhoho', 'duta', 'jtv', 'jek', 'matrix', 'kilisuci', 'astro blitar',
    'tvku', 'ugtv', 'jak tv', 'efarina', 'brtv', 'stara', 'sriwijaya', 'huma betang', 'bungo',
    'celebes', 'fajar', 'tatv', 'timor', 'davika', 'astha', 'tv9', 'sakti', 'sm tv', 'tv mu',
    'ktv', 'rinjani', 'rctv', 'pktv', 'atambua', 'ubtv', 'vtv', 'jawa pos', 'ntt', 'ntb',
    'gorontalo', 'maluku', 'papua', 'sulawesi', 'kalimantan', 'sumatera', 'aceh', 'bengkulu',
    'lampung', 'bangka', 'tangerang', 'bogor', 'cirebon', 'tasik', 'cianjur', 'bojonegoro', 'parahyangan',
    'rri'];
  
  for (const kw of regionKeywords) {
    if (n.includes(kw)) return 'daerah';
  }

  // Major national channels
  const nationalKeywords = ['rcti', 'sctv', 'indosiar', 'trans', 'gtv', 'mnc', 'mdtv', 'garuda', 'daai',
    'nusantara', 'moji', 'antv', 'rajawali'];
  for (const kw of nationalKeywords) {
    if (n.includes(kw)) return 'nasional';
  }

  return 'daerah'; // default to daerah
}

// Region mapping
function guessRegion(name: string, tvgId: string): string {
  const n = name.toLowerCase();
  
  const regionMap: Record<string, string[]> = {
    'Aceh': ['aceh'],
    'Sumatera Utara': ['sumatera utara', 'sumut', 'medan', 'north sumatra'],
    'Sumatera Barat': ['sumatera barat', 'sumbar', 'padang', 'minang'],
    'Riau': ['riau', 'batam', 'pekanbaru'],
    'Jambi': ['jambi', 'bungo', 'izzah'],
    'Sumatera Selatan': ['sumatera selatan', 'sumsel', 'sriwijaya', 'palembang'],
    'Bengkulu': ['bengkulu'],
    'Lampung': ['lampung', 'radar lampung', 'radar tv'],
    'Bangka Belitung': ['bangka', 'babel', 'belitung'],
    'Banten': ['banten', 'efarina', 'tangerang'],
    'DKI Jakarta': ['jakarta', 'jaktv', 'jak tv', 'ugtv'],
    'Jawa Barat': ['jawa barat', 'jabar', 'bandung', 'bogor', 'cirebon', 'salira', 'davika', 'brtv', 'tasik', 'cianjur', 'parahyangan'],
    'Jawa Tengah': ['jawa tengah', 'jateng', 'semarang', 'banyumas', 'caruban', 'tatv', 'sakti', 'tvku'],
    'DI Yogyakarta': ['yogya', 'jogja', 'matrix'],
    'Jawa Timur': ['jawa timur', 'jatim', 'surabaya', 'malang', 'kediri', 'dhoho', 'jtv', 'jek', 'kilisuci', 'astro blitar', 'dmtv', 'sm tv', 'tv mu', 'rctv', 'tv9', 'astha', 'ubtv', 'bojonegoro', 'madiun'],
    'Bali': ['bali'],
    'Nusa Tenggara Barat': ['ntb', 'nusa tenggara barat', 'rinjani', 'lombok'],
    'Nusa Tenggara Timur': ['ntt', 'nusa tenggara timur', 'timor', 'atambua', 'kupang', 'flores'],
    'Kalimantan Barat': ['kalimantan barat', 'kalbar', 'pontianak', 'pontv'],
    'Kalimantan Tengah': ['kalimantan tengah', 'kalteng', 'palangkaraya', 'huma betang'],
    'Kalimantan Selatan': ['kalimantan selatan', 'kalsel', 'banjar', 'banjarmasin', 'tabalong'],
    'Kalimantan Timur': ['kalimantan timur', 'kaltim', 'samarinda', 'balikpapan', 'stv'],
    'Sulawesi Utara': ['sulawesi utara', 'sulut', 'manado', 'kawanua'],
    'Gorontalo': ['gorontalo'],
    'Sulawesi Barat': ['sulawesi barat', 'sulbar'],
    'Sulawesi Tengah': ['sulawesi tengah', 'sulteng'],
    'Sulawesi Selatan': ['sulawesi selatan', 'sulsel', 'makassar', 'celebes', 'fajar'],
    'Sulawesi Tenggara': ['sulawesi tenggara', 'sultra'],
    'Maluku': ['maluku', 'ambon'],
    'Papua': ['papua'],
    'Papua Barat': ['papua barat', 'west papua'],
  };

  for (const [region, keywords] of Object.entries(regionMap)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return region;
    }
  }

  // TVRI regions from tvgId
  if (tvgId.includes('TVRI')) {
    const tvgIdRegionMap: Record<string, string> = {
      'Aceh': 'Aceh', 'Sumut': 'Sumatera Utara', 'Sumbar': 'Sumatera Barat',
      'Riau': 'Riau', 'Jambi': 'Jambi', 'Sumsel': 'Sumatera Selatan',
      'Bengkulu': 'Bengkulu', 'Lampung': 'Lampung', 'Babel': 'Bangka Belitung',
      'Jabar': 'Jawa Barat', 'Jateng': 'Jawa Tengah', 'Jatim': 'Jawa Timur',
      'Jogjakarta': 'DI Yogyakarta', 'Bali': 'Bali', 'NTB': 'Nusa Tenggara Barat',
      'NTT': 'Nusa Tenggara Timur', 'Kalbar': 'Kalimantan Barat',
      'Kalsel': 'Kalimantan Selatan', 'Kalteng': 'Kalimantan Tengah',
      'Kaltim': 'Kalimantan Timur', 'Sulut': 'Sulawesi Utara',
      'Gorontalo': 'Gorontalo', 'Sulbar': 'Sulawesi Barat',
      'Sulteng': 'Sulawesi Tengah', 'Sulsel': 'Sulawesi Selatan',
      'Sultra': 'Sulawesi Tenggara', 'Maluku': 'Maluku',
      'Papua': 'Papua', 'PapuaBarat': 'Papua Barat',
    };
    for (const [key, region] of Object.entries(tvgIdRegionMap)) {
      if (tvgId.includes(key)) return region;
    }
  }

  return 'Nasional';
}

// Generate logo text from name
function generateLogoText(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Generate color from name
function generateColor(name: string): string {
  const colors = ['#dc2626', '#ea580c', '#d97706', '#059669', '#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#9333ea', '#e11d48', '#b91c1c', '#1d4ed8', '#0e7490', '#16a34a', '#ca8a04'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function useAutoUpdateChannels() {
  const [result, setResult] = useState<UpdateResult>({
    channels: staticChannels,
    updatedCount: 0,
    newCount: 0,
    updatedAt: null,
    isUpdating: false,
    lastError: null,
  });

  const updateChannels = useCallback(async () => {
    setResult(prev => ({ ...prev, isUpdating: true, lastError: null }));

    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const iptvChannels: IptvChannel[] = data.channels || [];
      const updatedAt: string = data.updatedAt || new Date().toISOString();

      // Build a lookup map from static channels by normalized name
      const staticMap = new Map<string, TVChannel>();
      for (const ch of staticChannels) {
        staticMap.set(normalize(ch.name), ch);
      }

      // Merge: update stream URLs for existing channels, add new ones
      let updatedCount = 0;
      let newCount = 0;
      const mergedChannels: TVChannel[] = [...staticChannels];
      const matchedStaticIds = new Set<string>();

      for (const iptv of iptvChannels) {
        const normName = normalize(iptv.name);
        const existing = staticMap.get(normName);

        if (existing) {
          // Update existing channel's stream URL and headers
          const idx = mergedChannels.findIndex(ch => ch.id === existing.id);
          if (idx >= 0) {
            if (mergedChannels[idx].streamUrl !== iptv.streamUrl) {
              mergedChannels[idx] = {
                ...mergedChannels[idx],
                streamUrl: iptv.streamUrl,
                headers: iptv.headers || mergedChannels[idx].headers,
              };
              updatedCount++;
            }
            matchedStaticIds.add(existing.id);
          }
        } else {
          // New channel not in static list
          const category = guessCategory(iptv.name, iptv.tvgId);
          const region = guessRegion(iptv.name, iptv.tvgId);
          const newChannel: TVChannel = {
            id: `iptv_${normName}`,
            name: iptv.name,
            category,
            description: `${iptv.name} - Siaran TV Indonesia${iptv.quality ? ` (${iptv.quality})` : ''}`,
            streamUrl: iptv.streamUrl,
            logoText: generateLogoText(iptv.name),
            color: generateColor(iptv.name),
            region,
            headers: iptv.headers,
          };
          mergedChannels.push(newChannel);
          newCount++;
        }
      }

      setResult({
        channels: mergedChannels,
        updatedCount,
        newCount,
        updatedAt,
        isUpdating: false,
        lastError: null,
      });
    } catch (err) {
      setResult(prev => ({
        ...prev,
        isUpdating: false,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  // Auto-update on mount and every 30 minutes
  useEffect(() => {
    updateChannels();
    const interval = setInterval(updateChannels, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateChannels]);

  return result;
}
