'use client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ScoreDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [score, setScore] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const saved = JSON.parse(localStorage.getItem('savedScores') || '[]');
    const found = saved.find((s: any) => s.id === id);
    setScore(found);
  }, [id]);

  if (!score) return <p className="p-4">読み込み中...</p>;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-2">{score.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        保存日: {new Date(score.savedAt).toLocaleString()}
      </p>
      <table className="border border-gray-400 w-full mb-4">
        <thead>
          <tr>
            {score.playerNames.map((name: string, idx: number) => (
              <th key={idx} className="border p-2">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {score.scores.map((row: number[], rowIdx: number) => (
            <tr key={rowIdx}>
              {row.map((val, colIdx) => (
                <td key={colIdx} className="border p-2 text-center">{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => router.push('/scores')}
        className="bg-gray-600 text-white px-4 py-2 rounded"
      >
        一覧に戻る
      </button>
    </main>
  );
}
