'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Maximize, Minimize, Play, Pause, Loader2, AlertCircle, Radio, Tv } from 'lucide-react';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  youtubeUrl?: string;
  onError?: (error: string) => void;
  headers?: Record<string, string>;
}

type StreamType = 'hls' | 'dash' | 'native';
type PlayerMode = 'youtube' | 'native';

function detectStreamType(url: string): StreamType {
  if (url.includes('.mpd') || url.includes('manifest.mpd')) return 'dash';
  if (url.includes('.m3u8') || url.includes('playlist.m3u8') || url.includes('/index.m3u8') || url.includes('smil:') && url.includes('.m3u8')) return 'hls';
  return 'hls';
}

// Lazy-load dashjs to avoid SSR window reference error
let dashjsModule: typeof import('dashjs') | null = null;
async function getDashjs() {
  if (!dashjsModule) {
    dashjsModule = await import('dashjs');
  }
  return dashjsModule;
}

export function VideoPlayer({ streamUrl, channelName, youtubeUrl, onError, headers }: VideoPlayerProps) {
  const [userOverriddenMode, setUserOverriddenMode] = useState<PlayerMode | null>(null);
  const [youtubeFailed, setYoutubeFailed] = useState(false);
  const [prevStreamUrl, setPrevStreamUrl] = useState(streamUrl);

  // Reset override when stream changes
  if (streamUrl !== prevStreamUrl) {
    setPrevStreamUrl(streamUrl);
    setUserOverriddenMode(null);
    setYoutubeFailed(false);
  }

  // Derive the current mode
  const mode: PlayerMode = userOverriddenMode ?? (youtubeUrl && !youtubeFailed ? 'youtube' : 'native');

  // If YouTube fails (e.g., no live stream), fall back to native
  const handleYoutubeFallback = useCallback(() => {
    setYoutubeFailed(true);
    setUserOverriddenMode('native');
  }, []);

  // Switch to native player
  const switchToNative = useCallback(() => {
    setUserOverriddenMode('native');
  }, []);

  // Switch back to YouTube
  const switchToYoutube = useCallback(() => {
    if (youtubeUrl) {
      setUserOverriddenMode('youtube');
      setYoutubeFailed(false);
    }
  }, [youtubeUrl]);

  return (
    <div className="space-y-2">
      {/* Source switcher tabs */}
      {youtubeUrl && (
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={switchToYoutube}
            className={`gap-1.5 text-xs h-7 rounded-full px-3 ${
              mode === 'youtube'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Tv className="w-3 h-3" />
            YouTube
          </Button>
          <Button
            variant={mode === 'native' ? 'default' : 'outline'}
            size="sm"
            onClick={switchToNative}
            className={`gap-1.5 text-xs h-7 rounded-full px-3 ${
              mode === 'native'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Radio className="w-3 h-3" />
            Streaming
          </Button>
        </div>
      )}

      {/* Player */}
      {mode === 'youtube' && youtubeUrl ? (
        <YouTubeEmbed
          url={youtubeUrl}
          channelName={channelName}
          onFallback={handleYoutubeFallback}
        />
      ) : (
        <NativePlayer
          streamUrl={streamUrl}
          channelName={channelName}
          onError={onError}
          headers={headers}
          youtubeAvailable={!!youtubeUrl}
          onSwitchToYoutube={switchToYoutube}
        />
      )}
    </div>
  );
}

// ─── YouTube Embed Component ────────────────────────────────────────────────

function YouTubeEmbed({ url, channelName, onFallback }: { url: string; channelName: string; onFallback: () => void }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIframeError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
    onFallback();
  }, [onFallback]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
      style={{ aspectRatio: '16/9' }}
    >
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        title={`${channelName} - YouTube Live`}
        style={{ border: 'none' }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />

      {/* Channel Name Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-white font-semibold text-sm">{channelName}</p>
        </div>
      </div>

      {/* LIVE Badge */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-red-600 rounded-md px-2 py-0.5 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* YouTube source badge */}
      <div className="absolute bottom-14 left-4 pointer-events-none">
        <div className="bg-red-700/80 rounded px-2 py-0.5">
          <span className="text-white text-[9px] font-medium">YouTube Live</span>
        </div>
      </div>

      {/* Fullscreen button */}
      <div className="absolute bottom-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-white hover:bg-white/10 h-9 w-9 bg-black/40"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      {/* Fallback hint */}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-4">
            <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <p className="text-white text-sm">YouTube live tidak tersedia</p>
            <p className="text-gray-400 text-xs mt-1">Beralih ke streaming langsung...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Native HLS/DASH Player ─────────────────────────────────────────────────

function NativePlayer({ streamUrl, channelName, onError, headers, youtubeAvailable, onSwitchToYoutube }: Omit<VideoPlayerProps, 'youtubeUrl'> & {
  youtubeAvailable: boolean;
  onSwitchToYoutube: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const retryCountRef = useRef(0);

  // Adjust state when streamUrl prop changes
  const [prevStreamUrl, setPrevStreamUrl] = useState(streamUrl);
  if (streamUrl !== prevStreamUrl) {
    setPrevStreamUrl(streamUrl);
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
  }

  // Reset retry count when streamUrl changes
  useEffect(() => {
    retryCountRef.current = 0;
  }, [streamUrl]);

  // Show overlay when channelName prop changes
  const [prevChannelName, setPrevChannelName] = useState(channelName);
  if (channelName !== prevChannelName) {
    setPrevChannelName(channelName);
    setShowOverlay(true);
  }

  // Safely call play()
  const safePlay = useCallback((video: HTMLVideoElement) => {
    if (playPromiseRef.current) {
      playPromiseRef.current = playPromiseRef.current.then(() => {
        const p = video.play();
        if (p) {
          playPromiseRef.current = p.catch(() => {});
        }
      }).catch(() => {});
      return;
    }
    const p = video.play();
    if (p) {
      playPromiseRef.current = p.catch(() => {}).finally(() => {
        playPromiseRef.current = null;
      });
    }
  }, []);

  // Safely call pause()
  const safePause = useCallback((video: HTMLVideoElement) => {
    if (playPromiseRef.current) {
      playPromiseRef.current = playPromiseRef.current.then(() => {
        video.pause();
      }).catch(() => {
        video.pause();
      });
      return;
    }
    video.pause();
  }, []);

  // Destroy all player instances
  const destroyPlayers = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
    playPromiseRef.current = null;
  }, []);

  // Initialize stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    destroyPlayers();

    const streamType = detectStreamType(streamUrl);

    if (streamType === 'dash') {
      let cancelled = false;
      getDashjs().then((dashjsLib) => {
        if (cancelled || !video) return;
        try {
          const player = dashjsLib.MediaPlayer().create();
          player.initialize(video, streamUrl, true);
          player.updateSettings({
            streaming: {
              abr: {
                autoSwitchBitrate: { video: true, audio: true },
              },
              buffer: {
                fastSwitchEnabled: true,
              },
            },
          });

          player.on(dashjsLib.MediaPlayer.events.ERROR, () => {
            retryCountRef.current += 1;
            if (retryCountRef.current > 5) {
              setError('Gagal memuat siaran setelah beberapa percobaan. Silakan coba channel lain.');
              player.reset();
              onError?.('Max retries exceeded');
              return;
            }
          });

          player.on(dashjsLib.MediaPlayer.events.PLAYBACK_PLAYING, () => {
            setIsLoading(false);
            setIsPlaying(true);
          });

          dashRef.current = player;
        } catch {
          queueMicrotask(() => {
            setError('Gagal memuat pemain DASH. Silakan coba channel lain.');
          });
        }
      }).catch(() => {
        if (!cancelled) {
          queueMicrotask(() => {
            setError('Gagal memuat pemain DASH. Silakan coba channel lain.');
          });
        }
      });

      return () => {
        cancelled = true;
      };
    } else if (streamType === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1,
          progressive: true,
          xhrSetup: (xhr: XMLHttpRequest, _url: string) => {
            if (headers) {
              Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
              });
            }
          },
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          safePlay(video);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            retryCountRef.current += 1;
            if (retryCountRef.current > 5) {
              setError('Gagal memuat siaran setelah beberapa percobaan. Silakan coba channel lain.');
              hls.destroy();
              onError?.('Max retries exceeded');
              return;
            }
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError('Gagal memuat siaran. Silakan coba channel lain.');
                hls.destroy();
                onError?.('Fatal HLS error');
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        const onLoaded = () => {
          safePlay(video);
          video.removeEventListener('loadedmetadata', onLoaded);
        };
        video.addEventListener('loadedmetadata', onLoaded);
      }
    }

    return () => {
      destroyPlayers();
    };
  }, [streamUrl, onError, safePlay, destroyPlayers]);

  // Sync playing state from native video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const onCanPlay = () => setIsLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  // Auto-hide overlay after channel change
  useEffect(() => {
    if (!showOverlay) return;
    const timer = setTimeout(() => setShowOverlay(false), 3000);
    return () => clearTimeout(timer);
  }, [showOverlay, channelName]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      safePlay(video);
    } else {
      safePause(video);
    }
  }, [safePlay, safePause]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!video.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    retryCountRef.current = 0;
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.loadSource(streamUrl);
    }
  }, [streamUrl]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
      />

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white text-sm">Memuat siaran...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4 p-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-sm max-w-xs">{error}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  retry();
                }}
                className="text-white border-white/30 hover:bg-white/10"
              >
                Coba Lagi
              </Button>
              {youtubeAvailable && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchToYoutube();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Tv className="w-3.5 h-3.5 mr-1.5" />
                  YouTube
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Channel Name Overlay (fades out) */}
      <div
        className={`absolute top-4 left-4 transition-opacity duration-500 pointer-events-none ${
          showOverlay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-white font-semibold text-sm">{channelName}</p>
        </div>
      </div>

      {/* LIVE Badge */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-red-600 rounded-md px-2 py-0.5 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Stream source badge */}
      <div className="absolute bottom-14 left-4 pointer-events-none">
        <div className="bg-blue-700/80 rounded px-2 py-0.5">
          <span className="text-white text-[9px] font-medium">IPTV Stream</span>
        </div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/10 h-9 w-9"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/10 h-9 w-9"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {youtubeAvailable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchToYoutube();
                }}
                className="text-white hover:bg-white/10 h-7 text-[10px] gap-1"
              >
                <Tv className="w-3 h-3" />
                YouTube
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10 h-9 w-9"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
