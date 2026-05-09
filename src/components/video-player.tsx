'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Maximize, Minimize, Play, Pause, Loader2, AlertCircle, Radio } from 'lucide-react';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  onError?: (error: string) => void;
}

export function VideoPlayer({ streamUrl, channelName, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  // Check browser HLS support (computed once during render)
  const hlsNotSupported = !Hls.isSupported() && typeof window !== 'undefined' && !document.createElement('video').canPlayType('application/vnd.apple.mpegurl');

  // Adjust state when streamUrl prop changes (React-recommended pattern)
  const [prevStreamUrl, setPrevStreamUrl] = useState(streamUrl);
  if (streamUrl !== prevStreamUrl) {
    setPrevStreamUrl(streamUrl);
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
  }

  // Show overlay when channelName prop changes
  const [prevChannelName, setPrevChannelName] = useState(channelName);
  if (channelName !== prevChannelName) {
    setPrevChannelName(channelName);
    setShowOverlay(true);
  }

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Destroy previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1, // auto quality
        // Android 5+ compatibility
        progressive: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(() => {
          // Autoplay blocked, user needs to interact
          setIsLoading(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Koneksi bermasalah. Mencoba menghubungkan kembali...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error. Mencoba memulihkan...');
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
      // Native HLS support (Safari, some Android)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      });
    }
    // Browser not supported error is handled via hlsNotSupported computed value

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, onError]);

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

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const retry = () => {
    setError(null);
    setIsLoading(true);
    if (hlsRef.current) {
      hlsRef.current.loadSource(streamUrl);
    }
  };

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
      {(error || hlsNotSupported) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4 p-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-sm max-w-xs">{hlsNotSupported ? 'Browser Anda tidak mendukung streaming HLS.' : error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                retry();
              }}
              className="text-white border-white/30 hover:bg-white/10"
            >
              {hlsNotSupported ? 'Tutup' : 'Coba Lagi'}
            </Button>
          </div>
        </div>
      )}

      {/* Channel Name Overlay (fades out) */}
      <div
        className={`absolute top-4 left-4 transition-opacity duration-500 ${
          showOverlay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-white font-semibold text-sm">{channelName}</p>
        </div>
      </div>

      {/* LIVE Badge */}
      <div className="absolute top-4 right-4">
        <div className="bg-red-600 rounded-md px-2 py-0.5 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
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
  );
}
