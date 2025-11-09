"use client";
import ReturnHomeBtn from "@/components/returnToHomeBtn";
import TestCredentials from "@/components/TestCredencial";
import React from "react";


export default function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 mb-8 bg-gray-50 rounded-xl dark:bg-gray-800">
      <h1 className="text-3xl font-bold mb-4">Terms of Use</h1>
      <p className="text-sm text-gray-500 mb-8 dark:text-gray-300">Last Updated: October 26, 2025</p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">1. Purpose of This Terms</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          This Terms of Use explains the conditions for using this application (“the App”).
        </li>
        <li>
          The App is currently provided for testing and portfolio demonstration purposes only, and is not intended for commercial use or public release.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">2. Limited Purpose of Use</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          The App is primarily made available for test users.
        </li>
        <li>
          Features, functions, and data may change or be removed without prior notice as part of ongoing development.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">3. Access Limitations & No Warranty</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          The app is under development and may contain bugs or other issues.
        </li>
        <li>
          Access to the app is provided via external links and may be temporarily unavailable due to server downtime or maintenance. 
          Users should understand that such situations may occur when using the app.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">4. Disclaimer</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          The author shall not be liable for any loss or inconvenience arising from the use of this App.
        </li>
        <li>
          Data within the app is for testing purposes only and is not guaranteed to be reliable for actual business or record-keeping purposes.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">5. Data Handling</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          Data entered by test users is used solely for testing purposes and is not permanently stored, shared, or used for any other purpose.
        </li>
        <li>
          Registered data may be deleted without prior notice.
        </li>
        <li>
          As this app is still in development, please do not input any personal or sensitive data.
        </li>
        <li>
          You can try the app using the following test credentials:
          <TestCredentials/>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">6. Copyright & Rights</h2>
      <p className="mb-6">
        All original designs, code, and content within this App are the property of the author.
        Some icons and assets used in this App are sourced from open-license or domain-free libraries and remain the property of their respective creators.
        Unauthorized use, reproduction, or redistribution of this App’s original materials is prohibited.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">7. Updates to This Terms</h2>
      <p className="mb-6">
        This Terms of Use may be updated or modified from time to time as development progresses.
        Any significant updates will be reflected by changing the “Last Updated” date above.
      </p>

      <div className="mt-10">
        <ReturnHomeBtn />
      </div>
    </div>
  );
}