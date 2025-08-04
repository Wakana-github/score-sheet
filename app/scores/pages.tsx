// app/records/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react'; // useMemo をインポート
import { useRouter } from 'next/navigation';
import { RiDeleteBinLine } from 'react-icons/ri'; // ゴミ箱アイコン

// ★MODIFIED: APIのエンドポイントURL (Next.jsの環境変数として定義)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/scores';

// ★MODIFIED: ScoreRecordの型定義 (backend の Mongoose スキーマと一致させる)
interface ScoreRecord {
  id: string; // unique ID (通常はUUID)
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: number[][];
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // ISO 8601 形式の文字列
  lastSavedAt: string; // ★追加: ISO 8601 形式の文字列 (backendと一致)
}

// Maximum save limit for the FREE version (backendでもチェックされるべきですが、フロントエンドにも残します)
const MAX_FREE_RECORDS = 3;

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKeyword, setFilterKeyword] = useState(''); // ★追加: フィルターキーワードのstate

  // ★MODIFIED: useEffect で API からレコードをフェッチ
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(API_BASE_URL); // GET /api/scores を呼び出す
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ScoreRecord[] = await response.json();
        // ★IMPORTANT: バックエンドから返されたデータをそのままセット
        setRecords(data); 
      } catch (error) {
        console.error('Error loading records from API:', error);
        // 型ガードを使ってエラーメッセージに安全にアクセス
        if (error instanceof Error) {
            alert(`Failed to load records: ${error.message}`);
        } else {
            alert('Failed to load records: An unknown error occurred.');
        }
        setRecords([]); // エラー時は空の配列に設定
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []); // ページロード時に一度だけフェッチ

  // ★ADDED: フィルター機能 (useMemo を使って最適化)
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
    // 既存のスコアシートを編集する場合
    router.push(`/score-sheet?recordId=${recordId}`);
  };

  // ★MODIFIED: handleDeleteRecord で DELETE API を呼び出す
  const handleDeleteRecord = async (recordId: string) => { 
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/${recordId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          // HTTPエラーの場合、JSONレスポンスからメッセージを取得
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown API error'}`);
        }

        // 成功した場合、フロントエンドのステートを更新
        setRecords(prevRecords => prevRecords.filter(record => record.id !== recordId));
        alert('Record deleted successfully!');
      } catch (error) {
        console.error('Error deleting record:', error);
        // 型ガードを使ってエラーメッセージに安全にアクセス
        if (error instanceof Error) {
          alert(`Failed to delete record: ${error.message}`);
        } else {
          // Error 型でない場合は、より一般的なメッセージを表示
          alert('Failed to delete record: An unknown error occurred.');
        }
      }
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen bg-white">
        <p className="text-3xl normal_font">Loading records...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen py-8 px-2 overflow-x-auto bg-cover bg-center bg-no-repeat">
      {/* My Records Title - Using default font */}
      <h1 className="text-4xl font-bold mb-4">My Records</h1> 

      {/* Filter by game title label - Using default font */}
      <div className="mb-4 w-full flex flex-col items-center px-2"> 
        <label htmlFor="filter" className="block text-xl mb-2">
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
            <div className="col-span-1 text-center">Last Saved</div> {/* Last Savedに変更 */}
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* List of filtered records */}
          <div className="space-y-0">
            {filteredRecords.map((record, index) => (
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
                  <div className="col-span-1 text-center hidden sm:block normal_font"> 
                    {record.numPlayers}
                  </div>
                  {/* Last Saved Date/Time - Using normal_font for record content */}
                  <div className="col-span-1 text-center text-gray-700 normal_font text-sm"> 
                    {/* ★MODIFIED: lastSavedAt を使用し、フォーマットを改善 */}
                    {new Date(record.lastSavedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {' '}
                    {new Date(record.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="col-span-1 text-right">
                    {/* Delete button moves to the right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }} // 親要素へのクリックイベント伝播を防止
                      className="bg-gray-300 hover:bg-gray-500 font-bold py-1 px-2 rounded-md text-sm group-hover:opacity-100 transition-opacity duration-200"
                      title="Delete Record"
                    >
                      <RiDeleteBinLine/> {/* ゴミ箱アイコン */}
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
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-xl"
        >
          ← Return to Home
        </button>
      </div>
    </main>
  );
}