// CampusMobility Logo - Version 1.0.2
import React from 'react';

export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#006699" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
      
      {/* Pin Shape */}
      <path 
        d="M50 5C30.67 5 15 20.67 15 40C15 65 50 95 50 95C50 95 85 65 85 40C85 20.67 69.33 5 50 5Z" 
        fill="url(#pinGradient)" 
      />
      
      {/* Inner Circle */}
      <circle cx="50" cy="40" r="18" fill="white" />
      
      {/* Road Path */}
      <path 
        d="M25 70C35 60 65 60 75 70L80 75C70 65 30 65 20 75L25 70Z" 
        fill="white" 
        opacity="0.8"
      />
      <path 
        d="M30 80C40 70 60 70 70 80L75 85C65 75 35 75 25 85L30 80Z" 
        fill="white" 
        opacity="0.6"
      />
      
      {/* Dashed Line on Road */}
      <path 
        d="M45 75C48 73 52 73 55 75" 
        stroke="white" 
        strokeWidth="1" 
        strokeDasharray="2 2"
      />
    </svg>
  );
}
