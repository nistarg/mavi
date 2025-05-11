import React from 'react';
import { useAppContext } from '../context/AppContext';
import MovieCard from '../components/ui/MovieCard';
import { Clock, Trash2 } from 'lucide-react';

const WatchHistoryPage: React.FC = () => {
  const { watchHistory } = useAppContext();
  
  return (
    <div className="container mx-auto px-4 pt-24 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Clock size={24} className="text-indigo-400" />
          <h1 className="text-3xl font-bold">Watch History</h1>
        </div>
        {watchHistory.length > 0 && (
          <button className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition">
            <Trash2 size={18} />
            <span>Clear History</span>
          </button>
        )}
      </div>
      
      {watchHistory.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-400 mb-4">Your watch history is empty</p>
          <p className="text-gray-500">Movies you watch will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {watchHistory.map(movie => (
            <MovieCard key={movie.id} movie={movie} size="small" />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchHistoryPage;