// VideoPlayer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize } from 'lucide-react';
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

  const hideTimeout = useRef<number>();
  const { addToWatchHistory } = useAppContext();

  // Fullscreen change listener and keyboard controls
  useEffect(() => {
    const onFull = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      document.body.style.cursor = document.fullscreenElement ? 'none' : 'default';
    };
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (document.fullscreenElement === containerRef.current) {
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        if (e.code === 'ArrowRight') seek(10);
        if (e.code === 'ArrowLeft') seek(-10);
        if (e.code === 'Enter') handleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFull);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFull);
      document.removeEventListener('keydown', onKey);
    };
  }, [time, playing]);

  // Load YouTube API and initialize player
  useEffect(() => {
    addToWatchHistory(movie);
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }
    return () => {
      if ((window as any).onYouTubeIframeAPIReady) (window as any).onYouTubeIframeAPIReady = null;
      clearTimeout(hideTimeout.current);
      document.body.style.cursor = 'default';
    };
  }, [movie]);

  const createPlayer = () => {
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
        playsinline: 1,
      },
      events: {
        onReady: (e: any) => {
          setLoaded(true);
          setDuration(e.target.getDuration());
          if (autoplay) e.target.playVideo();
        },
        onStateChange: (e: any) => setPlaying(e.data === window.YT.PlayerState.PLAYING),
      },
    });

    setInterval(() => {
      if (playerInstance.current?.getCurrentTime) {
        setTime(playerInstance.current.getCurrentTime());
      }
    }, 500);
  };

  const togglePlay = () => {
    if (!playerInstance.current) return;
    playing ? playerInstance.current.pauseVideo() : playerInstance.current.playVideo();
  };

  const seek = (offset: number) => {
    if (!playerInstance.current) return;
    const newTime = Math.min(Math.max(time + offset, 0), duration);
    playerInstance.current.seekTo(newTime, true);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    playerInstance.current.seekTo(pct * duration, true);
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  };

  const format = (s: number) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const showCtrls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setControlsVisible(false), 3000);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video max-h-[90vh] bg-black overflow-hidden mx-auto rounded-md shadow-lg"
      onMouseMove={showCtrls}
    >
      <div ref={playerRef} className="w-full h-full" onClick={togglePlay} />

      {loaded && controlsVisible && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="w-full h-1 bg-gray-700 rounded cursor-pointer mb-3" onClick={handleProgressClick}>
            <div className="h-full bg-red-600 rounded" style={{ width: `${(time / duration) * 100}%` }} />
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-6">
              <button onClick={togglePlay} className="p-2 rounded-full bg-black/50 hover:bg-white/20">
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button onClick={() => seek(-10)} className="p-2 rounded-full bg-black/50 hover:bg-white/20 flex items-center">
                <SkipBack size={24} /> <span className="ml-1 text-lg">10+</span>
              </button>

              <button onClick={() => seek(10)} className="p-2 rounded-full bg-black/50 hover:bg-white/20 flex items-center">
                <span className="mr-1 text-lg">10+</span> <SkipForward size={24} />
              </button>

              <span>{format(time)} / {format(duration)}</span>
            </div>

            <button onClick={handleFullscreen} className="p-2 rounded-full bg-black/50 hover:bg-white/20">
              <Maximize size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
