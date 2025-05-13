import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12 w-full">
      <div className="max-w-[2000px] mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="text-xl font-bold text-white bg-indigo-600 px-2 py-1 rounded">
              MAVI
            </div>
            <span className="text-gray-400">
              Made by NISTAR MAVI
            </span>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="legal-notice max-w-4xl mx-auto text-center">
            <p>
              All movies streamed on MAVI are publicly available on YouTube. MAVI does not host or upload any content. 
              We simply provide access to the content that is already available on YouTube's platform.
              MAVI has no affiliation with YouTube or any film production companies.
              All content is the property of their respective owners.
            </p>
          </div>
          
          <div className="text-center text-gray-500 text-sm mt-6">
            © {new Date().getFullYear()} MAVI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};