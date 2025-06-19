import React, { useState, useContext } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';

const LeagueIdInput = () => {
  const { leagueId, changeLeagueId } = useContext(LeagueContext);
  const [inputValue, setInputValue] = useState(leagueId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || inputValue === leagueId) return;
    
    setIsSubmitting(true);
    await changeLeagueId(inputValue.trim());
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-3">League ID</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter Sleeper League ID"
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Sleeper League ID"
        />
        <button
          type="submit"
          disabled={isSubmitting || !inputValue.trim() || inputValue === leagueId}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isSubmitting || !inputValue.trim() || inputValue === leagueId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Loading...' : 'Load League'}
        </button>
      </form>
      <p className="mt-2 text-sm text-gray-600">
        Current League ID: {leagueId}
      </p>
    </div>
  );
};

export default LeagueIdInput;
