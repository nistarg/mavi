import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-indigo-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full transition"
        >
          <Home size={18} className="mr-2" />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;