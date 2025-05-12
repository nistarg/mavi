import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bookmark, History, Menu, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };
  
  const navbarClass = isScrolled
    ? 'fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur shadow-md z-50 transition-all duration-300'
    : 'fixed top-0 left-0 right-0 bg-gradient-to-b from-gray-900 to-transparent z-50 transition-all duration-300';
  
  return (
    <nav className={navbarClass}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-white bg-red-600 px-2 py-1 rounded">
              MAVI
            </div>
          </Link>
          
          <div className="hidden md:flex md:items-center md:space-x-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="w-64 py-2 px-4 pr-10 rounded-full bg-gray-800 text-white border border-gray-700 focus:border-red-600 focus:outline-none"
              />
              <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
                <Search size={18} />
              </button>
            </form>
            
            <Link
              to="/bookmarks"
              className={`flex items-center space-x-1 hover:text-red-600 transition ${
                location.pathname === '/bookmarks' ? 'text-red-600' : 'text-gray-300'
              }`}
            >
              <Bookmark size={18} />
              <span>Bookmarks</span>
            </Link>
            
            <Link
              to="/history"
              className={`flex items-center space-x-1 hover:text-red-600 transition ${
                location.pathname === '/history' ? 'text-red-600' : 'text-gray-300'
              }`}
            >
              <History size={18} />
              <span>History</span>
            </Link>
          </div>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-800">
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="w-full py-2 px-4 pr-10 rounded-full bg-gray-800 text-white border border-gray-700 focus:border-red-600 focus:outline-none"
              />
              <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
                <Search size={18} />
              </button>
            </form>
            
            <div className="flex flex-col space-y-4">
              <Link
                to="/bookmarks"
                className="flex items-center space-x-2 text-gray-300 hover:text-red-600 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Bookmark size={18} />
                <span>Bookmarks</span>
              </Link>
              
              <Link
                to="/history"
                className="flex items-center space-x-2 text-gray-300 hover:text-red-600 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <History size={18} />
                <span>History</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
