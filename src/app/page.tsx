'use client';

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { ChannelCard } from '@/components/channel-card';
import { channels, categories, TVChannel } from '@/lib/channels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Search,
  Tv,
  Download,
  Wifi,
  WifiOff,
  MonitorPlay,
  X,
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

export default function HomePage() {
  const [selectedChannel, setSelectedChannel] = useState<TVChannel>(channels[0]);
  const [activeCategory, setActiveCategory] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const mounted = useSyncExternalStore(subscribeNoop, getMountedSnapshot, getMountedServerSnapshot);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
  }, [activeCategory, searchQuery]);

  const handleChannelSelect = useCallback((channel: TVChannel) => {
    setSelectedChannel(channel);
    // Scroll to top on mobile to show player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Stream error:', error);
  }, []);

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
              <p className="text-[10px] text-gray-400 -mt-0.5 hidden sm:block">Siaran TV Indonesia Langsung</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                placeholder="Cari channel TV..."
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
          />

          {/* Now Playing Info */}
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                style={{ backgroundColor: selectedChannel.color }}
              >
                {selectedChannel.logoText}
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm sm:text-base">{selectedChannel.name}</h2>
                <p className="text-gray-400 text-xs">{selectedChannel.description}</p>
              </div>
            </div>
            <Badge variant="destructive" className="flex-shrink-0 gap-1">
              <Wifi className="w-3 h-3" />
              Sedang Siar
            </Badge>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="mb-4">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
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

        {/* Channel Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-red-500" />
              {activeCategory === 'semua'
                ? 'Semua Channel'
                : categories.find((c) => c.id === activeCategory)?.name}
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredChannels.length}
              </Badge>
            </h3>
          </div>

          {filteredChannels.length === 0 ? (
            <div className="text-center py-12">
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isActive={selectedChannel.id === channel.id}
                  onClick={() => handleChannelSelect(channel)}
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
              NontonTV © {new Date().getFullYear()} — Siaran TV Indonesia Langsung
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
