import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { getTrendingMovies, enrichMovieWithMetadata, searchMovies } from '../services/api';
import MovieCarousel from '../components/ui/MovieCarousel';

const SUGGESTED_MOVIES = [
  'Yeh Jawaani Hai Deewani full movie',
  'Zindagi Na Milegi Dobara full movie',
  'Golmaal full movie',
  'Dil Chahta Hai full movie',
  '3 Idiots full movie',
  'Chennai Express full movie'
];

const HomePage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrendingMovies();
      if (res.error) throw new Error(res.error);

      const movies = res.data || [];
      if (movies.length === 0) throw new Error('No movies found. Please try again later.');

      const top = movies.slice(0, 4);
      const enriched = await Promise.all(top.map(movie => enrichMovieWithMetadata(movie)));
      setRecommendations(enriched);

      // Fetch suggested movies
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
    fetchRecs();
  }, []);

  const handleRetry = () => {
    fetchRecs();
  };

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
            onClick={handleRetry}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <div className="h-[60vh] w-full bg-cover bg-center relative" 
           style={{ backgroundImage: `url(${recommendations[0]?.backdrop || recommendations[0]?.poster})` }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl text-white z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">
            {recommendations[0]?.title}
          </h1>
          <p className="text-lg md:text-xl mb-6 line-clamp-3">{recommendations[0]?.description || recommendations[0]?.plot}</p>
          <div className="flex gap-4">
            <button className="bg-white text-black font-semibold px-6 py-2 rounded hover:bg-gray-200 transition">
              ▶ Play
            </button>
            <button className="bg-gray-700/60 text-white font-semibold px-6 py-2 rounded hover:bg-gray-600 transition">
              ℹ More Info
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Movies Section */}
      {suggestedMovies.length > 0 && (
        <div className="bg-black py-8 px-4">
          <h2 className="text-2xl font-semibold mb-4">Recommended for You</h2>
          <MovieCarousel
            movies={suggestedMovies}
            size="large"
          />
        </div>
      )}

      {/* Trending Movies Section */}
      {recommendations.length > 0 && (
        <div className="bg-black py-8 px-4">
          <h2 className="text-2xl font-semibold mb-4">Trending Now</h2>
          <MovieCarousel
            movies={recommendations}
            size="large"
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
