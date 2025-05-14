import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Movie } from '../../types';

interface VideoPlayerProps {
  movie: Movie;
  autoplay?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, autoplay = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(autoplay);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hideTimeout = useRef<number>();
  const { addToWatchHistory } = useAppContext();

  // Utility: format seconds into HH:MM:SS or MM:SS
  const format = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Show controls on mouse move
  const showCtrls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setControlsVisible(false), 3000);
  };

  // Fullscreen handler
  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  // Click-to-seek on progress bar
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerInstance.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    playerInstance.current.seekTo(pct * duration, true);
  };

  // Seek by offset seconds
  const seek = (offset: number) => {
    if (!playerInstance.current) return;
    const newTime = Math.min(Math.max(time + offset, 0), duration);
    playerInstance.current.seekTo(newTime, true);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!playerInstance.current) return;
    playing
      ? playerInstance.current.pauseVideo()
      : playerInstance.current.playVideo();
  };

  // Toggle mute
  const toggleMute = () => {
    if (!playerInstance.current) return;
    if (isMuted) {
      playerInstance.current.unMute();
      setIsMuted(false);
    } else {
      playerInstance.current.mute();
      setIsMuted(true);
    }
  };

  // Initialize YouTube player
  const initPlayer = () => {
    if (!playerRef.current) return;
    playerRef.current.innerHTML = '';
    playerInstance.current = new window.YT.Player(playerRef.current, {
      height: '100%',
      width: '100%',
      videoId: movie.videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        playsinline: 1
      },
      events: {
        onReady: (e: any) => {
          setLoaded(true);
          setDuration(e.target.getDuration());
          if (autoplay) e.target.playVideo();
        },
        onStateChange: (e: any) => {
          setPlaying(e.data === window.YT.PlayerState.PLAYING);
          if (e.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            setTime(0);
          }
        },
        onError: (e: any) => {
          setError('Video playback error');
          console.error('Player error:', e.data);
        }
      }
    });

    // Update current time every 500ms
    setInterval(() => {
      if (playerInstance.current?.getCurrentTime) {
        setTime(playerInstance.current.getCurrentTime());
      }
    }, 500);
  };

  // Create or reload the player when movie changes
  const createPlayer = () => {
    if (!playerRef.current || !movie.videoId) {
      setError('Video unavailable');
      return;
    }
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  };

  // Effect: handle fullscreenchange & keyboard shortcuts
  useEffect(() => {
    const onFull = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      document.body.style.cursor = document.fullscreenElement ? 'none' : 'default';
    };

    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seek(10);
          break;
        case 'ArrowLeft':
          seek(-10);
          break;
        case 'Enter':
          handleFullscreen();
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    };

    document.addEventListener('fullscreenchange', onFull);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFull);
      document.removeEventListener('keydown', onKey);
    };
  }, [time, playing]);

  // Effect: load player and register history on mount or movie change
  useEffect(() => {
    addToWatchHistory(movie);
    createPlayer();
    return () => {
      clearTimeout(hideTimeout.current);
      document.body.style.cursor = 'default';
      if (playerInstance.current?.destroy) {
        playerInstance.current.destroy();
      }
    };
  }, [movie]);

  // Render error state
  if (error) {
    return (
      <div className="relative w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video max-h-[90vh] bg-black overflow-hidden mx-auto rounded-lg shadow-lg"
      onMouseMove={showCtrls}
    >
      <div ref={playerRef} className="w-full h-full" onClick={togglePlay} />

      {loaded && controlsVisible && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-6">
          {/* Progress bar */}
          <div
            className="w-full h-1 bg-gray-700 rounded cursor-pointer mb-4"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-red-600 rounded relative"
              style={{ width: `${(time / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4 md:space-x-6">
              <button
                onClick={togglePlay}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
              >
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <button
                onClick={() => seek(-10)}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center"
              >
                <SkipBack size={20} />
                <span className="ml-1 text-base">10</span>
              </button>

              <button
                onClick={() => seek(10)}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center"
              >
                <span className="mr-1 text-base">10</span>
                <SkipForward size={20} />
              </button>

              <button
                onClick={toggleMute}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <span className="text-base">
                {format(time)} / {format(duration)}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
