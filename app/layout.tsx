import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono, Delicious_Handrawn } from "next/font/google";
import "./globals.css";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/nextjs";
import Header from "./header/page";
import LoadingPage from "@/components/loadingPage";

/*
* RootLayout Component
* This is the root-level layout for the entire Next.js application (App Router).
* It wraps all pages, setting up the necessary HTML structure, global styles, metadata,and essential providers like Clerk.
* It ensures the Header is present on all pages and handles the loading state for the Clerk authentication.
*/

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const deliciousHandrawn = Delicious_Handrawn({
  weight: "400", // Delicious Handrawn has only 400 thickness
  subsets: ["latin"],
  display: "swap",
  variable: "--font-delicious-handrawn", // CSS variable name
});

export const metadata: Metadata = {
  title: "Score Sheet App - Easy Boad Game Score Tracking",
  description: "Easily record, view, and manage your game scores with our interactive score sheet app.",
  openGraph: {
    title: "Score Sheet App",
    description: "Portfolio:Track and manage your game scores easily.",
    url: "https://score-sheet-idq6.vercel.app",
    images: [
      {
        url: "https://score-sheet-idq6.vercel.app/app_img.png",
        width: 1200,
        height: 630,
        alt: "Score Sheet App Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",   //large img
    title: "Score Sheet App",
    description: "Portfolio: Track and manage your board game scores easily.",
    images: ["https://score-sheet-idq6.vercel.app/app_img.png"],
    site: "https://score-sheet-idq6.vercel.app",
    creator: "@wakana_g", 
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          root: {
            fontFamily: `var(${geistMono.variable}), var(${geistSans.variable} antialiased)`,
          },
        },
      }}
    >
      <html lang="en">
        <body
          className={` ${geistMono.variable} ${geistSans.variable} ${deliciousHandrawn.variable} antialiased `}
        >
          <ClerkLoading>
            <LoadingPage />
          </ClerkLoading>
          <ClerkLoaded>
            {/* display main contents from the top when mobile screen */}
            <div className="relative w-full h16">
              <Header />
              <div className="pt-8 md:pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {children}
                </div>
              </div>
            </div>
          </ClerkLoaded>
        </body>
      </html>
    </ClerkProvider>
  );
}
