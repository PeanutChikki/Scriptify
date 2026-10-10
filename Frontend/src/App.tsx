import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DocumentProvider } from './state';
import { AppHeader } from './components/layout/AppHeader';
import { HomePage } from './pages/HomePage';
import { TemplatesPage } from './pages/TemplatesPage';
import { PreviewPage } from './pages/PreviewPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <DocumentProvider>
        <div className="main-wrapper">
          <AppHeader />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/preview/:documentId" element={<PreviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </DocumentProvider>
    </BrowserRouter>
  );
};
