import React, { useRef } from 'react';
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
    }
  };
  
  if (!movies || movies.length === 0) {
    return null;
  }
  
  return (
    <div className="my-8">
      <h2 className="text-xl md:text-2xl font-bold mb-4 px-4">{title}</h2>
      
      <div className="carousel-container">
        {/* Left scroll button */}
        <button 
          onClick={() => scroll('left')}
          className="carousel-button carousel-button-left"
          aria-label="Scroll left"
        >
          <ChevronLeft />
        </button>
        
        {/* Movie list */}
        <div 
          ref={carouselRef}
          className="carousel"
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} size={size} />
          ))}
        </div>
        
        {/* Right scroll button */}
        <button 
          onClick={() => scroll('right')}
          className="carousel-button carousel-button-right"
          aria-label="Scroll right"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default MovieCarousel;