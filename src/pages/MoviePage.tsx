import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Star, Award, Film, User, Bookmark, BookmarkCheck } from 'lucide-react';
import VideoPlayer from '../components/player/VideoPlayer';
import MovieCarousel from '../components/ui/MovieCarousel';
import { Movie } from '../types';
import {
  enrichMovieWithMetadata,
  getMoviesByActor
} from '../services/api';
import { useAppContext } from '../context/AppContext';

const MoviePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToBookmarks, removeFromBookmarks, isMovieBookmarked, bookmarks } = useAppContext();

  const isBookmarked = movie ? isMovieBookmarked(movie.id) : false;

  useEffect(() => {
    const fetchMovieAndRecommendations = async () => {
      try {
        setLoading(true);

        // 1) Load the main movie either from bookmarks or via metadata
        let base: Movie | undefined = bookmarks.find(m => m.id === id);
        if (!base && id) {
          base = { id, videoId: id, title: '', thumbnail: '', channelTitle: '', publishedAt: '', duration: '', durationInMinutes: 0, viewCount: '' };
          base = await enrichMovieWithMetadata(base);
        }
        if (base) setMovie(base);

        // 2) For “You Might Also Like” — fetch Ranbir Kapoor & Govinda movies
        const [ranbirRes, govindaRes] = await Promise.all([
          getMoviesByActor('Ranbir Kapoor'),
          getMoviesByActor('Govinda'),
        ]);

        // Merge, dedupe by ID, limit to 10
        const combined = [...ranbirRes.data, ...govindaRes.data];
        const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());

        setRelatedMovies(unique.slice(0, 10));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMovieAndRecommendations();
  }, [id, bookmarks]);

  const handleBookmark = () => {
    if (!movie) return;
    isBookmarked ? removeFromBookmarks(movie.id) : addToBookmarks(movie);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center text-white">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-xl">Loading movie...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-white">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
        <p>{error || 'Movie not found.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black opacity-60" />
        <img
          className="w-full h-[200px] md:h-[250px] object-cover"
          src={movie.thumbnail || 'https://via.placeholder.com/1920x400'}
          alt={movie.title}
        />
        <div className="absolute top-1/3 left-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-300 mb-6">
            {movie.year && <div>{movie.year}</div>}
            {movie.durationInMinutes && (
              <div className="flex items-center">
                <Clock size={16} className="mr-1 text-gray-400" />
                <span>{movie.durationInMinutes} min</span>
              </div>
            )}
            {movie.imdbRating && (
              <div className="flex items-center text-yellow-400">
                <Star size={16} className="mr-1" />
                <span>{movie.imdbRating}</span>
              </div>
            )}
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                isBookmarked
                  ? 'border-red-500 text-red-500'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              } transition`}
            >
              {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="relative aspect-video w-full mb-4">
              <VideoPlayer movie={movie} autoplay />
            </div>
            {movie.plot && <p className="text-gray-300">{movie.plot}</p>}
          </div>
          <div>
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Movie Details</h2>
              {['director','actors','genre','awards'].map((field) =>
                (movie as any)[field] ? (
                  <div className="flex items-start mb-4" key={field}>
                    {{ director: <User/>, actors: <User/>, genre: <Film/>, awards: <Award/> }[field]}
                    <div className="ml-3">
                      <p className="text-gray-400 text-sm">{field.charAt(0).toUpperCase() + field.slice(1)}</p>
                      <p className="text-white">{(movie as any)[field]}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>

        {/* You Might Also Like */}
        <div className="mb-12">
          <MovieCarousel
            title="You Might Also Like: "
            movies={relatedMovies}
            size="large"
            className="py-12"
          />
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-900 rounded-lg p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Legal Disclaimer</h2>
          <p className="text-gray-300 text-sm">
            This content is streamed directly from YouTube. All rights belong to their respective owners.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoviePage;
