// src/components/ui/MovieCarousel.tsx
import React from 'react';
import { Movie } from '../../types';
import MovieCard from './MovieCard';

interface Props {
  movies: Movie[];
  size?: 'small' | 'medium' | 'large';
}

const MovieCarousel: React.FC<Props> = ({ movies, size = 'medium' }) => {
  return (
    <ul className="flex overflow-x-auto scroll-snap-x snap-mandatory space-x-4 px-4 pb-4 no-scrollbar md:px-8">
      {movies.map((m) => (
        <li key={m.id} className="snap-start shrink-0">
          <MovieCard movie={m} size={size} />
        </li>
      ))}
    </ul>
  );
};

export default MovieCarousel;
