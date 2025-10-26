"use client";

import { PrivacyPolicyLinks } from "@/components/policyLinks";
import PrivacyActions from "@/components/privacyAction";
import ReturnHomeBtn from "@/components/returnToHomeBtn";
import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 mb-8 bg-gray-50 rounded-xl">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: October 22, 2025</p>

      <p className="mb-6">
        This Privacy Policy (hereinafter referred to as “this Policy”) explains how Score Sheetr App 
        (hereinafter referred to as “we,” “our,” or “the App”) collects, uses, and protects your personal 
        information when you use the Score Sheetr application (hereinafter referred to as “the Service”).
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">1. Information We Collect</h2>
      <p className="mb-4">
        We may collect the following categories of information for the purpose of providing and managing our Service:
      </p>

      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          <strong>Account Information:</strong> Name, email address, and authentication information 
          (e.g., Clerk ID). Used for account registration, authentication, verification of premium access, 
          and communication related to the Service.
        </li>
        <li>
          <strong>Payment Information:</strong> Stripe customer ID, subscription status, and billing history summary. 
          Used for processing subscription payments via Stripe. Credit card details are never stored on our servers.
        </li>
        <li>
          <strong>Usage Data:</strong> Score records, browsing history, user-created groups, and in-app settings. 
          Used for providing and improving the Service and personalizing user experience.
        </li>
        <li>
          <strong>Technical Information:</strong> Browser type, device information, IP address, access timestamps, and cookies. 
          Used to maintain security, prevent fraud, and apply rate limits.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">2. Purpose of Use</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>To provide and manage the Service, including subscription activation, account maintenance, and display of score data.</li>
        <li>To authenticate users via Clerk and manage service eligibility.</li>
        <li>To process payments and manage billing information through Stripe.</li>
        <li>To provide customer support, respond to inquiries, and send important notifications.</li>
        <li>To ensure security, prevent unauthorized access, and monitor fraudulent activity.</li>
        <li>To improve our Service and develop new features using anonymized data.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">3. Data Sharing and Third Parties</h2>
      <p className="mb-4">
        We do not share or disclose personal information to third parties except in the following cases:
      </p>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>
          <strong>Authentication Service (Clerk):</strong> Authentication data (e.g., Clerk ID, email) 
          is processed by Clerk for identity verification and account management.
        </li>
        <li>
          <strong>Payment Service (Stripe):</strong> Subscription data is shared with Stripe for secure payment processing.
        </li>
        <li>
          <strong>Hosting/Database Services:</strong> Some data is stored on hosting and database providers 
          to operate the Service.
        </li>
        <li>
          <strong>Legal Requirements:</strong> When disclosure is required by law or court order.
        </li>
        <li>
          <strong>Business Transfer:</strong> In case of merger, acquisition, or other corporate restructuring.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">4. Cookies</h2>
      <p className="mb-6">
        We may use cookies and similar technologies for purposes such as maintaining login sessions, 
        providing security features, and remembering in-app settings.  
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">5. International Data Transfers</h2>
      <p className="mb-6">
        Your personal data may be processed or stored outside your country of residence, 
        including Japan, Australia, the United States, and the European Economic Area (EEA).  
        We comply with Japan’s Personal Information Protection Law, Australia’s Privacy Principles (APPs), 
        and GDPR requirements for data transfers (e.g., Standard Contractual Clauses).
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">6. Your Rights</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2">
        <li>You have the right to access, correct, delete, or restrict the use of your personal data.</li>
        <li><strong>a. Right to Data Portability:</strong> You have the right to receive your personal data in a structured, commonly used, and machine-readable format.</li>
        <li>Through the data export feature located on the app's "Privacy" page, you can download all of your data held by us, including information managed and referenced by us through our third-party partners, in a machine-readable format.</li>
        <li><strong>b. Right to Erasure:</strong> You have the right to request the deletion of your personal data under certain circumstances.</li>
        <li>Upon request made through the in-app account deletion feature, we will proceed with the deletion of your personal data from our databases and from associated third-party services.</li>
        <li><strong>Retention of Transaction History:</strong> Please note that financial services, such as Stripe, are required to retain past payment and billing records for a certain period based on legal obligations (e.g., tax laws, financial regulations).</li>
        <li>For detailed logs or information processed and retained by our third-party partners for their own purposes, which is not managed by us, please refer to the partners' privacy policies below or contact them directly to exercise your rights.</li>
        <PrivacyPolicyLinks/>
      </ul>
      <PrivacyActions />

      <h2 className="text-2xl font-semibold mt-8 mb-3">7. Data Retention</h2>
      <p className="mb-6">
        We retain your data as long as your account is active or as required by law. 
        Once your account is deleted, we retain necessary information only for legal compliance or dispute resolution.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">8. Policy Updates</h2>
      <p className="mb-6">
        We may update this Policy from time to time due to legal changes or updates to our Service. 
        Significant updates will be announced in-app or via registered email notifications.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">9. Contact</h2>
      <p>
        For questions about this Policy or to exercise your privacy rights, please contact us at:  
        <br />
        <strong>Email:</strong> [Your Email Address]
      </p>
      <div className="mt-10">
        <ReturnHomeBtn/>
      </div>
    </div>
  );
}