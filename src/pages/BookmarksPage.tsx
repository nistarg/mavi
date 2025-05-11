import React from 'react';
import { useAppContext } from '../context/AppContext';
import MovieCard from '../components/ui/MovieCard';
import { Bookmark, Trash2 } from 'lucide-react';

const BookmarksPage: React.FC = () => {
  const { bookmarks, removeFromBookmarks } = useAppContext();
  
  return (
    <div className="container mx-auto px-4 pt-24 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Bookmark size={24} className="text-indigo-400" />
          <h1 className="text-3xl font-bold">Bookmarks</h1>
        </div>
        {bookmarks.length > 0 && (
          <button 
            onClick={() => bookmarks.forEach(movie => removeFromBookmarks(movie.id))}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition"
          >
            <Trash2 size={18} />
            <span>Clear All</span>
          </button>
        )}
      </div>
      
      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-400 mb-4">Your bookmarks list is empty</p>
          <p className="text-gray-500">Save your favorite movies for later by clicking the bookmark icon</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {bookmarks.map(movie => (
            <MovieCard key={movie.id} movie={movie} size="small" />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;