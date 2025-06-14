import React, { useState } from 'react';

export default function SearchBar({ placeholder = 'Search...', onSearch }) {
  const [query, setQuery] = useState('');

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSearch = () => {
    if (onSearch) onSearch(query.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <div className="flex items-center max-w-md mx-auto bg-gradient-to-r from-indigo-600 to-blue-700 rounded-full shadow-lg p-1 hover:shadow-xl transition-shadow duration-300">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          className="flex-grow bg-transparent text-white placeholder-indigo-300 rounded-full px-4 py-2 text-lg font-semibold focus:outline-none"
        />
        <button
          onClick={handleSearch}
          aria-label="Search Button"
          className="bg-white text-indigo-700 rounded-full w-10 h-10 flex items-center justify-center ml-2 shadow-md hover:bg-indigo-100 transform hover:scale-110 transition-transform duration-200"
        >
          🔍
        </button>
      </div>
    </>
  );
}

