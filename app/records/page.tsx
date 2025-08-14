// app/records/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RiDeleteBinLine } from 'react-icons/ri';
import LoadingPage from '@/components/lodingPage';

//End point URL for API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/scores'; 

// ScoreRecord interface (must match score-sheet/page.tsx)
interface ScoreRecord {
  id: string; // Unique ID (e.g., timestamp)
  gameTitle: string; // Corresponds to score.title
  playerNames: string[];
  scoreItemNames: string[]; // Not used for display, but included in type
  scores: number[][]; // scores is a 2D array of numbers
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // Date and time when the record was first created
  lastSavedAt: string; // Date and time when the record was last saved/updated
}

// Maximum save limit for the FREE version (should match score-sheet)
const MAX_FREE_RECORDS = 3;

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKeyword, setFilterKeyword] = useState(''); // Filter keyword state

  useEffect(() => {
  const fetchRecords = async () => {
      try {
        const response = await fetch(API_BASE_URL); // call GET /api/scores 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ScoreRecord[] = await response.json();
        setRecords(data); // sorted recored
      } catch (error) {
        console.error('Error loading records from API:', error);
        alert('Failed to load records. Please try again later.'); 
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []); // fetch only once

  const filteredRecords = useMemo(() => {
    if (!filterKeyword) {
      return records;
    }
    const lowercasedFilter = filterKeyword.toLowerCase();
    return records.filter(record =>
      record.gameTitle.toLowerCase().includes(lowercasedFilter)
    );
  }, [records, filterKeyword]);

  const handleRecordClick = (recordId: string) => {
    // when update existed score
    router.push(`/score-sheet?recordId=${recordId}`);
  };

  const handleDeleteRecord = async (recordId: string) => { 
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        // ★ MODIFIED: DELETE API呼び出し
        const response = await fetch(`${API_BASE_URL}/${recordId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        // when delete successed
        setRecords(prevRecords => prevRecords.filter(record => record.id !== recordId));
        alert('Record deleted successfully!');
      } catch (error) {
        console.error('Error deleting record:', error);
       if (error instanceof Error) {
          alert(`Failed to delete record: ${error.message}`);
        } else {
          alert('Failed to delete record: An unknown error occurred.');
        }
      }
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen bg-white">
        <LoadingPage />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen py-8 px-2 overflow-x-auto bg-cover bg-center bg-no-repeat">
      {/* My Records Title - Using default font */}
      <h1 className="text-4xl font-bold mb-4 hand_font">My Records</h1> 

      {/* Filter by game title label - Using default font */}
     <div className="mb-4 w-full flex flex-col items-center px-2"> 
  <label htmlFor="filter" className="block text-xl  mb-2">
    Filter by game title:
  </label>
  <input
    type="text"
    id="filter"
    value={filterKeyword}
    onChange={(e) => setFilterKeyword(e.target.value)}
    placeholder="Enter game title keyword..."
    className="w-full max-w-sm p-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 text-gray-800 normal_font" // Added max-w-sm
  />
</div>

      {/* Saved Records count - Using default font */}
     <div className="mb-8 text-xl text-gray-700">
        Saved Records: {records.length} / {MAX_FREE_RECORDS} (Free Plan Max)
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-xl normal_font"> 
          {filterKeyword ? `No records found matching "${filterKeyword}".` : 'No records found. Save a sheet to see your history!'}
        </p>
      ) : (
        <div className="w-full max-w-xl sm:max-w-3xl px-2">
          {/* Table headers for record information - Using default font */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 font-bold text-lg text-white table_green p-2 rounded-t-lg shadow-md">
            <div className="col-span-2 sm:col-span-2">Game Name</div>
            <div className="text-center hidden sm:block">Players</div>
            <div className="col-span-1 text-center">Last Saved</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* List of filtered records */}
          <div className="space-y-0">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-3 border-b border-gray-400 flex justify-between items-center group hover:bg-gray-50 transition-colors duration-200"
              >
                <div onClick={() => handleRecordClick(record.id)} className="cursor-pointer flex-grow grid grid-cols-4 sm:grid-cols-5 gap-2 items-center">
                  {/* Game Name - Using dark-green and normal_font for record content */}
                  <div className="col-span-2 sm:col-span-2 text- font-bold text-dark-green normal_font truncate">
                    {record.gameTitle}
                  </div>
                  {/* Players - Using normal_font for record content */}
                  <div className="col-span-1 text-center  hidden sm:block normal_font"> 
                    {record.numPlayers}
                  </div>
                  {/* Last Saved Date/Time - Using normal_font for record content */}
                  <div className="col-span-1 text-center text-gray-700 normal_font text-sm"> 
                    {new Date(record.lastSavedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {' '}
                    {new Date(record.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="col-span-1 text-right">
                    {/* Delete button moves to the right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }} // Prevent parent click
                      className="bg-gray-300 hover:bg-gray-500 font-bold py-1 px-2 rounded-md text-sm group-hover:opacity-100 transition-opacity duration-200"
                      title="Delete Record"
                    >
                      <RiDeleteBinLine/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to Home button - Using default font */}
      <div className="mt-8">
        <button
          onClick={() => router.push("/")}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-xl hand_font"
        >
          ← Return to Home
        </button>
      </div>
    </main>
  );
}