import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { searchMovies } from '../services/api';
import MovieCarousel from '../components/ui/MovieCarousel';

const SUGGESTED_MOVIES = [
  'Yeh Jawaani Hai Deewani full movie',
  'ajab prem ki ghazab kahani full movie',
  'jab we met full movie',
  'phir hera pheri full movie'
];

const HomePage: React.FC = () => {
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestedMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      const suggestedResults = await Promise.all(
        SUGGESTED_MOVIES.map(title => searchMovies(title))
      );
      const suggested = suggestedResults
        .map(result => result.data?.[0])
        .filter((movie): movie is Movie => !!movie);
      setSuggestedMovies(suggested);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedMovies();
  }, []);

  // ✅ Inject ad script
  useEffect(() => {
    const existingScript = document.querySelector("script[src*='profitableratecpm']");
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = '//pl26616785.profitableratecpm.com/d2/45/77/d245771fb295bc02b87a1f76c3537c55.js';
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script); // ✅ append to body directly
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center p-8">
          <h2 className="text-4xl font-semibold mb-4">Something went wrong</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={fetchSuggestedMovies}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white flex">
      {/* Main content */}
      <div className="flex-1 px-4 py-8">
        {suggestedMovies.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Recommended for You</h2>
            <MovieCarousel movies={suggestedMovies} size="large" />
          </>
        )}
      </div>

      {/* Sidebar container */}
      <div className="w-28 sm:w-32 md:w-40 p-2 mt-8">
        {/* Just a placeholder so layout is preserved */}
        <div className="h-full bg-transparent text-xs text-gray-400">
          Ads loading...
        </div>
      </div>
    </div>
  );
};

export default HomePage;
