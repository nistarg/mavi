import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Star, Bookmark, BookmarkCheck, AlertCircle } from 'lucide-react';
import { Movie } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface MovieCardProps {
  movie: Movie;
  size?: 'small' | 'medium' | 'large';
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, size = 'large' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(movie.poster || movie.thumbnail);
  const navigate = useNavigate();
  const { addToBookmarks, removeFromBookmarks, isMovieBookmarked } = useAppContext();

  const handleClick = () => navigate(`/movie/${movie.id}`);
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    isBookmarked ? removeFromBookmarks(movie.id) : addToBookmarks(movie);
  };

  const isBookmarked = isMovieBookmarked(movie.id);

  useEffect(() => {
    if (movie.videoId) {
      const hdUrl = `https://img.youtube.com/vi/${movie.videoId}/maxresdefault.jpg`;
      const img = new Image();
      img.onload = () => setThumbnailUrl(hdUrl);
      img.onerror = () => {
        setThumbnailUrl(`https://img.youtube.com/vi/${movie.videoId}/hqdefault.jpg`);
      };
      img.src = hdUrl;
    }
  }, [movie.videoId]);

  // Netflix-like width sizes with more responsive design
  const sizeClasses = {
    small: 'w-[150px] sm:w-[180px] md:w-[200px]',
    medium: 'w-[200px] sm:w-[220px] md:w-[240px]',
    large: 'w-[240px] sm:w-[260px] md:w-[280px]',
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-105 hover:z-20`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-black/40 shadow-md">
        {/* Poster/Thumbnail */}
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
            <AlertCircle size={48} />
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black via-black/80 to-transparent
            ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        >
          {/* Top row */}
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] bg-red-600 px-1.5 py-0.5 rounded-sm flex items-center">
              <Clock size={12} className="mr-1" />
              {movie.durationInMinutes}m
            </span>
            <button
              onClick={handleBookmark}
              className="text-white hover:text-red-500 transition-colors"
              aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            >
              {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>

          {/* Bottom content */}
          <div>
            {movie.imdbRating && (
              <div className="flex items-center mb-2 text-yellow-400 text-xs sm:text-[11px]">
                <Star size={14} className="mr-1" />
                <span className="font-semibold">{movie.imdbRating}</span>
              </div>
            )}
            <button
              className="w-full flex items-center justify-center bg-white hover:bg-white/90 text-black font-semibold 
              py-1.5 px-3 text-sm sm:text-base rounded-sm transition"
            >
              <Play size={16} className="mr-2" />
              Play
            </button>
          </div>
        </div>
      </div>

      {/* Title & Year */}
      <div className="mt-2 px-1">
        <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-1">{movie.title}</h3>
        {movie.year && <p className="text-xs sm:text-sm text-gray-400">{movie.year}</p>}
      </div>
    </div>
  );
};

export default MovieCard;
