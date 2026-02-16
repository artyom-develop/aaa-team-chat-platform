import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Video, LogOut, User, Plus, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      // Сохраняем намерение создать комнату
      localStorage.setItem('pendingRoomName', roomName);
      navigate('/login');
      return;
    }

    if (!roomName.trim()) {
      toast.error('Введите название комнаты');
      return;
    }

    setIsCreating(true);
    try {
      // Проверяем что токен установлен
      const token = apiService.getToken();
      console.log('Creating room with token:', token ? 'present' : 'missing');
      
      const room = await apiService.createRoom({ name: roomName });
      toast.success('Комната создана!');
      navigate(`/lobby/${room.slug}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      const message = error.response?.data?.message || 'Не удалось создать комнату';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      toast.error('Введите код комнаты');
      return;
    }

    if (!isAuthenticated) {
      // Сохраняем код комнаты для присоединения после авторизации
      localStorage.setItem('pendingRoomCode', roomCode);
      navigate('/login');
      return;
    }

    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">VideoMeet</span>
            </div>
            
            {isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">{user.displayName}</span>
                  {user.isGuest && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      Гость
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Видеоконференции для всех
          </h1>
          <p className="text-xl text-gray-400 mb-12">
            Создавайте встречи, общайтесь с коллегами и друзьями в режиме реального времени
          </p>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Создать новую встречу */}
            <form onSubmit={handleCreateRoom} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Создать новую встречу
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Название встречи (например, 'Совещание команды')"
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? 'Создание...' : 'Создать'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Присоединиться к встрече */}
            <div className="text-center">
              <p className="text-gray-400 mb-3">или</p>
            </div>

            <form onSubmit={handleJoinRoom} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Присоединиться к встрече</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Введите код комнаты"
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center gap-2"
                >
                  Присоединиться
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">HD Видео</h3>
            <p className="text-gray-400">
              Кристально чистое видео и аудио для комфортного общения
            </p>
          </div>

          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Чат</h3>
            <p className="text-gray-400">
              Обменивайтесь сообщениями во время встречи
            </p>
          </div>

          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Демонстрация экрана</h3>
            <p className="text-gray-400">
              Делитесь экраном для презентаций и совместной работы
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
