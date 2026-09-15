import React from 'react';

/**
 * Navbar component:
 * Kept strictly empty per user requirement: "do not put anything on the nav bar".
 * All navigation and controls are housed within the collapsible side drawer.
 */
export const Navbar: React.FC = () => {
  return (
    <header
      id="enterprise-top-navbar"
      className="h-12 bg-white border-b border-slate-200 shrink-0 select-none"
      aria-label="Top navigation bar"
    />
  );
};
