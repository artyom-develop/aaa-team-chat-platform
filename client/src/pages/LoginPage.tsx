import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { Video, Mail, Lock, User } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginGuest, isLoading } = useAuthStore();
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isGuestMode) {
        await loginGuest({ displayName: formData.displayName });
      } else {
        await login({ email: formData.email, password: formData.password });
      }
      
      console.log('[LoginPage] Login successful, checking pending operations');
      
      // Проверяем, было ли намерение создать/присоединиться к комнате
      const pendingRoomName = localStorage.getItem('pendingRoomName');
      const pendingRoomCode = localStorage.getItem('pendingRoomCode');
      
      if (pendingRoomName) {
        localStorage.removeItem('pendingRoomName');
        console.log('[LoginPage] Creating room:', pendingRoomName);
        try {
          const room = await apiService.createRoom({ name: pendingRoomName });
          console.log('[LoginPage] Room created, navigating to:', `/lobby/${room.slug}`);
          navigate(`/lobby/${room.slug}`);
          return;
        } catch (error) {
          console.error('Error creating room:', error);
        }
      }
      
      if (pendingRoomCode) {
        localStorage.removeItem('pendingRoomCode');
        console.log('[LoginPage] Joining room:', pendingRoomCode);
        navigate(`/lobby/${pendingRoomCode}`);
        return;
      }
      
      console.log('[LoginPage] No pending operations, navigating to home');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Video className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
            <span className="text-2xl sm:text-3xl font-bold text-white">VideoMeet</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            {isGuestMode ? 'Войти как гость' : 'Вход в аккаунт'}
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {isGuestMode ? 'Введите ваше имя для входа' : 'Введите ваши данные для входа'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
          {isGuestMode ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ваше имя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите ваше имя"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Вход...' : isGuestMode ? 'Войти как гость' : 'Войти'}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsGuestMode(!isGuestMode)}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              {isGuestMode ? 'Войти с паролем' : 'Войти как гость'}
            </button>
          </div>

          {!isGuestMode && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
};
