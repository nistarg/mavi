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
    <div className="relative w-full h-full">
      {/* Background Image with lazy loading */}
      <div className="absolute inset-0">
        <img
          src={movie.poster || movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 line-clamp-2">{movie.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {movie.imdbRating && (
                <div className="flex items-center text-yellow-400">
                  <Star size={18} className="mr-1" />
                  <span>{movie.imdbRating}</span>
                </div>
              )}
              
              <div className="flex items-center text-gray-300">
                <Clock size={18} className="mr-1" />
                <span>{movie.durationInMinutes} min</span>
              </div>
              
              {movie.year && (
                <span className="text-gray-300">{movie.year}</span>
              )}
            </div>
            
            {movie.genre && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {movie.genre.split(',').slice(0, 3).map((genre, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-800 rounded-full text-xs">
                      {genre.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {movie.plot && (
              <p className="text-gray-300 mb-6 line-clamp-2 md:line-clamp-3 text-sm md:text-base">
                {movie.plot}
              </p>
            )}
            
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button
                onClick={handlePlay}
                className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full transition text-sm md:text-base"
              >
                <Play size={18} className="mr-2" />
                <span>Play Now</span>
              </button>
              
              <button
                onClick={() => navigate(`/movie/${movie.id}`)}
                className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-gray-800 hover:bg-gray-700 rounded-full transition text-sm md:text-base"
              >
                <Info size={18} className="mr-2" />
                <span>More Info</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;