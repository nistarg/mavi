import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { searchMovies } from '../services/api';
-import HeroBanner from '../components/ui/HeroBanner';
+import HeroSection from '../components/ui/HeroSection';
import SectionRow from '../components/ui/SectionRow';
import Loader from '../components/ui/Loader';
import ErrorState from '../components/ui/ErrorState';

const SUGGESTED = [
  'Yeh Jawaani Hai Deewani',
  'Ajab Prem Ki Ghazab Kahani',
  'Phir Hera Pheri',
  'Jab We Met'
];

const HomePage: React.FC = () => {
  /* fetching logic unchanged */

  return (
    <main className="bg-zinc-900 text-white">
-      <HeroBanner movie={movies[0]} />
+      <HeroSection movie={movies[0]} />
      <div className="pt-8">
        <SectionRow title="Recommended for You" movies={movies} size="large" />
      </div>
    </main>
  );
};

export default HomePage;



