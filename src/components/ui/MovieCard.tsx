// src/components/ui/MovieCard.tsx
import React from 'react';
import { Movie } from '../../types';

interface Props {
  movie: Movie;
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'w-32',
  medium: 'w-44',
  large: 'w-60'
};

const MovieCard: React.FC<Props> = ({ movie, size = 'medium' }) => (
  <div className={`relative ${sizeClasses[size]} cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.08]`}>
    <img
      src={movie.poster}
      alt={movie.title}
      className="block w-full rounded-lg object-cover"
      loading="lazy"
    />
    <div className="absolute inset-0 flex items-end justify-center opacity-0 hover:opacity-100">
      <button className="bg-white/80 rounded-full p-2 text-black transition-opacity duration-150">
        ▶
      </button>
    </div>
  </div>
);

export default MovieCard;

