import React, { useContext, useState, useEffect, useRef } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';

const SeasonSelector = () => {
  const { availableSeasons, selectedSeason, changeSeason } = useContext(LeagueContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Ensure we have seasons to display
  const seasons = availableSeasons && availableSeasons.length > 0 
    ? availableSeasons 
    : ['2025', '2024', '2023']; // Fallback seasons

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle season selection
  const handleSeasonSelect = (season) => {
    console.log('Changing season to:', season);
    changeSeason(season);
    setIsOpen(false);
  };

  return (
    <div className="bg-gray-800 text-white p-3 rounded-lg shadow-md" ref={dropdownRef}>
      <div className="flex items-center space-x-2">
        <span className="font-medium">Season:</span>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between min-w-[80px]"
          >
            <span>{selectedSeason}</span>
            <svg 
              className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded shadow-lg">
              {seasons.map((season) => (
                <div
                  key={season}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${
                    season === selectedSeason ? 'bg-gray-600' : ''
                  }`}
                  onClick={() => handleSeasonSelect(season)}
                >
                  {season}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonSelector;
