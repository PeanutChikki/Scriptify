import React from 'react';
import { NavLink } from 'react-router-dom';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const AppHeader: React.FC = () => {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <NavLink to="/" className="brand-link">
          <div className="brand-symbol">S</div>
          <span className="brand-text">Scriptify</span>
        </NavLink>
        <span className="env-tag" title="Toggle using VITE_USE_MOCK in .env">
          {IS_MOCK ? 'mock engine' : 'live api'}
        </span>
      </div>

      <nav className="header-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}
        >
          Studio
        </NavLink>
        <NavLink
          to="/templates"
          className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}
        >
          Templates
        </NavLink>
      </nav>
    </header>
  );
};
