//Stats Ranking card

import React from 'react';

interface RankCardProps {
  title: string;
  value: string | number;
  className?: string;
}

const RankCard = ({ title, value, className}: RankCardProps) => (
  <div className={`${className} p-2 md:p-4 lg:p-5 rounded-lg shadow-md`}>
    <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-white">{title}</h3>
    <p className="text-xl md:text-2xl  font-bold text-white mt-2">{value}</p>
  </div>
);

export default RankCard;