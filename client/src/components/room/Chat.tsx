import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatProps {
  onClose: () => void;
}

export const Chat = ({ onClose }: ChatProps) => {
  const { user } = useAuthStore();
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    console.log('[Chat] Submitting message:', input);
    try {
      await sendMessage(input);
      console.log('[Chat] Message sent successfully');
      setInput('');
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Заголовок */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <h3 className="text-white font-semibold">Чат</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Загрузка...</div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-center">
              <p>Сообщений пока нет</p>
              <p className="text-sm mt-1">Начните общение!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user.id === user?.id;

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
              >
                {!isOwnMessage && (
                  <span className="text-xs text-gray-400 mb-1 px-1">
                    {message.user.displayName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {format(new Date(message.createdAt), 'HH:mm', { locale: ru })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите сообщение..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
