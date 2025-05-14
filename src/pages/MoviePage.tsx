import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Star, Award, Film, User, Bookmark, BookmarkCheck } from 'lucide-react';
import VideoPlayer from '../components/player/VideoPlayer';
import MovieCarousel from '../components/ui/MovieCarousel';
import { Movie } from '../types';
import { enrichMovieWithMetadata, getTrendingMovies } from '../services/api';
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
    const fetchMovie = async () => {
      try {
        setLoading(true);
        
        const bookmarkedMovie = bookmarks.find(m => m.id === id);
        
        if (bookmarkedMovie) {
          setMovie(bookmarkedMovie);
        } else {
          const basicMovie: Movie = {
            id: id || '',
            videoId: id || '',
            title: '',
            thumbnail: '',
            channelTitle: '',
            publishedAt: '',
            duration: '',
            durationInMinutes: 0,
            viewCount: '',
          };
          
          const trendingResult = await getTrendingMovies();
          if (trendingResult.data) {
            setRelatedMovies(trendingResult.data);
            
            const foundMovie = trendingResult.data.find(m => m.id === id);
            
            if (foundMovie) {
              const enrichedMovie = await enrichMovieWithMetadata(foundMovie);
              setMovie(enrichedMovie);
            } else {
              const enrichedMovie = await enrichMovieWithMetadata(basicMovie);
              setMovie(enrichedMovie);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        console.error('Error fetching movie:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchMovie();
    }
  }, [id, bookmarks]);
  
  const handleBookmark = () => {
    if (!movie) return;
    
    if (isBookmarked) {
      removeFromBookmarks(movie.id);
    } else {
      addToBookmarks(movie);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center text-white">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xl">Loading movie...</p>
        </div>
      </div>
    );
  }
  
  if (error || !movie) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-white">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
        <p className="mb-4">
          {error || 'Movie not found. It might have been removed from YouTube.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black opacity-60"></div>
        <img
          className="w-full h-[300px] md:h-[400px] object-cover"
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
      
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Video Player and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            {/* Make the video player larger by removing unnecessary padding */}
            <div className="relative aspect-video w-full mb-4">
              <VideoPlayer movie={movie} autoplay={true} />
            </div>
          </div>
          
          <div>
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Movie Details</h2>
              
              {movie.plot && (
                <div className="mb-6">
                  <p className="text-gray-300">{movie.plot}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {movie.director && (
                  <div className="flex items-start">
                    <User className="text-red-500 mr-3 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm">Director</p>
                      <p className="text-white">{movie.director}</p>
                    </div>
                  </div>
                )}
                
                {movie.actors && (
                  <div className="flex items-start">
                    <User className="text-red-500 mr-3 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm">Cast</p>
                      <p className="text-white">{movie.actors}</p>
                    </div>
                  </div>
                )}
                
                {movie.genre && (
                  <div className="flex items-start">
                    <Film className="text-red-500 mr-3 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm">Genre</p>
                      <p className="text-white">{movie.genre}</p>
                    </div>
                  </div>
                )}
                
                {movie.awards && movie.awards !== 'N/A' && (
                  <div className="flex items-start">
                    <Award className="text-red-500 mr-3 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm">Awards</p>
                      <p className="text-white">{movie.awards}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Related Movies */}
        <div className="mb-12">
          <MovieCarousel 
            title="You Might Also Like" 
            movies={relatedMovies.filter(m => m.id !== movie.id).slice(0, 10)} 
          />
        </div>
        
        {/* Legal Disclaimer */}
        <div className="bg-gray-900 rounded-lg p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Legal Disclaimer</h2>
          <p className="text-gray-300 text-sm">
            This content is streamed directly from YouTube and is publicly available there. 
            MAVI does not host, upload, or own any video content. All rights belong to their 
            respective owners. If you are the copyright owner of any content displayed here 
            and would like it removed, please contact YouTube directly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoviePage;
