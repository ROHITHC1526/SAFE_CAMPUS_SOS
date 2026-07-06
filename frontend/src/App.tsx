import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Spin } from 'antd';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import AdminDashboard from './pages/AdminDashboard';
import IncidentDetail from './pages/IncidentDetail';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a1a' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    const redirectMap: Record<string, string> = {
      STUDENT: '/student',
      SECURITY: '/security',
      ADMIN: '/admin',
    };
    return <Navigate to={redirectMap[user.role] || '/'} replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardRedirect = () => {
    if (!isAuthenticated || !user) return '/login';
    const map: Record<string, string> = {
      STUDENT: '/student',
      SECURITY: '/security',
      ADMIN: '/admin',
    };
    return map[user.role] || '/';
  };

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={getDashboardRedirect()} replace /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDashboardRedirect()} replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={getDashboardRedirect()} replace /> : <RegisterPage />} />

      <Route path="/student/*" element={
        <ProtectedRoute roles={['STUDENT']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/security/*" element={
        <ProtectedRoute roles={['SECURITY']}>
          <SecurityDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/*" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/incident/:id" element={
        <ProtectedRoute>
          <IncidentDetail />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
