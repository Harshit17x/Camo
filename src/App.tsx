// CampusMobility - Mappls Integrated Version 1.0.1
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { NotificationManager } from './components/shared/NotificationManager';
import { initNativeApp, requestNativePermissions, isNative } from './services/nativeService';
import { SplashScreen } from './components/shared/SplashScreen';
import { CallProvider } from './contexts/CallContext';
import { CallOverlay } from './components/shared/CallOverlay';

// Lazy load components
const Login = React.lazy(() => import('./components/auth/Login'));
const RiderHome = React.lazy(() => import('./components/rider/RiderHome'));
const DriverDashboard = React.lazy(() => import('./components/driver/DriverDashboard'));
const Profile = React.lazy(() => import('./components/shared/Profile').then(m => ({ default: m.Profile })));
const Wallet = React.lazy(() => import('./components/shared/Wallet').then(m => ({ default: m.Wallet })));
const TripHistory = React.lazy(() => import('./hooks/TripHistory').then(m => ({ default: m.TripHistory })));
const SupportTickets = React.lazy(() => import('./components/shared/SupportTickets'));
const SecureManagementConsole = React.lazy(() => import('./components/admin/SecureManagementConsole'));
const DriverOnboarding = React.lazy(() => import('./components/driver/DriverOnboarding'));
const RideSharing = React.lazy(() => import('./components/rider/RideSharing'));
const PhoneNumberPrompt = React.lazy(() => import('./components/auth/PhoneNumberPrompt'));
const MapScreen = React.lazy(() => import('./components/rider/MapScreen'));

import { MaintenanceScreen } from './components/shared/MaintenanceScreen';
import { useSystemConfig } from './hooks/useSystemConfig';

import { useLocation } from 'react-router-dom';

function AppContent() {
  const { user, profile, loading: authLoading, isAuthReady, needsPhoneNumber } = useAuth();
  const { config, loading: configLoading } = useSystemConfig();
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Initialize native features if running on Android/iOS
    if (isNative) {
      initNativeApp();
      requestNativePermissions();
    }
    
    // Assume DB is connected unless a real error occurs in AuthContext/Services
    setIsDbConnected(true);
  }, []);

  if (authLoading || configLoading || !isAuthReady) {
    return <SplashScreen />;
  }

  // Maintenance Mode Check
  // Allow admins to bypass maintenance mode so they can turn it off
  // Also allow the login page so admins can log in
  const isMaintenanceActive = config?.maintenanceMode && 
                              profile?.role !== 'admin' && 
                              location.pathname !== '/login';

  if (isMaintenanceActive) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      {isDbConnected === false && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white text-xs py-1 px-4 text-center font-bold uppercase tracking-wider">
          Database connection issue. Check FIREBASE_DATABASE_ID.
        </div>
      )}

      {config?.maintenanceMode && profile?.role === 'admin' && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white text-xs py-1 px-4 text-center font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <span>⚠️ Maintenance Mode is currently ACTIVE. Regular users cannot access the app.</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <React.Suspense fallback={<SplashScreen />}>
          <NotificationManager>
            {needsPhoneNumber && <PhoneNumberPrompt />}
            
            <Routes>
              <Route 
                path="/login" 
                element={!user ? <Login /> : <Navigate to="/" replace />} 
              />
              
              <Route
                path="/"
                element={
                  user ? (
                    profile?.role === 'driver' ? <DriverDashboard /> : <RiderHome />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/profile"
                element={user ? <Profile /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/wallet"
                element={user ? <Wallet /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/history"
                element={user ? <TripHistory /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/support"
                element={user ? <SupportTickets /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/driver-onboarding"
                element={user ? <DriverOnboarding /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/ride-sharing"
                element={user ? <RideSharing /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/map"
                element={user ? <MapScreen /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/management-console-v1-secure"
                element={user && profile?.role === 'admin' ? <SecureManagementConsole /> : <Navigate to="/" replace />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationManager>
        </React.Suspense>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CallProvider>
          <Router>
            <AppContent />
            <CallOverlay />
          </Router>
        </CallProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
