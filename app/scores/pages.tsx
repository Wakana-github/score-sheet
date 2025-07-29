'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ScoreRecordの型定義 (score-sheet/page.tsx と同じである必要があります)
interface ScoreRecord {
  id: string; // ユニークなID (例: タイムスタンプ)
  gameTitle: string; // score.title に対応
  playerNames: string[];
  scoreItemNames: string[]; // 表示には使われていませんが、型として含めます
  scores: number[][]; // scoresはnumberの二次元配列
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // score.savedAt に対応
}

// 無料版の最大保存件数 (score-sheetと同じ値に設定)
const MAX_FREE_RECORDS = 3;

export default function RecordsPage() { // ファイル名とエクスポート名を RecordsPage に変更
  const router = useRouter();
  const [records, setRecords] = useState<ScoreRecord[]>([]); // savedScores を records に変更し、型を ScoreRecord[] に
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // LocalStorageのキーを 'scoreRecords' に統一
      const storedRecords: ScoreRecord[] = JSON.parse(localStorage.getItem('scoreRecords') || '[]');
      setRecords(storedRecords);
    } catch (error) {
      console.error('Error loading records from LocalStorage:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecordClick = (recordId: string) => {
    // スコアシートページへ遷移
    router.push(`/score-sheet?recordId=${recordId}`);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        const storedRecords: ScoreRecord[] = JSON.parse(localStorage.getItem('scoreRecords') || '[]');
        const updatedRecords = storedRecords.filter((record: ScoreRecord) => record.id !== recordId);
        localStorage.setItem('scoreRecords', JSON.stringify(updatedRecords));
        setRecords(updatedRecords);
        alert('Record deleted successfully!');
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
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
    <main className="flex flex-col items-center justify-start min-h-screen py-8 px-2 overflow-x-auto bg-white">
      <h1 className="text-4xl font-bold text-green-800 normal_font mb-4">My Records</h1>

      <div className="mb-8 text-xl normal_font text-gray-700">
        Saved Records: {records.length} / {MAX_FREE_RECORDS}
      </div>

      {records.length === 0 ? (
        <p className="text-xl normal_font text-gray-700">No records found. Save a sheet to see your history!</p>
      ) : (
        <div className="w-full max-w-xl sm:max-w-3xl space-y-4 px-2">
          {records.map((record, index) => ( // recordをScoreRecord型として扱う
            <div
              key={record.id} // score.id ではなく record.id を使用
              className="bg-green-100 p-4 rounded-lg shadow-md flex justify-between items-center"
            >
              <div onClick={() => handleRecordClick(record.id)} className="cursor-pointer flex-grow">
                <h2 className="text-2xl font-bold text-green-800 normal_font">
                  {record.gameTitle} {/* score.title を record.gameTitle に変更 */}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({index + 1} / {MAX_FREE_RECORDS})
                  </span>
                </h2>
                <p className="text-gray-600 normal_font text-sm mt-1">Saved: {record.createdAt}</p> {/* score.savedAt を record.createdAt に変更 */}
                <p className="text-gray-600 normal_font text-sm">Players: {record.playerNames.join(', ')}</p>
                {/* スコアの表示は、簡略化のため一旦省略。必要であれば追加 */}
                {/* <p className="text-gray-600 normal_font text-sm">
                  スコア: {record.scores.map((row: number[]) => row.join(', ')).join(' / ')}
                </p> */}
              </div>
              <button
                onClick={() => handleDeleteRecord(record.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md text-sm ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => router.push("/")}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-xl"
        >
          ← Back to Home
        </button>
      </div>
    </main>
  );
}