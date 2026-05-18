export interface TVChannel {
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

export const categories = [
  { id: "semua", name: "Semua", icon: "📺" },
  { id: "nasional", name: "Nasional", icon: "🇮🇩" },
  { id: "berita", name: "Berita", icon: "📰" },
  { id: "hiburan", name: "Hiburan", icon: "🎬" },
  { id: "anak", name: "Anak", icon: "🧸" },
  { id: "olahraga", name: "Olahraga", icon: "⚽" },
  { id: "musik", name: "Musik", icon: "🎵" },
  { id: "religi", name: "Religi", icon: "🕌" },
  { id: "daerah", name: "Daerah", icon: "🏝️" },
  { id: "tvri", name: "TVRI", icon: "📡" },
  { id: "gaya_hidup", name: "Gaya Hidup", icon: "✨" },
  { id: "bisnis", name: "Bisnis", icon: "📊" },
];

export const regions = [
  "Semua Wilayah",
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bengkulu",
  "Lampung",
  "Bangka Belitung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Barat",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Papua",
  "Papua Barat",
  "Nasional",
];

// Static channels as fallback when API is unavailable
// These use known-working stream URLs
export const channels: TVChannel[] = [
  // ===== NASIONAL =====
  { id: "rcti_hd", name: "RCTI", category: "nasional", description: "RCTI - TV swasta pertama Indonesia", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/rcti/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCE9-bV_MCGgLnH7v4HSApDg&autoplay=1&mute=1&playsinline=1", logoText: "RC", color: "#dc2626", region: "Nasional" },
  { id: "sctv", name: "SCTV", category: "nasional", description: "SCTV - Stasiun TV swasta nasional", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/sctv/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UC_vsErcsq56hOscPHkG-aVw&autoplay=1&mute=1&playsinline=1", logoText: "SC", color: "#ea580c", region: "Nasional" },
  { id: "indosiar", name: "Indosiar", category: "nasional", description: "Indosiar - TV hiburan dan informasi", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/indosiar/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCYqOeAXJm8yV9sJ8Ud3cR7A&autoplay=1&mute=1&playsinline=1", logoText: "IS", color: "#f59e0b", region: "Nasional" },
  { id: "gtv", name: "GTV", category: "nasional", description: "GTV - Stasiun TV nasional MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/globaltv/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCZgAny8kv3i7n_DdvTQznAA&autoplay=1&mute=1&playsinline=1", logoText: "GT", color: "#7c3aed", region: "Nasional" },
  { id: "mnctv", name: "MNC TV", category: "nasional", description: "MNC TV - TV nasional", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mnctv/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UC34xi8JB1AKSotPUKHywbaA&autoplay=1&mute=1&playsinline=1", logoText: "MN", color: "#ea580c", region: "Nasional" },
  { id: "mdtv", name: "MDTV", category: "nasional", description: "MDTV - Stasiun TV nasional Indonesia", streamUrl: "https://wahyu1ptv.pages.dev/MDTV-HD.m3u8", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCzTsWuCdVP_vehWyGwPcS3Q&autoplay=1&mute=1&playsinline=1", logoText: "MD", color: "#d97706", region: "Nasional" },
  { id: "antv", name: "ANTV", category: "nasional", description: "ANTV - TV nasional Indonesia", streamUrl: "http://103.58.160.157:8278/720-ANTV/playlist.m3u8", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCD647QRWm5P34V34Aljt1cw&autoplay=1&mute=1&playsinline=1", logoText: "AN", color: "#0284c7", region: "Nasional" },
  { id: "rajawalitv", name: "Rajawali TV", category: "nasional", description: "Rajawali TV - TV nasional Indonesia", streamUrl: "http://175.158.57.130:8888/stream/channelid/412436804", logoText: "RT", color: "#9333ea", region: "Nasional" },
  { id: "garudatv", name: "Garuda TV", category: "nasional", description: "Garuda TV - TV nasional Indonesia", streamUrl: "https://hgmtv.com:19360/garudatvlivestreaming/garudatvlivestreaming.m3u8", logoText: "GR", color: "#b91c1c", region: "Nasional" },
  { id: "daaitv", name: "DAAI TV", category: "nasional", description: "DAAI TV - TV inspirasi dan pendidikan", streamUrl: "https://pull.daaiplus.com/live-DAAIPLUS/live-DAAIPLUS_HD.m3u8", logoText: "DA", color: "#059669", region: "Nasional" },
  { id: "tvri_nasional", name: "TVRI Nasional", category: "nasional", description: "TVRI - TV publik nasional", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/Nasional/hls/Nasional.m3u8", logoText: "TV", color: "#0d9488", region: "Nasional" },
  { id: "nusantaratv", name: "Nusantara TV", category: "nasional", description: "Nusantara TV - TV nasional Indonesia", streamUrl: "https://nusantaratv.siar.us/nusantaratv/live/playlist.m3u8", logoText: "NT", color: "#0284c7", region: "Nasional" },
  { id: "nickelodeon", name: "Nickelodeon", category: "nasional", description: "Nickelodeon Asia - TV anak dan kartun", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/nickelodeon/manifest.mpd", logoText: "NK", color: "#f59e0b", region: "Nasional" },
  { id: "mykidz", name: "My Kidz", category: "nasional", description: "My Kidz - Channel anak-anak", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mykids/manifest.mpd", logoText: "MK", color: "#ec4899", region: "Nasional" },

  // ===== BERITA =====
  { id: "metrotv", name: "Metro TV", category: "berita", description: "Metro TV - Stasiun TV berita pertama di Indonesia", streamUrl: "https://edge.medcom.id/live-edge/smil:metro.smil/playlist.m3u8", youtubeUrl: "https://www.youtube.com/embed/AUE5iHINUIw?autoplay=1&mute=1&playsinline=1", logoText: "MT", color: "#0284c7", region: "Nasional" },
  { id: "tvone", name: "tvOne", category: "berita", description: "tvOne - Stasiun TV berita dan olahraga", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/tvone/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/yNKvkPJl-tg?autoplay=1&mute=1&playsinline=1", logoText: "T1", color: "#dc2626", region: "Nasional" },
  { id: "kompastv", name: "Kompas TV", category: "berita", description: "Kompas TV - TV berita terpercaya", streamUrl: "https://wahyu1ptv.pages.dev/KompasTV-HD.m3u8", youtubeUrl: "https://www.youtube.com/embed/DOOrIxw5xOw?autoplay=1&mute=1&playsinline=1", logoText: "KT", color: "#1d4ed8", region: "Nasional" },
  { id: "inews", name: "iNews", category: "berita", description: "iNews - TV berita MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/inews/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCoSkllfpgmFHtbVK835QaQg&autoplay=1&mute=1&playsinline=1", logoText: "iN", color: "#ea580c", region: "Nasional" },
  { id: "cnbcindonesia", name: "CNBC Indonesia", category: "berita", description: "CNBC Indonesia - TV berita bisnis dan pasar modal", streamUrl: "https://live.cnbcindonesia.com/livecnbc/smil:cnbctv.smil/master.m3u8", youtubeUrl: "https://www.youtube.com/embed/Q3dvI0q8NQw?autoplay=1&mute=1&playsinline=1", logoText: "CB", color: "#0e7490", region: "Nasional" },
  { id: "cnnindonesia", name: "CNN Indonesia", category: "berita", description: "CNN Indonesia - TV berita 24 jam", streamUrl: "https://live.cnbcindonesia.com/livecnbc/smil:cnbctv.smil/master.m3u8", youtubeUrl: "https://www.youtube.com/embed/qbxprL02jWk?autoplay=1&mute=1&playsinline=1", logoText: "CI", color: "#dc2626", region: "Nasional" },
  { id: "beritasatu", name: "BeritaSatu", category: "berita", description: "BeritaSatu - TV berita 24 jam", streamUrl: "https://beritasatu.secureswiftcontent.com/han/beritasatu/bsatu10008r/srtoutput/manifest.m3u8", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCqLsfkQSM0yfyGvONAGWd3Q&autoplay=1&mute=1&playsinline=1", logoText: "BS", color: "#0e7490", region: "Nasional" },
  { id: "btv", name: "BTV", category: "berita", description: "BTV - TV berita Indonesia", streamUrl: "https://btv.secureswiftcontent.com/han/btv/btv10005r/srtoutput/manifest.m3u8", logoText: "BV", color: "#dc2626", region: "Nasional" },
  { id: "sindonews", name: "Sindo News TV", category: "berita", description: "Sindo News TV - TV berita MNC Group", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mncnews/manifest.mpd", logoText: "SN", color: "#b91c1c", region: "Nasional" },
  { id: "sinpotv", name: "Sin Po TV", category: "berita", description: "Sin Po TV - TV berita dan olahraga", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/sinpotv/manifest.mpd", logoText: "SP", color: "#9333ea", region: "Nasional" },
  { id: "jakartaglobe", name: "Jakarta Globe News", category: "berita", description: "Jakarta Globe News Channel", streamUrl: "https://jktglobe.secureswiftcontent.com/han/jktglobe/jktglober/srtoutput/manifest.m3u8", logoText: "JG", color: "#0284c7", region: "Nasional" },

  // ===== HIBURAN =====
  { id: "ficom", name: "Ficom Channel", category: "hiburan", description: "Ficom Channel - TV hiburan Indonesia", streamUrl: "https://v3.siar.us/ficomchannel/live/playlist.m3u8", logoText: "FC", color: "#7c3aed", region: "Nasional" },
  { id: "indonesiana", name: "Indonesiana.TV", category: "hiburan", description: "Indonesiana.TV - TV hiburan dan budaya", streamUrl: "https://tvstreamcast.com/indonesiana.m3u8", logoText: "ID", color: "#059669", region: "Nasional", headers: { "http-referrer": "https://indonesiana.tv/" } },
  { id: "elshintatv", name: "Elshinta TV", category: "hiburan", description: "Elshinta TV - TV hiburan dan informasi", streamUrl: "https://ams.juraganstreaming.com:5443/LiveApp/streams/elshintatv.m3u8", logoText: "ES", color: "#0e7490", region: "Nasional" },
  { id: "uchannel", name: "U Channel", category: "hiburan", description: "U Channel - TV hiburan Indonesia", streamUrl: "https://ams.juraganstreaming.com:5443/LiveApp/streams/uchannel1.m3u8", logoText: "UC", color: "#059669", region: "Nasional", headers: { "http-referrer": "https://www.u-channel.tv/" } },

  // ===== ANAK =====
  { id: "biznetkids", name: "Biznet Kids", category: "anak", description: "Biznet Kids - TV anak dan keluarga", streamUrl: "http://livestream.biznetvideo.net/biznet_kids/smil:kids.smil/index.m3u8", logoText: "BK", color: "#059669", region: "Nasional" },
  { id: "kidstv", name: "Kids TV", category: "anak", description: "Kids TV - Channel anak-anak", streamUrl: "http://origin5.mediacdn.ru/live/kidstv/index.m3u8", logoText: "KT", color: "#ec4899", region: "Nasional" },
  { id: "ananda", name: "Ananda", category: "anak", description: "Ananda - Channel anak-anak", streamUrl: "https://vodcdn.bamboo-cloud.com/livehls/68ef86320630444b1f796875/master.m3u8", logoText: "AD", color: "#f59e0b", region: "Nasional", headers: { "http-referrer": "https://anandatelkomvision.renderforestsites.com/" } },

  // ===== OLAHRAGA =====
  { id: "tvrisport", name: "TVRI Sport", category: "olahraga", description: "TVRI Sport - Channel olahraga Indonesia", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/SportHD/hls/SportHD.m3u8", logoText: "TS", color: "#dc2626", region: "Nasional" },
  { id: "spotv", name: "SPOTV", category: "olahraga", description: "SPOTV - Channel olahraga", streamUrl: "http://primestreams.tv:826/live/mookie22/49aV7nBsK4/119515.m3u8", logoText: "SP", color: "#059669", region: "Nasional" },

  // ===== MUSIK =====
  { id: "izzatv", name: "Izzah TV", category: "musik", description: "Izzah TV - TV musik dan hiburan", streamUrl: "https://streaming.radiosalamjambi.com/izzahtv.m3u8", logoText: "IZ", color: "#d97706", region: "Jambi" },
  { id: "madutv", name: "Madu TV", category: "musik", description: "Madu TV - TV musik dan hiburan", streamUrl: "https://re1.siar.us/madutv/hd720/playlist.m3u8", logoText: "MU", color: "#ea580c", region: "Nasional" },
  { id: "musicinfo", name: "Music Info Channel", category: "musik", description: "Music Info Channel - TV musik 24 jam", streamUrl: "https://mic.siar.us/mic/live/mic.m3u8", logoText: "MI", color: "#7c3aed", region: "Nasional", headers: { "http-referrer": "https://mic-indo.com/live" } },
  { id: "lingkartv", name: "Lingkar TV", category: "musik", description: "Lingkar TV - TV musik, berita & religi", streamUrl: "https://lingkartv.my.id/hls/lingkartv.m3u8", logoText: "LK", color: "#0e7490", region: "Nasional" },

  // ===== RELIGI =====
  { id: "rodjatv", name: "Rodja TV", category: "religi", description: "Rodja TV - TV dakwah Islam Ahlussunnah", streamUrl: "https://rodjatv.com/rodjatv/live.m3u8", youtubeUrl: "https://www.youtube.com/embed/nR-bzKvLPy8?autoplay=1&mute=1&playsinline=1", logoText: "RJ", color: "#15803d", region: "Nasional" },
  { id: "salamtv", name: "Salam TV", category: "religi", description: "Salam TV - TV dakwah Islam", streamUrl: "https://salamtv.siar.us/live/salamtv.m3u8", logoText: "SL", color: "#065f46", region: "Nasional" },
  { id: "mtatv", name: "MTA TV", category: "religi", description: "MTA TV - TV Islam Ahmadiyya", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/mtatv/manifest.mpd", logoText: "MT", color: "#065f46", region: "Nasional" },
  { id: "angeltv", name: "Angel TV", category: "religi", description: "Angel TV Indonesia - TV Kristiani", streamUrl: "https://janya-digimix.akamaized.net/vglive-sk-234616/indonesia/ngrp:angelindonesia_all/playlist.m3u8", logoText: "AG", color: "#7c3aed", region: "Nasional" },
  { id: "iamchannel", name: "I Am Channel", category: "religi", description: "I Am Channel - TV Kristiani Indonesia", streamUrl: "https://61146e7ab7a66.streamlock.net:8089/tes/1/chunklist.m3u8", logoText: "IA", color: "#0369a1", region: "Nasional", headers: { "http-referrer": "https://iamchannel.org/" } },
  { id: "dhammatv", name: "Dhamma TV", category: "religi", description: "Dhamma TV - TV Buddhis Indonesia", streamUrl: "https://b.webcache.maxindo.net.id/dhamma/dhamma.m3u8", logoText: "DH", color: "#d97706", region: "Nasional" },

  // ===== GAYA HIDUP =====
  { id: "biznetadventure", name: "Biznet Adventure", category: "gaya_hidup", description: "Biznet Adventure - TV petualangan dan hiburan", streamUrl: "http://livestream.biznetvideo.net/biznet_adventure/smil:adventure.smil/playlist.m3u8", logoText: "BA", color: "#ea580c", region: "Nasional" },
  { id: "biznetlifestyle", name: "Biznet Lifestyle", category: "gaya_hidup", description: "Biznet Lifestyle - TV gaya hidup", streamUrl: "http://livestream.biznetvideo.net/biznet_lifestyle/smil:lifestyle.smil/index.m3u8", logoText: "BL", color: "#d97706", region: "Nasional" },
  { id: "saliratv", name: "Salira TV", category: "gaya_hidup", description: "Salira TV - TV budaya dan gaya hidup Sunda", streamUrl: "https://live.salira.tv/p/3870/hybrid/play.m3u8", logoText: "SA", color: "#0e7490", region: "Jawa Barat" },
  { id: "allegro", name: "Allegro", category: "gaya_hidup", description: "Allegro - Channel gaya hidup", streamUrl: "https://vodcdn.bamboo-cloud.com/livehls/68c525e1063044539b09c253/master.m3u8", logoText: "AL", color: "#7c3aed", region: "Nasional", headers: { "http-referrer": "https://allegrotelkomvision.renderforestsites.com/" } },

  // ===== BISNIS =====
  { id: "idxchannel", name: "IDX Channel", category: "bisnis", description: "IDX Channel - TV pasar modal dan investasi", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/idx/manifest.mpd", youtubeUrl: "https://www.youtube.com/embed/live_stream?channel=UCQA6NejSxQguRkD3L8eXHzA&autoplay=1&mute=1&playsinline=1", logoText: "IX", color: "#1d4ed8", region: "Nasional" },
  { id: "mbgtv", name: "MBG TV", category: "bisnis", description: "MBG TV - TV legislatif dan pemerintahan", streamUrl: "https://stream.convergen.co/mbg_stream/smil:mbStream.smil/playlist.m3u8", logoText: "MB", color: "#7c3aed", region: "Nasional" },
  { id: "tvrparlemen", name: "TVR Parlemen", category: "bisnis", description: "TVR Parlemen - TV parlemen Indonesia", streamUrl: "https://ssv1.dpr.go.id/golive/livestream/playlist.m3u8", logoText: "VP", color: "#0e7490", region: "Nasional" },

  // ===== DAERAH =====
  { id: "jtv", name: "JTV Surabaya", category: "daerah", description: "JTV - TV lokal Surabaya", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/jtv/manifest.mpd", logoText: "JV", color: "#ea580c", region: "Jawa Timur" },
  { id: "jaktv", name: "Jak TV", category: "daerah", description: "Jak TV - TV lokal Jakarta", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/JAK_TV/manifest.mpd", logoText: "JK", color: "#0284c7", region: "DKI Jakarta" },
  { id: "balitv", name: "Bali TV", category: "daerah", description: "Bali TV - TV lokal Bali", streamUrl: "https://cdn10jtedge.indihometv.com/atm/DASH/balitv/manifest.mpd", logoText: "BL", color: "#f59e0b", region: "Bali" },
  { id: "sriwijayatv", name: "Sriwijaya TV", category: "daerah", description: "Sriwijaya TV - TV lokal Sumatera Selatan", streamUrl: "https://sriwijayatv.siar.us/live/sriwijayatv.m3u8", logoText: "SW", color: "#dc2626", region: "Sumatera Selatan" },
  { id: "bandungtv", name: "Bandung TV", category: "daerah", description: "Bandung TV - TV lokal Jawa Barat", streamUrl: "http://202.150.153.254:65500/bandungtvWEBSITE.m3u8", logoText: "BD", color: "#2563eb", region: "Jawa Barat" },
  { id: "jogjatv", name: "Jogja TV", category: "daerah", description: "Jogja TV - TV lokal Yogyakarta", streamUrl: "https://stream.jogjatv.co.id/jtvlive/stream/index.m3u8", logoText: "JT", color: "#7c3aed", region: "DI Yogyakarta" },
  { id: "dhohotv", name: "Dhoho TV", category: "daerah", description: "Dhoho TV - TV lokal Kediri", streamUrl: "https://dhohotv.siar.us/dhohotv/live/playlist.m3u8", logoText: "DH", color: "#ca8a04", region: "Jawa Timur" },
  { id: "banjartv", name: "Banjar TV", category: "daerah", description: "Banjar TV - TV lokal Kalimantan Selatan", streamUrl: "https://banjartv.siar.us/banjartv/live/playlist.m3u8", logoText: "BJ", color: "#059669", region: "Kalimantan Selatan" },

  // ===== TVRI =====
  { id: "tvri_jabar", name: "TVRI Jawa Barat", category: "tvri", description: "TVRI Jawa Barat - TV publik regional", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/Jabar/hls/Jabar.m3u8", logoText: "TJ", color: "#0d9488", region: "Jawa Barat" },
  { id: "tvri_jatim", name: "TVRI Jawa Timur", category: "tvri", description: "TVRI Jawa Timur - TV publik regional", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/Jatim/hls/Jatim.m3u8", logoText: "TJ", color: "#0d9488", region: "Jawa Timur" },
  { id: "tvri_jateng", name: "TVRI Jawa Tengah", category: "tvri", description: "TVRI Jawa Tengah - TV publik regional", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/Jateng/hls/Jateng.m3u8", logoText: "TJ", color: "#0d9488", region: "Jawa Tengah" },
  { id: "tvri_dki", name: "TVRI DKI Jakarta", category: "tvri", description: "TVRI DKI Jakarta - TV publik regional", streamUrl: "https://ott-balancer.tvri.go.id/live/eds/DKI/hls/DKI.m3u8", logoText: "TD", color: "#0d9488", region: "DKI Jakarta" },
];
