'use client';

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore, useRef } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { ChannelCard } from '@/components/channel-card';
import { categories, regions, TVChannel } from '@/lib/channels';
import { useAutoUpdateChannels } from '@/hooks/use-auto-update-channels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  Tv,
  Download,
  Wifi,
  WifiOff,
  MonitorPlay,
  X,
  MapPin,
  ListFilter,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Radio,
  ListOrdered,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

// Online status via useSyncExternalStore (avoids hydration mismatch)
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
function getOnlineSnapshot() {
  return navigator.onLine;
}
function getOnlineServerSnapshot() {
  return true; // SSR always assumes online
}

// Mounted state via useSyncExternalStore
function subscribeNoop(callback: () => void) {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getMountedServerSnapshot() {
  return false;
}

type ViewMode = 'grid' | 'list';

export default function HomePage() {
  // Auto-updating channels from iptv-org
  const { channels, updatedCount, newCount, updatedAt, isUpdating, lastError } = useAutoUpdateChannels();
  const [selectedChannel, setSelectedChannel] = useState<TVChannel>(channels[0]);
  const [activeCategory, setActiveCategory] = useState('semua');
  const [activeRegion, setActiveRegion] = useState('Semua Wilayah');
  const [searchQuery, setSearchQuery] = useState('');
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const mounted = useSyncExternalStore(subscribeNoop, getMountedSnapshot, getMountedServerSnapshot);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show install instructions on mobile after delay
  useEffect(() => {
    if (!mounted) return;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile && !deferredPrompt) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [mounted, deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  // Filtered channels
  const filteredChannels = useMemo(() => {
    let result = channels;
    if (activeCategory !== 'semua') {
      result = result.filter((ch) => ch.category === activeCategory);
    }
    if (activeRegion !== 'Semua Wilayah') {
      result = result.filter((ch) => ch.region === activeRegion);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.description.toLowerCase().includes(q) ||
          ch.region.toLowerCase().includes(q) ||
          ch.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [channels, activeCategory, activeRegion, searchQuery]);

  // Group channels by region for the "daerah" and "tvri" categories
  const groupedByRegion = useMemo(() => {
    if (activeCategory !== 'daerah' && activeCategory !== 'tvri') return null;
    const grouped: Record<string, TVChannel[]> = {};
    filteredChannels.forEach((ch) => {
      if (!grouped[ch.region]) grouped[ch.region] = [];
      grouped[ch.region].push(ch);
    });
    return grouped;
  }, [activeCategory, filteredChannels]);

  const handleChannelSelect = useCallback((channel: TVChannel) => {
    setSelectedChannel(channel);
    // Scroll to top on mobile to show player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Channel navigation
  const currentChannelIndex = useMemo(() => {
    return filteredChannels.findIndex((ch) => ch.id === selectedChannel.id);
  }, [filteredChannels, selectedChannel.id]);

  const goToPrevChannel = useCallback(() => {
    if (filteredChannels.length === 0) return;
    const prevIndex = currentChannelIndex <= 0 ? filteredChannels.length - 1 : currentChannelIndex - 1;
    setSelectedChannel(filteredChannels[prevIndex]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filteredChannels, currentChannelIndex]);

  const goToNextChannel = useCallback(() => {
    if (filteredChannels.length === 0) return;
    const nextIndex = currentChannelIndex >= filteredChannels.length - 1 ? 0 : currentChannelIndex + 1;
    setSelectedChannel(filteredChannels[nextIndex]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filteredChannels, currentChannelIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate when typing in search or select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevChannel();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextChannel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevChannel, goToNextChannel]);

  const handleError = useCallback((error: string) => {
    console.error('Stream error:', error);
  }, []);

  // Region options based on current category
  const availableRegions = useMemo(() => {
    let relevant = channels;
    if (activeCategory !== 'semua') {
      relevant = relevant.filter((ch) => ch.category === activeCategory);
    }
    const regionSet = new Set(relevant.map((ch) => ch.region));
    return ['Semua Wilayah', ...regions.filter((r) => regionSet.has(r))];
  }, [channels, activeCategory]);

  const categoryName = activeCategory === 'semua'
    ? 'Semua Channel'
    : categories.find((c) => c.id === activeCategory)?.name;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Offline Banner - client only */}
      {mounted && !isOnline && (
        <div className="bg-yellow-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Anda sedang offline. Pastikan koneksi internet aktif untuk menonton TV.
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <Tv className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Nonton<span className="text-red-500">TV</span>
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5 hidden sm:block">Siaran TV Digital Indonesia Langsung</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="text-gray-400 hover:text-white hover:bg-white/5 h-9 w-9 hidden sm:flex"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </Button>

            {/* Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-400 hover:text-white hover:bg-white/5 h-9 w-9"
            >
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </Button>

            {/* PWA Install Button */}
            {mounted && showInstallPrompt && (
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install</span>
              </Button>
            )}

            {/* Auto-update indicator */}
            {mounted && updatedAt && (
              <div className="flex items-center gap-1" title={`Terakhir update: ${new Date(updatedAt).toLocaleString('id-ID')}`}>
                {isUpdating ? (
                  <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                )}
              </div>
            )}

            {/* Online Status */}
            {mounted && (
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-3 sm:px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Cari channel TV, wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Video Player */}
        <section className="mb-4 sm:mb-6">
          <VideoPlayer
            streamUrl={selectedChannel.streamUrl}
            channelName={selectedChannel.name}
            onError={handleError}
            headers={selectedChannel.headers}
          />

          {/* Channel Navigator */}
          <div className="mt-3 space-y-2">
            {/* Prev/Next Navigation Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevChannel}
                disabled={filteredChannels.length <= 1}
                className="h-10 w-10 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white flex-shrink-0"
                title="Channel sebelumnya (← / PageUp)"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Current Channel Info - clickable to open channel list */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-left min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: selectedChannel.color }}
                    >
                      {selectedChannel.logoText}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-semibold text-sm sm:text-base truncate">{selectedChannel.name}</h2>
                      <p className="text-gray-400 text-xs truncate">{selectedChannel.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <Wifi className="w-2.5 h-2.5" />
                        LIVE
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {currentChannelIndex >= 0 ? currentChannelIndex + 1 : '-'}/{filteredChannels.length}
                      </Badge>
                      <ListOrdered className="w-4 h-4 text-gray-500" />
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[400px] bg-gray-950 border-white/10 p-0">
                  <SheetHeader className="px-4 pt-4 pb-2 border-b border-white/10">
                    <SheetTitle className="text-white flex items-center gap-2">
                      <MonitorPlay className="w-5 h-5 text-red-500" />
                      Daftar Channel
                      <Badge variant="secondary" className="text-xs font-normal">
                        {filteredChannels.length}
                      </Badge>
                    </SheetTitle>
                    <p className="text-gray-400 text-xs text-left">
                      Gunakan ← → untuk pindah channel • Tap channel untuk menonton
                    </p>
                  </SheetHeader>
                  <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
                    {filteredChannels.map((channel, idx) => (
                      <div
                        key={channel.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-l-2 ${
                          selectedChannel.id === channel.id
                            ? 'bg-red-500/10 border-l-red-500'
                            : 'border-l-transparent hover:bg-white/5 hover:border-l-white/20'
                        }`}
                        onClick={() => {
                          handleChannelSelect(channel);
                        }}
                      >
                        <span className={`text-xs font-mono w-6 text-right flex-shrink-0 ${
                          selectedChannel.id === channel.id ? 'text-red-400' : 'text-gray-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: channel.color }}
                        >
                          {channel.logoText}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            selectedChannel.id === channel.id ? 'text-white' : 'text-gray-300'
                          }`}>
                            {channel.name}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">{channel.description}</p>
                        </div>
                        {selectedChannel.id === channel.id && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                            <Radio className="w-2 h-2 mr-0.5" />
                            LIVE
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextChannel}
                disabled={filteredChannels.length <= 1}
                className="h-10 w-10 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white flex-shrink-0"
                title="Channel selanjutnya (→ / PageDown)"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Mobile: Up/Down Channel Buttons (visible on small screens) */}
            <div className="flex items-center justify-center gap-3 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevChannel}
                disabled={filteredChannels.length <= 1}
                className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-9"
              >
                <ChevronUp className="w-4 h-4" />
                Channel Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextChannel}
                disabled={filteredChannels.length <= 1}
                className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-9"
              >
                Channel Selanjutnya
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="mb-3">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveRegion('Semua Wilayah');
                  }}
                  className={`flex-shrink-0 gap-1.5 text-xs sm:text-sm ${
                    activeCategory === cat.id
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                      : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1" />
          </ScrollArea>
        </section>

        {/* Region Filter + Stats Bar */}
        <section className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-red-500" />
              {categoryName}
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredChannels.length}
              </Badge>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <Select value={activeRegion} onValueChange={setActiveRegion}>
              <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs bg-white/5 border-white/10 text-gray-300">
                <SelectValue placeholder="Pilih Wilayah" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 max-h-72">
                {availableRegions.map((region) => (
                  <SelectItem key={region} value={region} className="text-gray-300 text-xs focus:bg-white/10 focus:text-white">
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeRegion !== 'Semua Wilayah' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveRegion('Semua Wilayah')}
                className="h-8 w-8 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </section>

        {/* Channel Grid/List */}
        <section>
          {filteredChannels.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada channel ditemukan</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('semua');
                  setActiveRegion('Semua Wilayah');
                }}
                className="text-red-400 mt-2"
              >
                Reset filter
              </Button>
            </div>
          ) : groupedByRegion ? (
            // Grouped by region for daerah/tvri categories
            <div className="space-y-6">
              {Object.entries(groupedByRegion).sort(([a], [b]) => a.localeCompare(b)).map(([region, regionChannels]) => (
                <div key={region}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <h4 className="text-white font-medium text-sm">{region}</h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {regionChannels.length}
                    </Badge>
                  </div>
                  <div className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3'
                      : 'flex flex-col gap-1.5'
                  }>
                    {regionChannels.map((channel) => (
                      <ChannelCard
                        key={channel.id}
                        channel={channel}
                        isActive={selectedChannel.id === channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        compact={viewMode === 'list'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3'
                : 'flex flex-col gap-1.5'
            }>
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isActive={selectedChannel.id === channel.id}
                  onClick={() => handleChannelSelect(channel)}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-gray-950/80 border-t border-white/5 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-red-500" />
            <span className="text-gray-500 text-xs">
              NontonTV © {new Date().getFullYear()} — {channels.length} Channel • Auto-update dari iptv-org
            </span>
          </div>
          <p className="text-gray-600 text-xs">
            Semua siaran milik masing-masing stasiun TV • Dibuat untuk streaming legal
          </p>
        </div>
      </footer>

      {/* PWA Install Banner (mobile) */}
      {mounted && showInstallPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-white/10 p-4 sm:hidden">
          {deferredPrompt ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Tv className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Install NontonTV</p>
                  <p className="text-gray-400 text-xs">Tonton TV langsung dari homescreen</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-gray-500 h-8"
                >
                  Nanti
                </Button>
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white h-8"
                >
                  Install
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tv className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Install NontonTV di HP</p>
                    <p className="text-gray-400 text-xs">Buka seperti aplikasi biasa</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-gray-500 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <p className="text-gray-300 text-xs font-medium">Cara install di Android:</p>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold min-w-[16px]">1.</span>
                  <p className="text-gray-400 text-xs">Tap ikon <span className="text-white font-medium">⋮</span> (3 titik) di kanan atas Chrome</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold min-w-[16px]">2.</span>
                  <p className="text-gray-400 text-xs">Pilih <span className="text-white font-medium">&quot;Add to Home screen&quot;</span> atau <span className="text-white font-medium">&quot;Install app&quot;</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold min-w-[16px]">3.</span>
                  <p className="text-gray-400 text-xs">Tap <span className="text-white font-medium">&quot;Install&quot;</span> — Selesai! 🎉</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
