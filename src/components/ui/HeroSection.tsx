import React from 'react';
import { Play, Info, Star, Clock } from 'lucide-react';
import { Movie } from '../../types';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
  movie: Movie;
}

const HeroSection: React.FC<HeroSectionProps> = ({ movie }) => {
  const navigate = useNavigate();

  const handlePlay = () => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div className="relative w-full h-[95vh] text-white">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={movie.poster || movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* Netflix-style overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-4 sm:px-8 md:px-16 max-w-7xl mx-auto">
        {/* Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold mb-6 text-shadow-lg max-w-3xl">
          {movie.title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center text-lg text-gray-300 gap-6 mb-4">
          {movie.imdbRating && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Star size={20} />
              <span className="font-semibold">{movie.imdbRating}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="font-semibold">{movie.durationInMinutes} min</span>
          </div>
          {movie.year && <span className="font-semibold">{movie.year}</span>}
        </div>

        {/* Genres */}
        {movie.genre && (
          <div className="flex flex-wrap gap-3 mb-6">
            {movie.genre.split(',').slice(0, 3).map((g, i) => (
              <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-sm text-sm">
                {g.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Plot */}
        {movie.plot && (
          <p className="text-lg text-gray-300 mb-8 max-w-2xl line-clamp-3">{movie.plot}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handlePlay}
            className="flex items-center px-8 py-3 bg-white hover:bg-white/90 text-black font-semibold text-xl rounded transition-colors"
          >
            <Play size={24} className="mr-2" />
            Play
          </button>
          <button
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="flex items-center px-8 py-3 bg-gray-500/30 hover:bg-gray-500/40 text-white font-semibold text-xl rounded transition-colors"
          >
            <Info size={24} className="mr-2" />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;