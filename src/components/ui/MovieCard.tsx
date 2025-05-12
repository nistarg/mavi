import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Star, Bookmark, BookmarkCheck } from 'lucide-react';
import { Movie } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface MovieCardProps {
  movie: Movie;
  size?: 'small' | 'medium' | 'large';
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, size = 'medium' }) => {
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
    small: 'w-36 md:w-40',
    medium: 'w-48 md:w-56',
    large: 'w-60 md:w-72',
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} transition-transform duration-300 ease-in-out transform hover:scale-110 group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden shadow-md">
        {/* Poster */}
        <img
          src={movie.poster || movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Hover Overlay */}
        <div className={`absolute inset-0 flex flex-col justify-between p-3 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
          {/* Top row: duration and bookmark */}
          <div className="flex justify-between items-start">
            <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full flex items-center">
              <Clock size={12} className="mr-1" />
              {movie.durationInMinutes} min
            </span>
            <button
              onClick={handleBookmark}
              className="hover:text-red-500 transition"
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>

          {/* Bottom row: Play + Rating */}
          <div>
            {movie.imdbRating && (
              <div className="flex items-center mb-2 text-yellow-400">
                <Star size={16} className="mr-1" />
                <span className="text-sm">{movie.imdbRating}</span>
              </div>
            )}
            <div className="flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full py-1 px-3 text-sm font-semibold transition shadow-md">
              <Play size={18} className="mr-2" />
              Play
            </div>
          </div>
        </div>
      </div>

      {/* Title & Year below card */}
      <div className="mt-2">
        <h3 className="text-sm font-bold text-white line-clamp-2">{movie.title}</h3>
        {movie.year && <p className="text-xs text-gray-400 mt-0.5">{movie.year}</p>}
      </div>
    </div>
  );
};

export default MovieCard;
