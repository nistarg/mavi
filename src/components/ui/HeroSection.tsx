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
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col justify-center h-full px-8 md:px-16 max-w-5xl">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 drop-shadow-md">{movie.title}</h1>

        {/* Meta Info: Rating, Duration, Year */}
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
          <div className="flex flex-wrap gap-4 mb-5">
            {movie.genre.split(',').slice(0, 3).map((g, i) => (
              <span key={i} className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">{g.trim()}</span>
            ))}
          </div>
        )}

        {/* Plot */}
        {movie.plot && (
          <p className="text-lg text-gray-300 mb-8 line-clamp-4">{movie.plot}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-6">
          <button
            onClick={handlePlay}
            className="flex items-center px-8 py-3 bg-white text-black font-semibold text-lg rounded-xl hover:bg-gray-200 transition duration-300"
          >
            <Play size={24} className="mr-3" />
            Play
          </button>
          <button
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="flex items-center px-8 py-3 bg-white/30 hover:bg-white/40 text-white font-semibold text-lg rounded-xl transition duration-300"
          >
            <Info size={24} className="mr-3" />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
