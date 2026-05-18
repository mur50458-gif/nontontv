'use client';

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore, useRef } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { categories, TVChannel } from '@/lib/channels';
import { useAutoUpdateChannels } from '@/hooks/use-auto-update-channels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Tv,
  Download,
  Wifi,
  WifiOff,
  MonitorPlay,
  X,
  ChevronLeft,
  ChevronRight,
  Radio,
  RefreshCw,
  CheckCircle2,
  Play,
  ArrowLeft,
  ArrowRight,
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
  return true;
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

// Horizontal scrollable row component
function ChannelRow({
  title,
  channels,
  selectedChannel,
  onSelect,
  icon,
}: {
  title: string;
  channels: TVChannel[];
  selectedChannel: TVChannel;
  onSelect: (ch: TVChannel) => void;
  icon?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (channels.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
          <span>{icon}</span>
          {title}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            {channels.length}
          </Badge>
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {channels.map((channel) => {
          const isActive = selectedChannel.id === channel.id;
          return (
            <button
              key={channel.id}
              onClick={() => onSelect(channel)}
              className={`flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer text-left group ${
                isActive
                  ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-gray-950 scale-[1.02]'
                  : 'hover:scale-[1.03] hover:ring-1 hover:ring-white/20'
              }`}
            >
              {/* Thumbnail area */}
              <div
                className="h-[80px] sm:h-[90px] flex items-center justify-center relative"
                style={{ backgroundColor: channel.color }}
              >
                <span className="text-white text-xl sm:text-2xl font-bold select-none">
                  {channel.logoText}
                </span>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 bg-red-600 rounded px-1 py-0.5 flex items-center gap-0.5">
                    <Radio className="w-2 h-2 text-white" />
                    <span className="text-[8px] text-white font-bold">LIVE</span>
                  </div>
                )}
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
                </div>
              </div>
              {/* Info area */}
              <div className="bg-gray-900/80 p-2">
                <p className={`text-xs font-medium truncate ${isActive ? 'text-red-400' : 'text-white'}`}>
                  {channel.name}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {channel.region !== 'Nasional' ? channel.region : channel.category}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { channels, updatedCount, newCount, updatedAt, isUpdating, lastError } = useAutoUpdateChannels();
  const [selectedChannel, setSelectedChannel] = useState<TVChannel>(channels[0]);
  const [activeCategory, setActiveCategory] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const mounted = useSyncExternalStore(subscribeNoop, getMountedSnapshot, getMountedServerSnapshot);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(true);

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
      const timer = setTimeout(() => setShowInstallPrompt(true), 8000);
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
  }, [channels, activeCategory, searchQuery]);

  // Group channels by category for horizontal rows
  const channelRows = useMemo(() => {
    if (activeCategory !== 'semua' || searchQuery.trim()) {
      // When a specific category or search is active, show all in one row
      return [{ id: activeCategory, name: activeCategory === 'semua' ? 'Hasil Pencarian' : categories.find(c => c.id === activeCategory)?.name || activeCategory, icon: categories.find(c => c.id === activeCategory)?.icon || '📺', channels: filteredChannels }];
    }

    // Group by category
    const grouped: { id: string; name: string; icon: string; channels: TVChannel[] }[] = [];
    for (const cat of categories) {
      if (cat.id === 'semua') continue;
      const catChannels = channels.filter(ch => ch.category === cat.id);
      if (catChannels.length > 0) {
        grouped.push({ id: cat.id, name: cat.name, icon: cat.icon, channels: catChannels });
      }
    }
    return grouped;
  }, [channels, activeCategory, searchQuery, filteredChannels]);

  // Featured channels (top 8 national channels)
  const featuredChannels = useMemo(() => {
    return channels.filter(ch => ch.category === 'nasional').slice(0, 8);
  }, [channels]);

  const handleChannelSelect = useCallback((channel: TVChannel) => {
    setSelectedChannel(channel);
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

  // Update selectedChannel when channels change - use sync pattern to avoid effect
  const validChannel = channels.find(ch => ch.id === selectedChannel.id);
  if (channels.length > 0 && !validChannel) {
    setSelectedChannel(channels[0]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
      {/* Offline Banner */}
      {mounted && !isOnline && (
        <div className="bg-yellow-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Anda sedang offline. Pastikan koneksi internet aktif untuk menonton TV.
        </div>
      )}

      {/* Header - Google TV style */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Nonton<span className="text-red-500">TV</span>
              </h1>
              <p className="text-[10px] text-gray-500 -mt-0.5 hidden sm:block">Siaran TV Digital Indonesia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-update indicator */}
            {mounted && updatedAt && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500" title={`Update: ${new Date(updatedAt).toLocaleString('id-ID')}`}>
                {isUpdating ? (
                  <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
                <span>{channels.length} ch</span>
              </div>
            )}

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
            {mounted && deferredPrompt && (
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install</span>
              </Button>
            )}

            {/* Online Status */}
            {mounted && (
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-3 sm:px-6 pb-3">
            <div className="relative max-w-xl">
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
      <main className="flex-1 max-w-[1400px] mx-auto w-full">
        {/* Hero Section - Player + Channel Info */}
        <section className="px-3 sm:px-6 pt-2 sm:pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Video Player */}
            <div className="flex-1">
              <VideoPlayer
                streamUrl={selectedChannel.streamUrl}
                channelName={selectedChannel.name}
                onError={handleError}
                headers={selectedChannel.headers}
              />
            </div>

            {/* Channel Info Panel */}
            <div className="lg:w-[320px] flex flex-col gap-3">
              {/* Now Playing Card */}
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: selectedChannel.color }}
                  >
                    {selectedChannel.logoText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-white font-bold text-base truncate">{selectedChannel.name}</h2>
                      <Badge variant="destructive" className="gap-1 text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                        <Radio className="w-2 h-2" />
                        LIVE
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{selectedChannel.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {selectedChannel.category === 'gaya_hidup' ? 'Gaya Hidup' :
                         selectedChannel.category === 'tvri' ? 'TVRI' :
                         selectedChannel.category.charAt(0).toUpperCase() + selectedChannel.category.slice(1)}
                      </Badge>
                      {selectedChannel.region !== 'Nasional' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-gray-600">
                          {selectedChannel.region}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Channel Navigation */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevChannel}
                    disabled={filteredChannels.length <= 1}
                    className="flex-1 gap-1 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-8"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Prev
                  </Button>
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {currentChannelIndex >= 0 ? currentChannelIndex + 1 : '-'}/{filteredChannels.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextChannel}
                    disabled={filteredChannels.length <= 1}
                    className="flex-1 gap-1 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-8"
                  >
                    Next
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Featured / Quick Access */}
              <div className="bg-[#1a1a1a] rounded-xl p-3">
                <h4 className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-2">Channel Populer</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {featuredChannels.slice(0, 8).map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleChannelSelect(ch)}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                        selectedChannel.id === ch.id
                          ? 'bg-red-500/20 ring-1 ring-red-500/50'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: ch.color }}
                      >
                        {ch.logoText}
                      </div>
                      <span className="text-[9px] text-gray-400 truncate w-full text-center">{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Tabs - Google TV style horizontal pills */}
        <section className="px-3 sm:px-6 mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`flex-shrink-0 gap-1.5 text-xs rounded-full px-4 ${
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
        </section>

        {/* Channel Rows - Google TV horizontal scroll */}
        <section className="px-3 sm:px-6 mt-4 pb-6 space-y-6">
          {searchQuery.trim() || activeCategory !== 'semua' ? (
            // Single row for filtered results
            <ChannelRow
              title={searchQuery.trim() ? `Hasil: "${searchQuery}"` : categories.find(c => c.id === activeCategory)?.name || 'Channel'}
              channels={filteredChannels}
              selectedChannel={selectedChannel}
              onSelect={handleChannelSelect}
              icon={searchQuery.trim() ? '🔍' : categories.find(c => c.id === activeCategory)?.icon || '📺'}
            />
          ) : (
            // Multiple category rows - Google TV style
            channelRows.map((row) => (
              <ChannelRow
                key={row.id}
                title={row.name}
                channels={row.channels}
                selectedChannel={selectedChannel}
                onSelect={handleChannelSelect}
                icon={row.icon}
              />
            ))
          )}

          {/* No results */}
          {filteredChannels.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada channel ditemukan</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('semua');
                }}
                className="text-red-400 mt-2"
              >
                Reset filter
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-[#0f0f0f] border-t border-white/5 py-4 px-4">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-red-500" />
            <span className="text-gray-500 text-xs">
              NontonTV &copy; {new Date().getFullYear()} &mdash; {channels.length} Channel &bull; Auto-update dari iptv-org
            </span>
          </div>
          <p className="text-gray-600 text-xs">
            Semua siaran milik masing-masing stasiun TV
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
                  <p className="text-gray-400 text-xs">Tonton TV dari homescreen</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowInstallPrompt(false)} className="text-gray-500 h-8">Nanti</Button>
                <Button onClick={handleInstall} size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8">Install</Button>
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
                    <p className="text-white text-sm font-medium">Install NontonTV</p>
                    <p className="text-gray-400 text-xs">Buka seperti aplikasi biasa</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowInstallPrompt(false)} className="text-gray-500 h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <p className="text-gray-300 text-xs font-medium">Cara install di Android:</p>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold">1.</span>
                  <p className="text-gray-400 text-xs">Tap ikon <span className="text-white font-medium">&#8942;</span> di Chrome</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold">2.</span>
                  <p className="text-gray-400 text-xs">Pilih <span className="text-white font-medium">&quot;Add to Home screen&quot;</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xs font-bold">3.</span>
                  <p className="text-gray-400 text-xs">Tap <span className="text-white font-medium">&quot;Install&quot;</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollbar hide style */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// Type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
