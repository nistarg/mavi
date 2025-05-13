import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import { Movie } from '../../types';

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  size?: 'small' | 'medium' | 'large';
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ 
  title, 
  movies, 
  size = 'medium'
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  const checkScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { current } = carouselRef;
      const scrollAmount = direction === 'left'
        ? -current.clientWidth * 0.75
        : current.clientWidth * 0.75;

      current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });

      // Update button visibility after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };

  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div className="my-8 md:my-16 w-full">
      {/* Carousel Title */}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 px-4 md:px-6">{title}</h2>

      <div className="relative group">
        {/* Left Scroll Button */}
        {showLeftButton && (
          <button 
            onClick={() => scroll('left')}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/80 text-white p-2 md:p-4 
              rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Movie List (Carousel) */}
        <div 
          ref={carouselRef}
          className="flex overflow-x-scroll space-x-4 md:space-x-6 px-4 md:px-6 pb-6 scrollbar-hide"
          onScroll={checkScrollButtons}
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} size={size} />
          ))}
        </div>

        {/* Right Scroll Button */}
        {showRightButton && (
          <button 
            onClick={() => scroll('right')}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/80 text-white p-2 md:p-4 
              rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCarousel;