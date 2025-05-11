// HomePage.tsx

import React, { useEffect, useState, useRef } from 'react';
import HeroSection from '../components/ui/HeroSection';
import { Movie } from '../types';
import { getTrendingMovies, enrichMovieWithMetadata } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDE_INTERVAL = 5000;

const HomePage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const autoSlideRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        setLoading(true);
        const res = await getTrendingMovies();
        if (res.error) throw new Error(res.error);
        const movies = res.data || [];
        const top = movies.slice(0, 4);
        const enriched = await Promise.all(
          top.map(movie => enrichMovieWithMetadata(movie))
        );
        setRecommendations(enriched);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white p-8">
          <h2 className="text-3xl font-semibold mb-2">Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black">
      <div className="relative h-screen overflow-hidden flex items-center">
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
          className="absolute left-6 bottom-12 bg-black/40 p-3 rounded-full hover:bg-black/60 text-white transition"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-6 bottom-12 bg-black/40 p-3 rounded-full hover:bg-black/60 text-white transition"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
