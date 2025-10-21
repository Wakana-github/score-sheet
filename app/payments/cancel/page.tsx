import ReturnHomeBtn from '@/components/returnToHomeBtn';
import React from 'react'

const FailedPayment = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-xl p-8 sm:p-10 text-center border border-red-200">
        
        {/* Failure/Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Path for an Alert/Warning triangle with an exclamation mark */}
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.3 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Was Not Completed
        </h1>
        <p className="text-lg text-red-600 font-semibold mb-4">
          Transaction Failed or Canceled.
        </p>
        
        {/* Guidance for Troubleshooting */}
        <p className="text-gray-500 text-left">
          Your payment could not be processed. This may be due to:
        </p>
        <ul className="text-gray-600 mb-2 list-disc list-inside text-left space-y-1">
          <li>Incorrect card details.</li>
          <li>Insufficient funds or reaching your card limit.</li>
          <li>The payment process was canceled by the user.</li>
        </ul>
        <p className="text-lg text-red-600 font-semibold mb-2">
          Please try again.
        </p>
        {/* Returning home */}
          <ReturnHomeBtn />
        </div>
        
      </div>
  );
};

export default FailedPayment;