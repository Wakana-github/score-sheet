import ReturnHomeBtn from '@/components/returnToHomeBtn';
import React from 'react'

const SuccessPayment = () => {
  return (
  <div
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-white shadow-2xl rounded-xl p-8 sm:p-10 text-center border border-green-200">
        
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Successful!
        </h1>
        <p className="text-lg text-green-600 font-semibold mb-4">
          Thank you for subscribing.
        </p>
        
        {/* Details */}
        <p className="text-gray-500 mb-6">
          Your premium features are now active. Head back to the dashboard to start using them!
        </p>

        {/* Call to Action Buttons */}
        <div className="space-y-4">
          <ReturnHomeBtn />
        </div>
        
      </div>
    </div>
  );
};

export default SuccessPayment;