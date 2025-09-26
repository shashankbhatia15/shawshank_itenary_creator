import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      width="80" 
      height="80" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Shawshank Travel Planner logo"
      role="img"
    >
      <path 
        fill="#ffffff" 
        d="M50 10 C 60 25, 75 35, 90 40 L 50 55 L 10 40 C 25 35, 40 25, 50 10 Z M 50 60 L 65 90 L 50 80 L 35 90 L 50 60 Z" 
      />
    </svg>
  );
};

export default Logo;
