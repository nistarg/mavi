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
    <div className="relative w-full h-[70vh] sm:h-[80vh] text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.poster || movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover object-top brightness-[0.5]"
          loading="lazy"
          decoding="async"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-[1200px] mx-auto">
        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-6 drop-shadow-lg max-w-3xl leading-tight">
          {movie.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center text-sm sm:text-base text-gray-300 gap-6 mb-4">
          {movie.imdbRating && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Star size={20} />
              <span className="font-semibold">{movie.imdbRating}</span>
            </div>
          )}
          {movie.durationInMinutes && (
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span className="font-semibold">{movie.durationInMinutes} min</span>
            </div>
          )}
          {movie.year && <span className="font-semibold">{movie.year}</span>}
        </div>

        {/* Genres */}
        {movie.genre && (
          <div className="flex flex-wrap gap-3 mb-6">
            {movie.genre.split(',').slice(0, 3).map((g, i) => (
              <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-sm text-sm sm:text-base">
                {g.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Plot */}
        {movie.plot && (
          <p className="text-sm sm:text-base text-gray-300 mb-8 max-w-2xl line-clamp-4">
            {movie.plot}
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handlePlay}
            className="flex items-center px-6 sm:px-8 py-3 bg-white hover:bg-gray-100 text-black font-semibold text-lg sm:text-xl rounded-md transition"
          >
            <Play size={24} className="mr-2" />
            Play
          </button>
          <button
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="flex items-center px-6 sm:px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold text-lg sm:text-xl rounded-md transition"
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
