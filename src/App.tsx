/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Curriculum } from './pages/Curriculum';
import { Resources } from './pages/Resources';
import { CalendarPage } from './pages/CalendarPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeveloperTools } from './pages/DeveloperTools';
import { Planner } from './pages/Planner';

function AppContent() {
  const { user, activeTab } = useApp();

  // If the candidate is not authenticated, display the login layout.
  if (!user) {
    return <Login />;
  }

  // Render current active tab module.
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'curriculum':
        return <Curriculum />;
      case 'resources':
        return <Resources />;
      case 'calendar':
        return <CalendarPage />;
      case 'notes':
        return <NotesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'planner':
        return <Planner />;
      case 'developer':
        return (import.meta as any).env.DEV ? <DeveloperTools /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Collapsible, persistent left navigation sidebar */}
      <Sidebar />

      {/* Main viewport area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        
        {/* Dynamic header containing breadcrumbs, search triggers, notification triggers */}
        <Header />

        {/* Scrollable content pane */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 outline-hidden">
          <div className="w-full">
            <ErrorBoundary>
              {renderActivePage()}
            </ErrorBoundary>
          </div>
        </main>

      </div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppProvider>
  );
}
