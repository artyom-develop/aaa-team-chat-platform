import { useState, useEffect, useCallback, useRef } from 'react';
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
  const currentRoomSlugRef = useRef<string | null>(null);

  // Загрузка истории чата
  useEffect(() => {
    const roomSlug = room?.slug;
    
    // Если комнаты нет или slug не изменился - ничего не делаем
    if (!roomSlug) {
      return;
    }

    // Если slug изменился - загружаем новую историю
    if (currentRoomSlugRef.current !== roomSlug) {
      currentRoomSlugRef.current = roomSlug;
      
      const loadHistory = async () => {
        setIsLoading(true);
        try {
          const { messages: history } = await apiService.getChatHistory(roomSlug);
          const messagesArray = Array.isArray(history) ? history : [];
          console.log('[useChat] Loaded history for room:', roomSlug, 'messages:', messagesArray.length);
          setMessages(messagesArray);
        } catch (error) {
          console.error('Error loading chat history:', error);
          setMessages([]);
          toast.error('Не удалось загрузить историю чата');
        } finally {
          setIsLoading(false);
        }
      };

      loadHistory();
    }
    
    // Cleanup при размонтировании - очищаем только если комната изменилась
    return () => {
      if (!room || room.slug !== currentRoomSlugRef.current) {
        console.log('[useChat] Clearing messages - room changed or unmounted');
        currentRoomSlugRef.current = null;
        setMessages([]);
      }
    };
  }, [room?.slug]);

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

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
