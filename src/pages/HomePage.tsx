import React, { useEffect, useState, useRef } from 'react';
import { Movie } from '../types';
import { getTrendingMovies, enrichMovieWithMetadata, searchMovies } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCarousel from '../components/ui/MovieCarousel';

const SLIDE_INTERVAL = 5000;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 18;

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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const autoSlideRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

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

      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        retryTimeoutRef.current = window.setTimeout(() => fetchRecs(), RETRY_DELAY);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
    return () => retryTimeoutRef.current && clearTimeout(retryTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!recommendations.length) return;
    autoSlideRef.current = window.setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % recommendations.length);
    }, SLIDE_INTERVAL);
    return () => autoSlideRef.current && clearInterval(autoSlideRef.current);
  }, [recommendations]);

  const prevSlide = () => {
    autoSlideRef.current && clearInterval(autoSlideRef.current);
    setCurrentIdx(prev => (prev - 1 + recommendations.length) % recommendations.length);
  };

  const nextSlide = () => {
    autoSlideRef.current && clearInterval(autoSlideRef.current);
    setCurrentIdx(prev => (prev + 1) % recommendations.length);
  };

  const handleRetry = () => {
    setRetryCount(0);
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
    <div className="relative bg-black">
      {/* Hero Section */}
      <div className="relative h-screen w-full overflow-hidden">
        {recommendations.map((movie, idx) => (
          <div
            key={movie.id || idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out
              ${idx === currentIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${movie.backdrop || movie.poster})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80" />
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl text-white z-10">
                <h1 className="text-5xl md:text-7xl font-extrabold mb-4 drop-shadow-lg">{movie.title}</h1>
                <p className="text-lg md:text-xl mb-6 line-clamp-3">{movie.description || movie.plot}</p>
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
          </div>
        ))}

        <button
          onClick={prevSlide}
          className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 bg-black/60 p-3 md:p-4 rounded-full hover:bg-black/80 text-white transition z-20"
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 bg-black/60 p-3 md:p-4 rounded-full hover:bg-black/80 text-white transition z-20"
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
        </button>
      </div>

      {/* Suggested Movies Section */}
      {suggestedMovies.length > 0 && (
        <div className="w-full bg-black">
          <MovieCarousel
            title="Recommended for You"
            movies={suggestedMovies}
            size="large"
          />
        </div>
      )}

      {/* Trending Section */}
      {recommendations.length > 0 && (
        <div className="w-full bg-black">
          <MovieCarousel
            title="Trending Now"
            movies={recommendations}
            size="large"
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;