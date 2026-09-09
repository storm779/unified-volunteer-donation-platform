import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { configurationError } from './firebase/config';
import MainLayout from './layouts/MainLayout';
import { Loading, ErrorState, Button } from './components/UI';
import HomePage from './pages/HomePage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import VolunteerPage from './pages/VolunteerPage';
import OpportunityDetailPage from './pages/OpportunityDetailPage';
import './styles.css';
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <section className="container section">
        <ErrorState message="This area is available to organization or administrator accounts." />
        <Button to="/dashboard">Your dashboard</Button>
      </section>
    );
  return children;
}
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <section className="container section">
        <ErrorState message="This page could not load. Refresh the page to try again." />
        <button className="button primary" onClick={() => window.location.reload()}>
          Refresh page
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
function App() {
  if (configurationError) return <ErrorState message={configurationError} />;
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="volunteer" element={<VolunteerPage />} />
                <Route path="volunteer/:id" element={<OpportunityDetailPage />} />
                <Route path="login" element={<AuthPage />} />
                <Route path="register" element={<AuthPage register />} />
                <Route
                  path="dashboard"
                  element={
                    <Protected>
                      <DashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="organization"
                  element={
                    <Protected roles={['organization', 'admin']}>
                      <OrganizationPage />
                    </Protected>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <Protected roles={['admin']}>
                      <AdminPage />
                    </Protected>
                  }
                />
                <Route
                  path="*"
                  element={
                    <section className="container section not-found">
                      <span className="eyebrow">404 · A LITTLE OFF THE PATH</span>
                      <h1>Let’s find your way back.</h1>
                      <p>There’s still plenty of good to discover.</p>
                      <Button to="/">Back to home</Button>
                    </section>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
