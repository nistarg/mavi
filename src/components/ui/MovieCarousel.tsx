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
    <div className="my-16 max-w-[2000px] mx-auto">
      {/* Carousel Title */}
      <h2 className="text-3xl md:text-4xl font-bold mb-6 px-6">{title}</h2>

      <div className="relative">
        {/* Left Scroll Button */}
        <button 
          onClick={() => scroll('left')}
          className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-black text-white p-4 rounded-full z-10 opacity-50 hover:opacity-100 transition"
          aria-label="Scroll left"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Movie List (Carousel) */}
        <div 
          ref={carouselRef}
          className="flex overflow-x-scroll space-x-8 px-6 pb-6 scrollbar-hide"
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} size={size} />
          ))}
        </div>

        {/* Right Scroll Button */}
        <button 
          onClick={() => scroll('right')}
          className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-black text-white p-4 rounded-full z-10 opacity-50 hover:opacity-100 transition"
          aria-label="Scroll right"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};