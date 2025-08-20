import { ClerkLoading, SignIn } from "@clerk/nextjs";
import Link from "next/link";
import LoadingPage from "@/components/lodingPage";

export default function Page() {
  return (
    <div>
      <ClerkLoading>
        <LoadingPage />
      </ClerkLoading>
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
