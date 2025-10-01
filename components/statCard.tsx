import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-[#424911] p-2 md:p-4 lg:p-5 rounded-lg shadow-md">
    <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-white">{title}</h3>
    <p className="text-xl md:text-3xl lg:text-4xl font-bold text-white mt-2">{value}</p>
  </div>
);

export default StatCard;