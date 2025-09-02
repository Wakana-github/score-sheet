"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "@/components/lodingPage";

export default function SetNicknamePage() {
  const { user, isLoaded } = useUser();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (!isLoaded) {
    return <LoadingPage />;
  }

  if (!user) {
    return <p>Please sign in to set a nickname.</p>;
  }

  //handle submit button 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    if (!nickname.trim()) {
      setMessage("Nickname cannot be empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/nickname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, nickname }),
      });

      if (response.ok) {
        setMessage("Nickname updated successfully!");
        router.push("/set-nickname");
      } else {
        const errorData = await response.json();

        if (errorData.message) {
          setMessage(errorData.message);
        } else 
          {
//unexpected error
setMessage("An unexpected error occurred. Please try again later.");
}

      }
    } catch (error) {
      console.error("Failed to update nickname:", error);
      setMessage("Server Error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 flex justify-center lg:my-12">
    <div className="w-full max-w-lg">
      <h1 className="text-3xl lg:text-5xl hand_font font-bold mb-4">Set Your Nickname</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="nickname" className="text-lg lg:text-3xl">
          Current Nickname: {user.username || "Not set"}
        </label>
        <input
          type="text"
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="border p-2 rounded-md"
          placeholder="Enter new nickname"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#535f0c] text-lg text-white p-2 rounded-md hover:bg-[#6f8012] disabled:bg-gray-400"
        >
          {isSubmitting ? "Saving..." : "Save Nickname"}
        </button>
      </form>
      {message && <p className="mt-4 text-red-500">{message}</p>}
    </div>
</div>
  );
}