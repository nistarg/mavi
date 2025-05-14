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

  const sizeClasses = {
    small: 'w-[200px] sm:w-[220px] md:w-[240px]',
    medium: 'w-[240px] sm:w-[260px] md:w-[280px]',
    large: 'w-[280px] sm:w-[300px] md:w-[320px]',
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} transition-transform duration-300 ease-out transform hover:scale-110 hover:z-10`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-sm overflow-hidden bg-black/40">
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
          className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black via-black/80 to-transparent
            ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        >
          {/* Top row */}
          <div className="flex justify-between items-start">
            <span className="text-xs bg-red-600 px-2 py-1 rounded-sm flex items-center">
              <Clock size={12} className="mr-1" />
              {movie.durationInMinutes}m
            </span>
            <button
              onClick={handleBookmark}
              className="text-white hover:text-red-500 transition-colors"
              aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>

          {/* Bottom content */}
          <div>
            {movie.imdbRating && (
              <div className="flex items-center mb-2 text-yellow-400">
                <Star size={16} className="mr-1" />
                <span className="font-semibold">{movie.imdbRating}</span>
              </div>
            )}
            <button className="w-full flex items-center justify-center bg-white hover:bg-white/90 text-black font-semibold 
              py-2 px-4 rounded-sm transition-colors">
              <Play size={20} className="mr-2" />
              Play
            </button>
          </div>
        </div>
      </div>

      {/* Title & Year */}
      <div className="mt-2 px-1">
        <h3 className="text-sm font-medium text-gray-200 line-clamp-1">{movie.title}</h3>
        {movie.year && <p className="text-xs text-gray-400">{movie.year}</p>}
      </div>
    </div>
  );
};

export default MovieCard;