import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Проверяем авторизацию только если нет пользователя
    if (!user) {
      checkAuth();
    }
  }, [checkAuth, user]);

  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Redirecting to /login, saving intended destination:', location.pathname);
    // Сохраняем путь куда хотел попасть пользователь
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
