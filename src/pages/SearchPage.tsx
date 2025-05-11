import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import MovieCard from '../components/ui/MovieCard';
import { Movie, SearchParams } from '../types';
import { advancedSearch } from '../services/api';

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<{
    language: string;
    genre: string;
    actor: string;
    year: string;
    duration: number;
  }>({
    language: '',
    genre: '',
    actor: '',
    year: '',
    duration: 60,
  });
  
  const languages = ['Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali'];
  const genres = ['Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror'];
  const actors = ['Shah Rukh Khan', 'Salman Khan', 'Aamir Khan', 'Akshay Kumar', 'Hrithik Roshan'];
  const years = ['2023', '2022', '2021', '2020', '2010-2019', '2000-2009', '1990-1999'];
  
  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);
  
  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const searchParams: SearchParams = {
        query: searchQuery,
        language: filters.language,
        genre: filters.genre,
        actor: filters.actor,
        year: filters.year,
        duration: filters.duration,
      };
      
      const result = await advancedSearch(searchParams);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSearchResults(result.data || []);
      
      // Update URL parameters
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      if (filters.language) params.set('language', filters.language);
      if (filters.genre) params.set('genre', filters.genre);
      if (filters.actor) params.set('actor', filters.actor);
      if (filters.year) params.set('year', filters.year);
      
      navigate({ search: params.toString() });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };
  
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const resetFilters = () => {
    setFilters({
      language: '',
      genre: '',
      actor: '',
      year: '',
      duration: 60,
    });
  };
  
  return (
    <div className="container mx-auto px-4 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Search Movies</h1>
        
        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for movies..."
            className="w-full py-3 px-5 pr-12 rounded-full bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:outline-none"
          />
          <button 
            type="submit" 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <Search size={20} />
          </button>
        </form>
        
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <Filter size={18} />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
          
          {showFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 text-gray-300 hover:text-white"
            >
              <X size={18} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Language</label>
              <select
                name="language"
                value={filters.language}
                onChange={handleFilterChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
              >
                <option value="">All Languages</option>
                {languages.map(language => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">Genre</label>
              <select
                name="genre"
                value={filters.genre}
                onChange={handleFilterChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">Actor</label>
              <select
                name="actor"
                value={filters.actor}
                onChange={handleFilterChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
              >
                <option value="">All Actors</option>
                {actors.map(actor => (
                  <option key={actor} value={actor}>{actor}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">Year</label>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
              >
                <option value="">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Min Duration: {filters.duration} min
              </label>
              <input
                type="range"
                name="duration"
                min="30"
                max="180"
                step="15"
                value={filters.duration}
                onChange={handleFilterChange}
                className="w-full"
              />
            </div>
            
            <div className="col-span-full">
              <button
                onClick={() => {
                  performSearch();
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="flex justify-center p-12">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4">Searching for movies...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="text-center p-6 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">{error}</p>
          <p className="mt-2 text-gray-300">Please try again or refine your search.</p>
        </div>
      )}
      
      {!loading && !error && searchResults.length === 0 && query && (
        <div className="text-center p-8">
          <p className="text-xl">No movies found matching "{query}"</p>
          <p className="mt-2 text-gray-400">Try different keywords or filters.</p>
        </div>
      )}
      
      {searchResults.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-6">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {searchResults.map(movie => (
              <MovieCard key={movie.id} movie={movie} size="small" />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchPage;