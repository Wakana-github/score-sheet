'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


interface GameData {
  id: number;
  title: string;
  column: number;
  row: number;
  notes: string;
  score_items: string[];
}


export default function Home() {
  const [games, setGames] = useState<GameData[]>([]);
  // 初期値をnullに設定
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const router = useRouter();

  // Read Json file
  useEffect(() => {
    fetch('/games.json')
      .then((response) => response.json())
      .then((data: GameData[]) => {
        setGames(data);
        // 初期選択は行わない
      })
      .catch((error) => console.error('Error loading game data:', error));
  }, []); // [] <- render once

  // ドロップダウン選択時のハンドラー
  const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    // valueが空文字列の場合はnullをセットし、それ以外は数値に変換
    setSelectedGameId(value === '' ? null : Number(value));
  };

  // 「スコアシートへ」ボタンクリック時のハンドラー
  const handleGoToScoreSheet = () => {
    if (selectedGameId !== null) {
      router.push(`/score-sheet?gameId=${selectedGameId}`);
    }
  };

  // 「カスタムシートへ」ボタンクリック時のハンドラー
  const handleGoToCustomSheet = () => {
    // カスタム設定ページへのパスを指定
    router.push('/custom-sheet'); // 例: /custom-sheet というパスに遷移
  };

   // ③ My Record ボタンのクリックハンドラを追加
  const handleViewRecords = () => {
    router.push('/records'); // records ページへ遷移
  };

  // データ読み込み中はローディング表示
  if (games.length === 0) {
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-3xl">Loading games...</p>
        </div>
      </main>
    );
  }
  const sortedGames = [...games].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <main>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-3xl pt-4">Welcome to</p>
          <h1 className="text-5xl font-bold">Score Sheet</h1>

          {/* game select form */}
          <div className="dark_green py-2 my-6 px-3">
            <label htmlFor="game" className="text-3xl">Choose a game: </label>
            <select
              id="game"
              name="gamelist"
              form="gameform"
              value={selectedGameId === null ? '' : selectedGameId} // nullの場合は空文字列を設定
              onChange={handleGameChange}
              className="normal_font p-2
              rounded-md
              focus:outline-none
              focus:ring-1 focus:dark_green
              outline-none
              border-none
              ring-0
              shadow-none"
            >
              {/* 「Choose the game」のvalueを空文字列にする */}
              <option value="">Choose the game</option>
             {sortedGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </div>

          {/* カスタムシート/スコアシートへボタン */}
          <button
            // selectedGameIdがnullの場合はhandleGoToCustomSheet、それ以外はhandleGoToScoreSheetを呼び出す
            onClick={selectedGameId === null ? handleGoToCustomSheet : handleGoToScoreSheet}
            // ボタンのスタイルと有効/無効の状態は、常にクリック可能にするためdisabledを削除
            className="dark_green py-2 my-2 w-64"
          >
            <span className="text-3xl">
              {/* selectedGameIdがnullの場合は「Custom Sheet」、それ以外は「Go to the Score Sheet」を表示 */}
              {selectedGameId === null ? 'Custom Sheet' : 'Go to the Score Sheet'}
            </span>
          </button>

          {/* my record button */}
          <div className="my-4">
            <button
            onClick={handleViewRecords} 
            className="text-3xl"
          >
            My Record
          </button>
          </div>

          {/* login / signin button */}
          <div className="my-4 text-xl">
            <p><span>log in</span> /
              <span> sign in</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}