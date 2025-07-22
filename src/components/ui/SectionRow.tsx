// src/components/ui/SectionRow.tsx
import React from 'react';
import { Movie } from '../../types';
import MovieCarousel from './MovieCarousel';

interface SectionRowProps {
  title: string;
  movies: Movie[];
  size?: 'small' | 'medium' | 'large';
}

const SectionRow: React.FC<SectionRowProps> = ({ title, movies, size = 'medium' }) => (
  <section className="mt-10">
    <h2 className="mb-3 px-4 text-xl font-semibold md:px-8 md:text-2xl">{title}</h2>
    <MovieCarousel movies={movies} size={size} />
  </section>
);

export default SectionRow;
