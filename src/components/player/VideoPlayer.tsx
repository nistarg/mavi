import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const hideTimeout = useRef<number>();
  const speedHoldRef = useRef<number>();
  const speedTimeoutRef = useRef<number>();
  const { addToWatchHistory } = useAppContext();

  useEffect(() => {
    // ... fullscreen & key handlers omitted for brevity
  }, [time, playing]);

  useEffect(() => {
    addToWatchHistory(movie);
    createPlayer();
    return () => {
      if (playerInstance.current?.destroy) playerInstance.current.destroy();
      clearTimeout(hideTimeout.current);
      document.body.style.cursor = 'default';
      clearTimeout(speedTimeoutRef.current);
    };
  }, [movie]);

  const createPlayer = () => {
    // ... init logic omitted
  };

  const initPlayer = () => {
    // ... init code omitted
    playerInstance.current = new window.YT.Player(playerRef.current, {
      // ... other params
      events: {
        onReady: (e: any) => {
          setLoaded(true);
          setDuration(e.target.getDuration());
          e.target.setPlaybackRate(playbackRate);
          if (autoplay) e.target.playVideo();
        },
        onStateChange: (e: any) => {
          setPlaying(e.data === window.YT.PlayerState.PLAYING);
          if (e.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            setTime(0);
          }
        },
      }
    });
    setInterval(() => {
      if (playerInstance.current?.getCurrentTime) {
        setTime(playerInstance.current.getCurrentTime());
      }
    }, 500);
  };

  const togglePlay = () => {
    if (!playerInstance.current) return;
    if (playing) playerInstance.current.pauseVideo();
    else playerInstance.current.playVideo();
  };

  const changeRate = (dir: 'up' | 'down') => {
    setPlaybackRate(prev => {
      const idx = SPEED_LEVELS.indexOf(prev);
      let newIdx = dir === 'up' ? idx + 1 : idx - 1;
      if (newIdx >= SPEED_LEVELS.length) newIdx = 0;
      if (newIdx < 0) newIdx = SPEED_LEVELS.length - 1;
      const newRate = SPEED_LEVELS[newIdx];
      playerInstance.current?.setPlaybackRate(newRate);
      return newRate;
    });
  };

  const handleSpeedMouseDown = (dir: 'up' | 'down') => {
    changeRate(dir);
    // accelerate while held
    speedTimeoutRef.current = window.setTimeout(() => handleSpeedMouseDown(dir), 500);
  };

  const handleSpeedMouseUp = () => {
    clearTimeout(speedTimeoutRef.current);
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black" onMouseMove={() => {/* ... */}}>
      <div ref={playerRef} className="w-full h-full" onClick={togglePlay} />

      {loaded && controlsVisible && (
        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80">
          {/* Progress bar omitted */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="p-2 bg-white/20 rounded-full">
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Rewind Speed */}
              <button
                onMouseDown={() => handleSpeedMouseDown('down')}
                onMouseUp={handleSpeedMouseUp}
                onMouseLeave={handleSpeedMouseUp}
                className="p-2 bg-white/20 rounded-full flex items-center"
              >
                <Rewind size={20} />
                <span className="ml-1">{playbackRate}×</span>
              </button>

              {/* Skip Back 10s */}
              <button onClick={() => playerInstance.current.seekTo(time - 10, true)} className="p-2 bg-white/20 rounded-full">
                <SkipBack size={20} />
              </button>

              {/* Skip Forward 10s */}
              <button onClick={() => playerInstance.current.seekTo(time + 10, true)} className="p-2 bg-white/20 rounded-full">
                <SkipForward size={20} />
              </button>

              {/* Fast-Forward Speed */}
              <button
                onMouseDown={() => handleSpeedMouseDown('up')}
                onMouseUp={handleSpeedMouseUp}
                onMouseLeave={handleSpeedMouseUp}
                className="p-2 bg-white/20 rounded-full flex items-center"
              >
                <FastForward size={20} />
                <span className="ml-1">{playbackRate}×</span>
              </button>

              <button onClick={() => {/* toggle mute logic */}} className="p-2 bg-white/20 rounded-full">
                <Volume2 size={20} />
              </button>
            </div>
            <button onClick={() => {/* fullscreen logic */}} className="p-2 bg-white/20 rounded-full">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
