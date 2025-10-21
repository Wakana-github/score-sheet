"use client";

//GlobalError Component
import ReturnHomeBtn from "@/components/returnToHomeBtn";

export default function  GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-3xl font-bold mb-4">An unexpected error occurred</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={() => reset()}
        className="bg-[#41490e] text-white px-6 py-3 rounded-lg"
      >
        Try Again
      </button>
      <div className="mt-20 my-5">
                  <ReturnHomeBtn/>
      </div>
    </div>
  );
}