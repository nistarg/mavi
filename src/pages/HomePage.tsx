import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { searchMovies } from '../services/api';
import HeroBanner from '../components/ui/HeroBanner';
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
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(SUGGESTED.map(title => searchMovies(title)));
      const list = results.map(r => r.data?.[0]).filter((m): m is Movie => !!m);
      setMovies(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMovies(); }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState retry={fetchMovies} message={error} />;

  return (
    <main className="bg-zinc-900 text-white">
      <HeroBanner movie={movies[0]} />
      <div className="pt-8">
        <SectionRow title="Recommended for You" movies={movies} size="large" />
        {/* Add more sections here */}
      </div>
    </main>
  );
};

export default HomePage;


