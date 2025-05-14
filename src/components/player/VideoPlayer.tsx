import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Movie } from '../../types';

interface VideoPlayerProps {
  movie: Movie;
  autoplay?: boolean;
}

const SPEED_LEVELS = [1, 2, 4, 8];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, autoplay = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(autoplay);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const hideTimeout = useRef<number>();
  const speedTimeoutRef = useRef<number>();
  const { addToWatchHistory } = useAppContext();

  useEffect(() => {
    addToWatchHistory(movie);
    createPlayer();
    return () => {
      clearTimeout(hideTimeout.current);
      clearTimeout(speedTimeoutRef.current);
      document.body.style.cursor = 'default';
      if (playerInstance.current?.destroy) playerInstance.current.destroy();
    };
  }, [movie]);

  const showCtrls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setControlsVisible(false), 3000);
  };

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

  const initPlayer = () => {
    playerRef.current!.innerHTML = '';
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
          e.target.setPlaybackRate(playbackRate);
          if (autoplay) e.target.playVideo();
        },
        onStateChange: (e: any) => {
          setPlaying(e.data === window.YT.PlayerState.PLAYING);
          if (e.data === window.YT.PlayerState.PLAYING) showCtrls();
          if (e.data === window.YT.PlayerState.ENDED) setPlaying(false);
        },
        onError: () => setError('Playback error'),
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

  const seek = (offset: number) => {
    if (!playerInstance.current) return;
    const newTime = Math.min(Math.max(time + offset, 0), duration);
    playerInstance.current.seekTo(newTime, true);
  };

  const changeRate = (dir: 'up' | 'down') => {
    setPlaybackRate(prev => {
      const idx = SPEED_LEVELS.indexOf(prev);
      let newIdx = dir === 'up' ? idx + 1 : idx - 1;
      if (newIdx >= SPEED_LEVELS.length) newIdx = 0;
      if (newIdx < 0) newIdx = SPEED_LEVELS.length - 1;
      const rate = SPEED_LEVELS[newIdx];
      playerInstance.current?.setPlaybackRate(rate);
      return rate;
    });
  };

  const handleSpeedMouseDown = (dir: 'up' | 'down') => {
    changeRate(dir);
    speedTimeoutRef.current = window.setTimeout(() => handleSpeedMouseDown(dir), 500);
  };

  const handleSpeedMouseUp = () => {
    clearTimeout(speedTimeoutRef.current);
  };

  const format = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-gray-900 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden rounded-lg"
      onMouseMove={showCtrls}
    >
      <div ref={playerRef} className="w-full h-full" onClick={togglePlay} />

      {loaded && controlsVisible && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 p-4">
          <div className="w-full h-1 bg-gray-700 rounded mb-4 cursor-pointer" onClick={handleProgressClick}>
            <div
              className="h-full bg-red-600 rounded"
              style={{ width: `${(time / duration) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="p-2 bg-white/20 rounded-full">
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <button
                onMouseDown={() => handleSpeedMouseDown('down')}
                onMouseUp={handleSpeedMouseUp}
                onMouseLeave={handleSpeedMouseUp}
                className="p-2 bg-white/20 rounded-full flex items-center"
              >
                <Rewind size={20} />
                <span className="ml-1 text-sm">{playbackRate}×</span>
              </button>

              <button onClick={() => seek(-10)} className="p-2 bg-white/20 rounded-full">
                <SkipBack size={20} />
              </button>

              <button onClick={() => seek(10)} className="p-2 bg-white/20 rounded-full">
                <SkipForward size={20} />
              </button>

              <button
                onMouseDown={() => handleSpeedMouseDown('up')}
                onMouseUp={handleSpeedMouseUp}
                onMouseLeave={handleSpeedMouseUp}
                className="p-2 bg-white/20 rounded-full flex items-center"
              >
                <FastForward size={20} />
                <span className="ml-1 text-sm">{playbackRate}×</span>
              </button>

              <button onClick={toggleMute} className="p-2 bg-white/20 rounded-full">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <span className="ml-4 text-sm">
                {format(time)} / {format(duration)}
              </span>
            </div>

            <button onClick={handleFullscreen} className="p-2 bg-white/20 rounded-full">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
