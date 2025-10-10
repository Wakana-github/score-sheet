  'use client';

export default function LoadingPage() {
  return (
  <main
      className="flex items-center justify-center h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/paper_bg.jpg")' }}
    >
        <p className="text-3xl hand_font">Loading ...</p>
      </main>
);
}