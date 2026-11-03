import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { RequestBuilderPage } from './pages/RequestBuilderPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="request-builder" element={<RequestBuilderPage />} />
          <Route path="test-cases" element={<TestCasesPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="environments" element={<EnvironmentsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
