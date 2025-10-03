import Link from 'next/link';
import React from 'react';


export default function ReturnHomeBtn() {
  return (
    <div>
        <Link href="/" passHref>
            <button className="text-xl lg:text-2xl hand_font">
                ← Return to Home
            </button>
        </Link>
    </div>
  );
}
