import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Movie } from '../types';

interface AppContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  watchHistory: Movie[];
  addToWatchHistory: (movie: Movie) => void;
  bookmarks: Movie[];
  addToBookmarks: (movie: Movie) => void;
  removeFromBookmarks: (movieId: string) => void;
  isMovieBookmarked: (movieId: string) => boolean;
  currentApiKeyIndex: number;
  rotateApiKey: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [watchHistory, setWatchHistory] = useState<Movie[]>([]);
  const [bookmarks, setBookmarks] = useState<Movie[]>([]);
  const [currentApiKeyIndex, setCurrentApiKeyIndex] = useState(0);
  
  // Initialize from localStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem('watchHistory');
    const storedBookmarks = localStorage.getItem('bookmarks');
    const storedDarkMode = localStorage.getItem('darkMode');
    
    if (storedHistory) setWatchHistory(JSON.parse(storedHistory));
    if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    if (storedDarkMode !== null) setIsDarkMode(storedDarkMode === 'true');
    
  }, []);
  
  // Save to localStorage when changes occur
  useEffect(() => {
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
  }, [watchHistory]);
  
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);
  
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const addToWatchHistory = (movie: Movie) => {
    setWatchHistory((prev) => {
      // Remove if it already exists
      const filtered = prev.filter((m) => m.id !== movie.id);
      // Add to the beginning
      return [movie, ...filtered];
    });
  };
  
  const addToBookmarks = (movie: Movie) => {
    setBookmarks((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev;
      return [...prev, movie];
    });
  };
  
  const removeFromBookmarks = (movieId: string) => {
    setBookmarks((prev) => prev.filter((movie) => movie.id !== movieId));
  };
  
  const isMovieBookmarked = (movieId: string) => {
    return bookmarks.some((movie) => movie.id === movieId);
  };
  
  const rotateApiKey = () => {
    setCurrentApiKeyIndex((prev) => (prev + 1) % 3); // Assuming 3 API keys
  };
  
  const value: AppContextType = {
    isDarkMode,
    toggleDarkMode,
    watchHistory,
    addToWatchHistory,
    bookmarks,
    addToBookmarks,
    removeFromBookmarks,
    isMovieBookmarked,
    currentApiKeyIndex,
    rotateApiKey,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};