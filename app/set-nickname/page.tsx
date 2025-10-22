"use client";

/*
* This Front-end page allows a signed-in user to set or update their nickname.
* It communicates with the `/api/nickname` endpoint to send the new nickname,
* then refreshes the user data via Clerk to reflect changes immediately.
*/

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "@/components/loadingPage";

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
        body: JSON.stringify({ nickname }),
      });

      if (response.ok) {
        await user.reload(); //reload clerk data
        router.refresh();  //refresh page and display updated nickname
        setMessage("Nickname updated successfully!");
        setNickname("");
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
        <label htmlFor="nickname" className="text-lg lg:text-2xl">
          Nickname: {user.publicMetadata?.nickname as string || user.username || "Not set"}
        </label>
        <input
          type="text"
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="border p-2 rounded-md text-lg"
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
      {message && <p className="mt-4 text-red-500 text-base lg:text-lg">{message}</p>}
    </div>
</div>
  );
}