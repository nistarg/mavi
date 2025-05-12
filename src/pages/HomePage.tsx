import React, { useEffect, useState, useRef } from 'react';
import HeroSection from '../components/ui/HeroSection';
import { Movie } from '../types';
import { getTrendingMovies, enrichMovieWithMetadata } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDE_INTERVAL = 5000;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 3;

const HomePage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
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
      
      if (res.error) {
        throw new Error(res.error);
      }
      
      const movies = res.data || [];
      if (movies.length === 0) {
        throw new Error('No movies found. Please try again later.');
      }
      
      const top = movies.slice(0, 4);
      const enriched = await Promise.all(
        top.map(movie => enrichMovieWithMetadata(movie))
      );
      setRecommendations(enriched);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        console.log(`Retrying fetch (${nextRetry}/${MAX_RETRIES}) in ${RETRY_DELAY/1000} seconds...`);
        
        retryTimeoutRef.current = window.setTimeout(() => {
          fetchRecs();
        }, RETRY_DELAY);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!recommendations.length) return;
    
    autoSlideRef.current = window.setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % recommendations.length);
    }, SLIDE_INTERVAL);
    
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [recommendations]);

  const prevSlide = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    setCurrentIdx(prev => (prev - 1 + recommendations.length) % recommendations.length);
  };

  const nextSlide = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    setCurrentIdx(prev => (prev + 1) % recommendations.length);
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchRecs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-white p-8">
          <h2 className="text-3xl font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black pt-16 md:pt-0">
      <div className="relative min-h-[calc(100vh-4rem)] md:h-screen overflow-hidden flex items-center">
        {recommendations.map((movie, idx) => (
          <div
            key={movie.id || idx}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out
              ${idx === currentIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <div className="w-full h-full">
              <HeroSection movie={movie} />
            </div>
          </div>
        ))}

        <button
          onClick={prevSlide}
          className="absolute left-4 md:left-6 bottom-24 md:bottom-12 bg-black/40 p-2 md:p-3 rounded-full hover:bg-black/60 text-white transition z-20"
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 md:right-6 bottom-24 md:bottom-12 bg-black/40 p-2 md:p-3 rounded-full hover:bg-black/60 text-white transition z-20"
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;