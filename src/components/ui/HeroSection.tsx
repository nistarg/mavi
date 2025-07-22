// src/components/ui/HeroBanner.tsx
import React from 'react';
import { Movie } from '../../types';

interface Props { movie?: Movie; }

const HeroBanner: React.FC<Props> = ({ movie }) => {
  if (!movie) return null;
  return (
    <section
      className="relative h-[60vh] min-h-[480px] w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${movie.poster})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-16">
        <h1 className="max-w-xl text-3xl font-black md:text-5xl">{movie.title}</h1>
        <p className="mt-4 line-clamp-3 max-w-md text-sm text-gray-200 md:text-base">
          {movie.description}
        </p>
        <div className="mt-6 flex items-center gap-4">
          <button className="inline-flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black hover:bg-white/80">
            ▶ Play
          </button>
          <button className="inline-flex items-center gap-2 rounded border border-gray-300/70 px-6 py-2 font-semibold hover:bg-white/20">
            ℹ More Info
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
