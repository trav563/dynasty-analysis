import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LeagueProvider from './contexts/LeagueContext';
import Dashboard from './pages/Dashboard';
import TeamDetails from './pages/TeamDetails';

function App() {
  return (
    <LeagueProvider>
      <Router basename="/dynasty-analysis">
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/team/:rosterId" element={<TeamDetails />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;
