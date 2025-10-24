import React from 'react';

/**
 * Component that displays links to the privacy policies of Clerk and Stripe.
 * Displays links side-by-side using Flexbox.
 */
export const PrivacyPolicyLinks: React.FC = () => {
  return (
    <div>
      <p>This  is Test </p>
      <div className="flex flex-col sm:flex-row text-sm text-gray-700 space-y-2 sm:space-y-0 sm:gap-4 mt-2">
        
        {/*Clerk Link Block*/}
        <p>
          Clerk Privacy Policy: 
          <a 
            href="https://clerk.com/legal/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline ml-1 font-medium"
          >
            [Link]
          </a>
        </p>

        {/*Stripe Link Block*/}
        <p>
          Stripe Privacy Policy: 
          <a 
            href="https://stripe.com/au/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline ml-1 font-medium"
          >
            [Link]
          </a>
        </p>

      </div>
    </div>
  );
};