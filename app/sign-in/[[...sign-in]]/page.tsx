'use client';

import { ClerkLoading, SignIn } from "@clerk/nextjs";
import Link from "next/link";
import LoadingPage from "@/components/loadingPage";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import TestCredentials from "@/components/TestCredencial";

// Get page title from URL path
const getPageTitleFromUrl = (urlPath: string) => {
  if (!urlPath) return 'This Site';

  if (urlPath.includes('/records')) {
    return 'Record Details'; 
  }
  if (urlPath.includes('/groups')) {
    return 'Your Groups';
  }
  if (urlPath.includes('/stats')) {
    return 'Your Statistics';
  }
  // pther routes
  return 'Private Page'; // default
};

//Clerk sign in page
export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url');

  const pageTitle = useMemo(() => {
    if (redirectUrl) {
      try {
        const url = new URL(redirectUrl);
        return getPageTitleFromUrl(url.pathname);
      } catch (e) {
        console.error("Invalid redirect URL:", redirectUrl);
        return 'Target Page';
      }
    }
    return 'Target Page';
  }, [redirectUrl]);

  return (
    <div>
      <ClerkLoading>
        <LoadingPage />
      </ClerkLoading>

      {/* Title */}
      <h1 className="p-3 text-2xl hand_font text-gray-800 dark:text-white">
        Sign in to See: {pageTitle}
      </h1>

      {/* Warning and Test credencials */}
      <div className="mb-6">
          <p className="text-xl mt-3">Please<span className="text-red-700 font-semibold dark:text-yellow-300"> do Not</span>  use your personal information.</p>
          <Link href="./privacy/policy" className="text-base">(Read Privacy Policy)</Link>
          <h2 className ="text-xl font-bold">Test Credencials:</h2>
          <TestCredentials/>
      </div>
      {/* Clerk SignIn */}
      <div className="w-full flex items-center justify-center normal_font">
        <SignIn fallbackRedirectUrl={"/"} />
      </div>

      {/* Return to Home button */}
      <div className="self-start">
        <Link href="/" passHref>
          <button className="py-1 px-2 rounded-lg text-xl hand_font mt-2">
            ← Return to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
