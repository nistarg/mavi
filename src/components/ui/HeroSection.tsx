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
    <div className="relative w-full aspect-video text-white overflow-hidden rounded-lg shadow-lg">
      {/* Background Image */}
      <img
        src={movie.poster || movie.thumbnail}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col justify-center h-full px-6 md:px-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-md">{movie.title}</h1>

        <div className="flex items-center text-sm text-gray-300 gap-4 mb-3">
          {movie.imdbRating && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star size={16} />
              <span>{movie.imdbRating}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{movie.durationInMinutes} min</span>
          </div>
          {movie.year && <span>{movie.year}</span>}
        </div>

        {movie.genre && (
          <div className="flex flex-wrap gap-2 mb-3">
            {movie.genre.split(',').slice(0, 3).map((g, i) => (
              <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-xs">{g.trim()}</span>
            ))}
          </div>
        )}

        {movie.plot && (
          <p className="text-sm text-gray-300 mb-6 line-clamp-3">{movie.plot}</p>
        )}

        <div className="flex gap-4">
          <button
            onClick={handlePlay}
            className="flex items-center px-6 py-2 bg-white text-black font-semibold rounded hover:bg-gray-200 transition"
          >
            <Play size={20} className="mr-2" />
            Play
          </button>
          <button
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="flex items-center px-6 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded transition"
          >
            <Info size={20} className="mr-2" />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
