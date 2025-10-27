// app/records/page.tsx
'use client';

/* Records page: Main page for viewing, searching, and managing the user's saved score records.
* Key Features:
* - Authentication(Clerk), only allowing signed-in users to access records. 
* - Data Retrieval: Fetches user-specific records from the API (/api/records) with pagination and filtering.
* - Search & Debounce: Provides real-time filtering of records by game title
* - Record Management: Allows users to click a record to edit it and use a bin button for deletion.
* - Plan Status: Displays the current number of records against the user's maximum allowance (Free or Active Plan).
*/ 
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RiDeleteBinLine } from 'react-icons/ri';
import LoadingPage from '@/components/loadingPage';
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'; 
import he from 'he'; 
import { MAX_FREE_RECORDS, PAGENATION_LIMIT } from '../lib/constants';
import ReturnHomeBtn from '@/components/returnToHomeBtn';
import { fadeInVariants, itemsVariants } from '../lib/variants'
import { motion } from "motion/react"

//Use URL stored in Proxity 
const PROXY_API_PATH = '/api/records';

interface PlayerNameRecord {
    memberId: string;
    name: string;
}

// ScoreRecord interface (must match score-sheet/page.tsx)
interface ScoreRecord {
  _id: string; // Unique ID (e.g., timestamp)
  gameTitle: string; // Corresponds to score.title
  playerNames: PlayerNameRecord[];
  scoreItemNames: string[]; // Not used for display, but included in type
  scores: number[][]; // scores is a 2D array of numbers
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // Date and time when the record was first created
  lastSavedAt: string; // Date and time when the record was last saved/updated
  userId: string;
  groupId?: string; 
}

// Interface of the paginated response from the API
interface PaginatedRecords {
  records: ScoreRecord[];
  totalRecords: number;
  currentPage: number;
  limit: number;
  isActiveUser: boolean;
  maxRecords: number;
}

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState(''); // User's input in the search field (updated in real-time)
  const [filterKeyword, setFilterKeyword] = useState(''); // The keyword sent to the API for filtering (updated after debounce)
  const [lastKeyword, setLastKeyword] = useState('');
  const { isLoaded, isSignedIn, getToken } = useAuth();
  

  //pagination status
  const [currentPage, setCurrentPage] = useState(1); // current page number
  const [totalRecords, setTotalRecords] = useState(0);
  const [maxRecords, setMaxRecords] = useState(MAX_FREE_RECORDS);
  const [isActiveUser, setIsActiveUser] = useState(false);
  const limit = PAGENATION_LIMIT;  // limit of records per page(constant)
  const totalPages = Math.ceil(totalRecords / limit); 
  const [csrfToken, setCsrfToken] = useState("");

  // Debounce effect: Monitors inputValue and updates filterKeyword after a delay.
  useEffect(() => {
      const debounceTime = 500;   // Set a timer 
      const handler = setTimeout(() => {
          setFilterKeyword(inputValue);
      }, debounceTime); 
      return () => {
          clearTimeout(handler);  // Clear the timer if input changes before the delay is up
      };
  }, [inputValue]);

   // Get CSRF token
    useEffect(() => {
      async function fetchCsrfToken() {
        try {
          const res = await fetch("/api/csrf-token", {
          credentials: "include",  
        });
          if (!res.ok) throw new Error("Failed to fetch CSRF token");
          const data = await res.json();
          setCsrfToken(data.token); // save token as the state
        } catch (err) {
          console.error("Error fetching CSRF token:", err);
        }
      }
      fetchCsrfToken();
    }, []); // only read once when page is loaded

  // Fetch records from the API 
   async function fetchRecords(){

    if (!isLoaded || !isSignedIn) {
        setLoading(false);
        // stop fetching if a user isn't logged in
        return;
      }

      setLoading(true);
      try {
        const token = await getToken(); //Clerk token
        // Prepare the keyword query parameter for filtering
        const keywordQuery = filterKeyword ? `&keyword=${encodeURIComponent(filterKeyword.trim())}` : '';
        // Fetch paginated records from the API endpoint
        const response = await fetch(`${PROXY_API_PATH}?page=${currentPage}${keywordQuery}`, {
          headers: {
          Authorization: `Bearer ${token}`,
        },
      });

        // Handle error
        if (!response.ok) {
          const errorData = await response.json();
         throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

         const data: PaginatedRecords = await response.json();
          //decode gameTitle
          const decodedRecords = data.records.map(record => ({
              ...record,
              gameTitle: he.decode(record.gameTitle),
          }));

          setRecords(decodedRecords);  // Update the records with decorded game title
          setTotalRecords(data.totalRecords);
          setMaxRecords(data.maxRecords);
          setIsActiveUser(data.isActiveUser);

      } catch (error) {
        console.error('Error loading records from API:', error);
        alert('Failed to load records. Please try again later.'); 
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    // Logic to reset pagination to page 1 only when the filterKeyword changes.
     if (filterKeyword !== lastKeyword) {
          setLastKeyword(filterKeyword);
          if (currentPage !== 1) {
            setCurrentPage(1);
            return;
        }
      }
  //Set fetch records to render whenever page or filter keyword changes
  useEffect(() => {
    fetchRecords();
  },  [isLoaded, isSignedIn, getToken, currentPage, filterKeyword]); 


  const filteredRecords = records;

  // Handler for clicking a record entry. Redirects to the score sheet for editing.
  const handleRecordClick = (recordId: string) => {
    router.push(`/score-sheet?recordId=${recordId}`);
  };

  // Handler for deleting a specific record. Calls the DELETE API.
  const handleDeleteRecord = async (recordId: string) => { 
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        // Call DELETE API
        const token = await getToken(); 
        const response = await fetch(`${PROXY_API_PATH}/${recordId}`, {
          method: 'DELETE',
          headers: {
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfToken,
        },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

       // On successful deletion, reset to page 1 to trigger a full re-fetch    
       await fetchRecords();
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

 // Rendering the pegenation UI buttons
  const renderPagination = () => {
    if (totalPages <= 1) return null; // Don't show button when there is only 1 page

    const pageNumbers = [];
     // Logic to determine which page buttons to display (max 5)
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
 
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
     return (
        <div className="flex justify-center items-center my-4 normal_font text-sm lg:text-lg text-black">
            <button
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
                className="mx-1 px-3 py-1 border border-gray-400 rounded-lg disabled:opacity-50"
            >
                Previous
            </button>
            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => setCurrentPage(number)}
                    className={`mx-1 px-3 py-1 rounded-lg ${currentPage === number ? 'bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-800 hover:text-white'}`}
                    aria-current={currentPage === number ? "page" : undefined}
                >
                    {number}
                </button>
            ))}
            <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage === totalPages}
                className="mx-1 px-3 py-1 border border-gray-400 rounded-lg disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
  };

  // Show the loading spinner while initial data is fetched
  if (loading || !isLoaded) {
    return (
      <main className="flex items-center justify-center h-screen">
        <LoadingPage />
      </main>
    );
  }


  return (
    <main className="flex flex-col items-center justify-start min-h-screen py-8 px-2 overflow-x-auto bg-cover bg-center bg-no-repeat">
      {/* My Records Title - Using default font */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 hand_font">My Records</h1> 

      {/* Filter by game title label - Using default font */}
     <div className="mb-2 w-full flex flex-col items-center px-2"> 
        <label htmlFor="filter" className="block text-xl  mb-2">
          Filter by game title:
        </label>
        <input
          type="text"
          id="filter"
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter game title keyword..."
          className="w-full max-w-sm p-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 text-gray-800" 
        />
      </div>

      {/* Saved Records count - Using default font */}
      <div className="mb-4 lg:mb-8 text-lg lg:text-xl text-gray-700">
        {`Saved Records: ${totalRecords} / ${maxRecords}(${isActiveUser ? ' ' : 'Free Plan '}Max)`}
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-xl"> 
          {filterKeyword ? `No records found matching "${filterKeyword}".` : 'No records found. Save a sheet to see your history!'}
        </p>
      ) : (
        <div className="w-full max-w-xl sm:max-w-3xl px-2">
          {/* Table headers for record information - Using default font */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 font-bold text-lg md:text-xl  text-white table_green p-2 rounded-t-lg shadow-md">
            <div className="col-span-2 sm:col-span-2">Game Name</div>
            <div className="text-center hidden sm:block">Players</div>
            <div className="col-span-1 md:col-span-2 text-center">Last Saved</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* List of filtered records */}
          <motion.div variants={fadeInVariants}
              initial="hidden" 
              animate="show"
             className="space-y-0">
            {filteredRecords.map((record) => (
              <motion.div
                key={record._id}
                variants={itemsVariants}
                className="p-3 border-b border-gray-400 flex justify-between items-center group hover:bg-gray-50 transition-colors duration-200"
              >
                <a href={`/score-sheet?recordId=${record._id}`}
                  className="cursor-pointer grow grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 items-center"
                  aria-label={`Open record for ${record.gameTitle}`}
                >
                  {/* Game Name*/}
                  <div className="col-span-2 font-bold text-base lg:text-lg text-dark-green truncate">
                    {record.gameTitle}
                  </div>
                  {/* Players */}
                  <div className="col-span-1 text-center hidden sm:block lg:text-lg"> 
                    {record.numPlayers}
                  </div>
                  {/* Last Saved Date/Time - Using normal_font for record content */}
                  <div className="col-span-1 md:col-span-2 text-center text-gray-800 text-sm lg:text-base"> 
                    {new Date(record.lastSavedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {' '}
                    {new Date(record.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="col-span-1 text-right">
                    {/* Delete button moves to the right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record._id); }} // Prevent parent click
                      className="bg-gray-300 hover:bg-gray-500 font-bold py-1 px-2 rounded-md text-sm sm:text-lg group-hover:opacity-100 transition-opacity duration-200"
                      title="Delete Record"
                      aria-label="Delete Record"
                    >
                      <RiDeleteBinLine/>
                    </button>
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* rendering pagination UI */}
      {renderPagination()}

      {/* Back to Home button - Using default font */}
      <div className="mt-3 lg:mt-5">
        <div
          onClick={() => router.push("/")}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
        >
          <ReturnHomeBtn/>
        </div>
      </div>
    </main>
  );
}