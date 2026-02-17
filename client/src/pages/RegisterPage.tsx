import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { Video, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';


export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.displayName.length < 2) {
      newErrors.displayName = 'Имя должно содержать минимум 2 символа';
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        displayName: formData.displayName,
        email: formData.email,
        password: formData.password,
      });
      
      // Проверяем, было ли намерение создать/присоединиться к комнате
      const pendingRoomName = localStorage.getItem('pendingRoomName');
      const pendingRoomCode = localStorage.getItem('pendingRoomCode');
      
      if (pendingRoomName) {
        localStorage.removeItem('pendingRoomName');
        try {
          const room = await apiService.createRoom({ name: pendingRoomName });
          navigate(`/lobby/${room.slug}`);
          return;
        } catch (error) {
          console.error('Error creating room:', error);
          toast.error('Не удалось создать комнату');
        }
      }
      
      if (pendingRoomCode) {
        localStorage.removeItem('pendingRoomCode');
        navigate(`/lobby/${pendingRoomCode}`);
        return;
      }
      
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      // Ошибка уже обработана в authStore с toast
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
            Создать аккаунт
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            Зарегистрируйтесь для создания встреч
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
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
                onChange={(e) => {
                  setFormData({ ...formData, displayName: e.target.value });
                  if (errors.displayName) setErrors({ ...errors, displayName: '' });
                }}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.displayName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="Иван Иванов"
                disabled={isLoading}
              />
            </div>
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>
            )}
          </div>

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
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
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
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Подтвердите пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Регистрация...
              </>
            ) : (
              'Зарегистрироваться'
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Войти
              </Link>
            </p>
          </div>
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
