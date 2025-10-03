"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./headerMenu.css";
import SubscriptionButton from "@/components/SubscriptionButton";
import { getUser } from "@/app/actions/user.action";

export default function Header() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const menuRef = useRef<HTMLUListElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLinkClick = () => {
    closeMenu();
  };
//retreive user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (isSignedIn && user) {
        setIsLoadingUserData(true);
        const fetchedData = await getUser(user.id);
        setUserData(fetchedData);
        setIsLoadingUserData(false);
      } else {
        setUserData(null);
        setIsLoadingUserData(false);
      }
    };
    fetchUserData();
  }, [isSignedIn, user]);

  return (
    <header className="h-16 bg-white shadow-xl fixed top-0 w-full header-styles z-10">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center h-full px-4">
        <div className="left-section flex items-center gap-3">
          {/* Mobile menu open icon (visible only on mobile) */}
          <div className="fixed top-4 right-4 z-50 lg:hidden">
            {!isMenuOpen && (
              <FaBars
                onClick={openMenu}
                className="mobile-hamburger-icon"
                size={30}
                color="#333"
              />
            )}
          </div>

          {/* Desktop navigation links (hidden on mobile) */}
          <div className="pl-10 hidden lg:flex items-center gap-3 text-[23px]">
            {" "}
            {/* Hidden by default, flex on large screens and up */}
            <Link href="/" passHref>
              <button className=" hover:text-blue-800  font-medium px-1 py-2 rounded-md transition-colors duration-200">
                <span className="hand_font">Home</span>
              </button>
            </Link>
            <Link href="/custom-sheet" passHref>
              <button className=" hover:text-blue-800  font-medium px-1 py-2 rounded-md transition-colors duration-200">
                <span className="hand_font">Custom Sheet</span>
              </button>
            </Link>
            <Link href="/groups" passHref>
              <button className=" hover:text-blue-800 font-medium px-1 py-2 rounded-md transition-colors duration-200">
                <span className="hand_font">Group</span>
              </button>
            </Link>
            <Link href="/records" passHref>
              <button className=" hover:text-blue-800 font-medium px-1 py-2 rounded-md transition-colors duration-200">
                <span className="hand_font">Records</span>
              </button>
            </Link>
            <Link href="/stats" passHref>
              <button className=" hover:text-blue-800 font-medium px-1 py-2 rounded-md transition-colors duration-200">
                <span className="hand_font">Statistics</span>
              </button>
            </Link>
          </div>
        </div>
        

        {/* Main Navigation Menu (slides in from right on mobile) */}
        <ul ref={menuRef} className={`main-nav-ul ${isMenuOpen ? "open" : ""}`}>
          <FaTimes
            onClick={closeMenu}
            className="nav-mob-close"
            size={30}
            color="#fff"
          />

          {/* Menu items for mobile */}
          <li>
            <Link href="/" passHref onClick={handleLinkClick}>
              <span className="anchor-link hand_font text-white">Home</span>
            </Link>
          </li>
          <li>
            <Link href="/custom-sheet" passHref onClick={handleLinkClick}>
              <span className="anchor-link hand_font text-white">
                Custom Sheet
              </span>
            </Link>
          </li>
          <li>
            <Link href="/groups" passHref onClick={handleLinkClick}>
              <span className="anchor-link hand_font text-white">
                Group
              </span>
            </Link>
          </li>
          <li>
            <Link href="/records" passHref onClick={handleLinkClick}>
              <span className="anchor-link text-white hand_font ">
                Records
              </span>
            </Link>
          </li>
          <li>
            <Link href="/stats" passHref onClick={handleLinkClick}>
              <span className="anchor-link text-white hand_font ">
                Statistics
              </span>
            </Link>
          </li>
          <li>
            <SignedIn>
                {/*  Display the user button if signed in */}
                <Link href="/set-nickname" passHref onClick={handleLinkClick}>
                  <button className="bg-blue-500  text-white text-sm rounded-full border-none cursor-pointer  px-3 py-1"
                >Set Nickname</button>
                </Link>
              </SignedIn>
          </li>

          {/* Mobile-specific Sign In/Up buttons within the menu */}
          <li className="mobile-auth-links">
            {" "}
            {/* New wrapper for mobile auth links */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-transparent border-none text-xl underline cursor-pointer p-0 hover:scale-105 transition">
                  <span className="hand_font text-white hover:text-[#ffdb58] font-medium ">
                    Log In
                  </span>
                </button>
              </SignInButton>
              <span className="text-xl text-gray-200"> / </span>
              <SignUpButton mode="modal">
                <button className="bg-[#e23030]  hover:bg-[#e23030af]  text-white rounded-full font-medium text-xl cursor-pointer px-4 py-2 hover:scale-105 transition">
                  <span className="hand_font text-white hover:text-[#ffdb58]">
                    Sign Up
                  </span>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center">
                <p className="text-white text-sm pr-3">
                  {user?.username ? `${user.username}:` : "Profile:"}
                </p>
                <UserButton />
              </div>
            </SignedIn>
          </li>

          {/* Subscription button */}
          <li className="nav_subscribe_button flex text-white text-sm">
            {isLoaded && isSignedIn && !isLoadingUserData && (
                <SubscriptionButton 
                  subscriptionStatus={userData?.subscriptionStatus}
                  stripeCustomerId={userData?.stripeCustomerId}
                />
            )}</li>
        </ul>

        {/* Right section: Clerk authentication buttons (Desktop only) */}
        <div className="right-section hidden lg:flex items-center gap-2 mx-3 flex-grow justify-end">
        {/*  Display the sign in/up button if signed in */}
          <SignedOut>
            <SignInButton />
            <SignUpButton>
              <button className="bg-[#b8abee] text-ceramic-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer ">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>

                {/*  Display nichname, user, and edit subscription buttons if signed in */}
                <div className="flex items-center gap-2 ml-auto">
                <Link href="/set-nickname" passHref onClick={handleLinkClick}>
                  <button className="bg-blue-500  text-white text-sm md:text-base rounded-full border-none cursor-pointer  px-4 py-1 ml-7"
                >Set Nickname</button>
                </Link>

            {/* Clerk user name and icon */}
            <p className="text-sm pr-2 md:text-lg ">
              {user?.username ? `${user.username}:` : "Profile:"}
            </p>
            <UserButton />

            {/* Subscription button */}
          {isLoaded && isSignedIn && !isLoadingUserData && (
            <div className="flex items-center gap-2 px-2">
              <SubscriptionButton
                subscriptionStatus={userData?.subscriptionStatus}
                stripeCustomerId={userData?.stripeCustomerId}
              />
            </div>
          )}
          </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
