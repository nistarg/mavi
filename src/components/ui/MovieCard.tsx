import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Star, Bookmark, BookmarkCheck } from 'lucide-react';
import { Movie } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface MovieCardProps {
  movie: Movie;
  size?: 'small' | 'medium' | 'large';
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, size = 'large' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { addToBookmarks, removeFromBookmarks, isMovieBookmarked } = useAppContext();

  const handleClick = () => navigate(`/movie/${movie.id}`);
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    isBookmarked ? removeFromBookmarks(movie.id) : addToBookmarks(movie);
  };

  const isBookmarked = isMovieBookmarked(movie.id);

  const sizeClasses = {
    small: 'w-48 md:w-60',       // Small card size
    medium: 'w-72 md:w-80',      // Medium card size
    large: 'w-96 md:w-[320px]',  // Huge card size for "Netflix-like" appearance
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} transition-transform duration-300 ease-in-out transform hover:scale-110 group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
        {/* Poster */}
        <img
          src={movie.poster || movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Hover Overlay */}
        <div className={`absolute inset-0 flex flex-col justify-between p-4 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
          {/* Top row: duration and bookmark */}
          <div className="flex justify-between items-start">
            <span className="text-xs bg-red-600 px-3 py-1 rounded-full flex items-center">
              <Clock size={14} className="mr-2" />
              {movie.durationInMinutes} min
            </span>
            <button
              onClick={handleBookmark}
              className="hover:text-red-500 transition"
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>

          {/* Bottom row: Play + Rating */}
          <div>
            {movie.imdbRating && (
              <div className="flex items-center mb-3 text-yellow-400">
                <Star size={18} className="mr-2" />
                <span className="text-lg font-semibold">{movie.imdbRating}</span>
              </div>
            )}
            <div className="flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full py-2 px-6 text-lg font-bold transition shadow-lg">
              <Play size={22} className="mr-3" />
              Play
            </div>
          </div>
        </div>
      </div>

      {/* Title & Year below card */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-white line-clamp-2">{movie.title}</h3>
        {movie.year && <p className="text-sm text-gray-300 mt-1">{movie.year}</p>}
      </div>
    </div>
  );
};

export default MovieCard;
