import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import { useRoomStore } from '../store/roomStore';
import { ChatMessage } from '../types';
import toast from 'react-hot-toast';

/**
 * Хук для управления чатом
 */
export const useChat = () => {
  const { room } = useRoomStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка истории чата
  useEffect(() => {
    if (!room) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const { messages: history } = await apiService.getChatHistory(room.slug);
        setMessages(Array.isArray(history) ? history : []);
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast.error('Не удалось загрузить историю чата');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [room]);

  // Обработка новых сообщений
  useEffect(() => {
    if (!room) return;

    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...(prev || []), message]);
    };

    socketService.on('chat:message', handleNewMessage);

    return () => {
      socketService.off('chat:message', handleNewMessage);
    };
  }, [room]);

  // Отправка сообщения
  const sendMessage = useCallback(
    (content: string) => {
      if (!room || !content.trim()) {
        return Promise.reject(new Error('Комната не найдена или сообщение пустое'));
      }

      return new Promise<void>((resolve, reject) => {
        console.log('[useChat] Sending message to room:', room.slug, 'content:', content);
        socketService.sendMessage(room.slug, content, undefined, (response: { success: boolean; error?: string }) => {
          console.log('[useChat] Send message response:', response);
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
            toast.error('Не удалось отправить сообщение');
          }
        });
      });
    },
    [room]
  );

  // Очистка при выходе из комнаты
  useEffect(() => {
    if (!room) {
      setMessages([]);
    }
  }, [room]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
