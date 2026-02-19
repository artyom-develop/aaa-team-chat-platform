# 📋 План исправления критических багов VideoMeet

## Анализ логов

### Найденные проблемы в production логах:

1. **БАГ #3 (множественные подключения)** - ПОДТВЕРЖДЕНО:
   - `logs-server.txt:412-417`: Один пользователь добавляется 3 раза
   - `Participant c118fe26-2a4b-46b3-89dd-dedc58cb7875 added to room 280d-ed66-9442` (x3)
   - `User c118fe26-2a4b-46b3-89dd-dedc58cb7875 joined room 280d-ed66-9442` (x3)
   - Root cause: `room:join` event handler вызывается несколько раз

2. **БАГ #4 (нестабильные соединения)** - ПОДТВЕРЖДЕНО:
   - `logs-devtools.txt:950`: ICE disconnected → reconnection attempts
   - `ICE still disconnected after 5s, trying ICE restart` (должно быть 3с)
   - Множественные ICE state changes: disconnected → connected → disconnected

3. **БАГ #1 (toggle отключает пользователя)** - ЧАСТИЧНО:
   - `logs-devtools.txt:950`: `trackReadyState='ended'` найден
   - Треки показывают состояние 'ended' вместо просто disabled
   - Может быть связано с переподключением

4. **БАГ #2 (автоматическое включение камеры)** - ПОДТВЕРЖДЕНО:
   - `LobbyPage.tsx:48-63`: Автоматический `getUserMedia()` при загрузке
   - Нет сохранения предпочтений пользователя в localStorage

5. **БАГ #5 (оптимизация памяти)** - В КОДЕ:
   - `room-state.service.ts:35`: Redis TTL = 24 часа (нужно 6 часов)
   - `package.json`: Нет Node.js memory flags
   - Socket.io нет лимитов на maxHttpBufferSize

---

## 🎯 Детальный план исправлений

### БАГ #1: Toggle камеры/микрофона отключает пользователя

**Файл**: `client/src/store/mediaStore.ts`

**Проблема**: Хотя в toggleVideo/toggleAudio правильно используется `track.enabled`, при reconnect или смене стрима вызывается `track.stop()` (строка 85), что убивает треки.

**Решение**:
```typescript
// БЫЛО (строка 82-86):
setLocalStream: (stream) => {
  const { localStream: currentStream } = get();
  
  if (currentStream && currentStream !== stream) {
    console.log('[mediaStore] Stopping previous stream:', currentStream.id);
    currentStream.getTracks().forEach((track) => track.stop()); // ❌ ПРОБЛЕМА
  }

  console.log('[mediaStore] Setting new local stream:', stream?.id);
  set({ localStream: stream });
},

// ДОЛЖНО БЫТЬ:
setLocalStream: (stream) => {
  const { localStream: currentStream } = get();
  
  // Проверяем, действительно ли это новый stream
  // Не останавливаем треки при reconnect если это тот же stream
  if (currentStream && currentStream !== stream && currentStream.id !== stream?.id) {
    console.log('[mediaStore] Stopping previous stream:', currentStream.id);
    // Только если это ДЕЙСТВИТЕЛЬНО другой stream (не reconnect)
    currentStream.getTracks().forEach((track) => {
      if (track.readyState === 'live') {
        track.stop();
      }
    });
  } else if (currentStream && currentStream.id === stream?.id) {
    console.log('[mediaStore] Same stream, keeping tracks alive');
    return; // Не заменяем, если это тот же stream
  }

  console.log('[mediaStore] Setting new local stream:', stream?.id);
  set({ localStream: stream });
},
```

**Также добавить комментарии в toggleVideo/toggleAudio** (строки 97, 130):
```typescript
// ✅ ВАЖНО: Используем track.enabled вместо track.stop()
// track.stop() полностью убивает трек и требует нового getUserMedia
// track.enabled = false просто отключает трансляцию, трек остается живым
track.enabled = newVideoEnabled;
```

---

### БАГ #2: Автоматическое включение камеры/микрофона

**Файлы**: 
- `client/src/pages/LobbyPage.tsx`
- `client/src/store/mediaStore.ts`

**Проблема**: В LobbyPage автоматически вызывается `getUserMedia()` при монтировании, не учитывая предпочтения пользователя.

**Решение 1 - mediaStore.ts**: Добавить localStorage для сохранения состояния:

```typescript
// ДОБАВИТЬ константы в начало файла:
const MEDIA_PREFS_KEY = 'videoMeetMediaPrefs';

interface MediaPreferences {
  audioEnabled: boolean;
  videoEnabled: boolean;
  autoStart: boolean;
}

// Загрузить предпочтения из localStorage
const loadMediaPreferences = (): MediaPreferences => {
  try {
    const stored = localStorage.getItem(MEDIA_PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[mediaStore] Failed to load media preferences:', error);
  }
  // Значения по умолчанию - НЕ автоматически включать
  return {
    audioEnabled: false,
    videoEnabled: false,
    autoStart: false,
  };
};

// Сохранить предпочтения
const saveMediaPreferences = (prefs: MediaPreferences) => {
  try {
    localStorage.setItem(MEDIA_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('[mediaStore] Failed to save media preferences:', error);
  }
};

// ИЗМЕНИТЬ store:
export const useMediaStore = create<MediaStore>((set, get) => {
  const prefs = loadMediaPreferences();
  
  return {
    // ... существующие поля
    audioEnabled: prefs.audioEnabled,
    videoEnabled: prefs.videoEnabled,
    
    // ДОБАВИТЬ новые методы:
    getMediaPreferences: () => loadMediaPreferences(),
    saveMediaPreferences: (prefs: MediaPreferences) => {
      saveMediaPreferences(prefs);
      set({ 
        audioEnabled: prefs.audioEnabled, 
        videoEnabled: prefs.videoEnabled 
      });
    },
    
    // ИЗМЕНИТЬ toggleAudio:
    toggleAudio: () => {
      const { localStream, audioEnabled } = get();
      if (localStream) {
        const newAudioEnabled = !audioEnabled;
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = newAudioEnabled;
        });
        set({ audioEnabled: newAudioEnabled });
        
        // Сохраняем предпочтение
        const prefs = loadMediaPreferences();
        saveMediaPreferences({ ...prefs, audioEnabled: newAudioEnabled });
        
        // ... остальной код
      }
    },
    
    // АНАЛОГИЧНО для toggleVideo
  };
});
```

**Решение 2 - LobbyPage.tsx**: Добавить UI для ручного старта:

```tsx
// ИЗМЕНИТЬ код инициализации медиа (строки 42-66):

const [mediaStarted, setMediaStarted] = useState(false);
const [isRequestingMedia, setIsRequestingMedia] = useState(false);

// УБРАТЬ автоматический useEffect с getUserMedia!
// Заменить на ручной запуск:

const startMedia = async () => {
  setIsRequestingMedia(true);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 1280, height: 720 },
    });
    
    useMediaStore.getState().setLocalStream(stream);
    setMediaStarted(true);
    
    // Сохраняем предпочтение автостарта
    const prefs = useMediaStore.getState().getMediaPreferences();
    useMediaStore.getState().saveMediaPreferences({ 
      ...prefs, 
      autoStart: true 
    });
    
    console.log('[LobbyPage] Local stream initialized:', stream.id);
    toast.success('Доступ к камере и микрофону получен');
  } catch (error) {
    console.error('Error accessing media devices:', error);
    toast.error('Не удалось получить доступ к камере и микрофону');
  } finally {
    setIsRequestingMedia(false);
  }
};

// При монтировании - проверяем autoStart предпочтение:
useEffect(() => {
  const prefs = useMediaStore.getState().getMediaPreferences();
  if (prefs.autoStart) {
    startMedia();
  }
}, []);

// ДОБАВИТЬ в UI кнопку "Включить камеру/микрофон":
{!mediaStarted && (
  <button
    onClick={startMedia}
    disabled={isRequestingMedia}
    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
  >
    {isRequestingMedia ? 'Запрашиваем доступ...' : 'Включить камеру и микрофон'}
  </button>
)}
```

---

### БАГ #3: Множественные peer connections к одному пользователю

**Файлы**:
- `server/src/socket/handlers/room.handler.ts`
- `server/src/socket/index.ts`
- `client/src/hooks/useSocket.ts`

**Root cause**: Event handler `room:join` регистрируется несколько раз на сервере (возможно при hot reload или reconnect).

**Решение 1 - server/src/socket/handlers/room.handler.ts**: Добавить проверку существования участника перед добавлением:

```typescript
// ИЗМЕНИТЬ handleJoin (строки 18-99):
async handleJoin(
  socket: AuthenticatedSocket,
  data: RoomJoinData,
  callback: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    const { roomSlug, password, isMuted = false, isCameraOff = false } = data;

    // Проверяем существование комнаты
    const room = await roomsRepository.findBySlugWithHost(roomSlug);
    if (!room) {
      return callback({ success: false, error: 'Комната не найдена' });
    }

    // ✅ НОВАЯ ПРОВЕРКА: Пользователь уже в комнате?
    const existingParticipant = await RoomStateService.getParticipant(roomSlug, socket.userId || '');
    if (existingParticipant) {
      logger.warn(`User ${socket.userId} already in room ${roomSlug}, updating socketId`);
      
      // Обновляем socketId (при reconnect)
      await RoomStateService.updateParticipant(roomSlug, socket.userId || '', {
        socketId: socket.id,
        isMuted,
        isCameraOff,
      });
      
      // Получаем актуальный список участников
      const participants = await RoomStateService.getParticipants(roomSlug);
      const participantsData: ParticipantData[] = participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff,
        isScreenSharing: p.isScreenSharing,
        isHost: p.isHost,
      }));
      
      // Подключаем к Socket.io room
      await socket.join(roomSlug);
      
      // Отправляем подтверждение БЕЗ отправки room:user-joined другим (они уже знают)
      callback({ success: true });
      socket.emit('room:joined', { roomSlug, participants: participantsData });
      socket.emit('room:request-offers', { participants: participantsData });
      
      logger.info(`User ${socket.userId} reconnected to room ${roomSlug}`);
      return;
    }

    // Проверяем пароль, если есть
    if (room.password) {
      // ... existing password check
    }

    // Добавляем пользователя в комнату Socket.io
    await socket.join(roomSlug);

    // Создаём участника
    const participant: RoomParticipant = {
      userId: socket.userId || '',
      displayName: socket.displayName || 'Unknown',
      avatarUrl: null,
      socketId: socket.id,
      joinedAt: Date.now(),
      isMuted,
      isCameraOff,
      isScreenSharing: false,
      isHost: socket.userId === room.hostId,
    };

    // Сохраняем участника в Redis
    await RoomStateService.addParticipant(roomSlug, participant);

    // Получаем список всех участников из Redis
    const participants = await RoomStateService.getParticipants(roomSlug);
    const participantsData: ParticipantData[] = participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
      isScreenSharing: p.isScreenSharing,
      isHost: p.isHost,
    }));

    logger.info(`User ${socket.userId} joined room ${roomSlug}`);

    // Отправляем подтверждение присоединения с списком участников
    callback({ success: true });
    socket.emit('room:joined', { roomSlug, participants: participantsData });

    // Уведомляем других участников о новом пользователе (только ОДИН раз!)
    const newParticipant: ParticipantData = {
      userId: participant.userId,
      displayName: participant.displayName,
      avatarUrl: participant.avatarUrl,
      isMuted: participant.isMuted,
      isCameraOff: participant.isCameraOff,
      isScreenSharing: participant.isScreenSharing,
      isHost: participant.isHost,
    };

    socket.to(roomSlug).emit('room:user-joined', newParticipant);
    
    // Сообщаем новому участнику, что он должен создать offers
    socket.emit('room:request-offers', { participants: participantsData });
  } catch (error) {
    logger.error('Room join error:', error);
    callback({ success: false, error: 'Не удалось присоединиться к комнате' });
  }
}
```

**Решение 2 - server/src/socket/index.ts**: Убедиться что обработчики регистрируются только один раз:

```typescript
// Проверить что обработчики добавляются только через socket.on(), а НЕ socket.once()
// И что они не добавляются повторно при reconnect

io.on('connection', (socket: Socket) => {
  // ✅ Каждый новый socket получает свои обработчики
  // Не должно быть duplicate handlers
  
  const authenticatedSocket = socket as AuthenticatedSocket;
  
  // Логируем для дебага
  logger.info(`New socket connection: socketId=${socket.id}, userId=${authenticatedSocket.userId}`);
  
  // Регистрируем обработчики
  const roomHandler = new RoomHandler(io);
  const webrtcHandler = new WebRTCHandler(io);
  
  // События комнаты
  socket.on('room:join', (data, callback) => roomHandler.handleJoin(authenticatedSocket, data, callback));
  // ... остальные обработчики
});
```

**Решение 3 - client/src/hooks/useWebRTC.ts**: Добавить дополнительную защиту на клиенте:

```typescript
// ИЗМЕНИТЬ createPeerConnection (строки 36-54):
const createPeerConnection = useCallback(
  (userId: string): RTCPeerConnection => {
    // Проверяем, нет ли уже соединения с этим пользователем
    const existingPc = peerConnectionsRef.current.get(userId);
    if (existingPc && existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
      console.log('[useWebRTC] ✅ Peer connection already exists and active for:', userId, 'state:', existingPc.connectionState);
      return existingPc; // ✅ ВОЗВРАЩАЕМ существующее соединение
    }

    // Если старое соединение закрыто или failed, удаляем его
    if (existingPc) {
      console.log('[useWebRTC] ⚠️ Removing old peer connection for:', userId, 'state:', existingPc.connectionState);
      existingPc.close();
      peerConnectionsRef.current.delete(userId);
    }
    
    // ... создание нового соединения
  },
  [rtcConfig, localStream, room, updateParticipant]
);
```

---

### БАГ #4: Нестабильные соединения (ICE restart после 5с вместо 3с)

**Файл**: `client/src/hooks/useWebRTC.ts`

**Проблема**: ICE restart происходит через 5 секунд (строка 203), по заданию нужно 3 секунды.

**Решение**:

```typescript
// БЫЛО (строки 193-207):
if (pc.iceConnectionState === 'disconnected') {
  console.warn(`[useWebRTC] ICE disconnected for ${userId}, waiting for reconnection...`);
  // Даем 5 секунд на восстановление
  setTimeout(() => {
    if (pc.iceConnectionState === 'disconnected') {
      console.log(`[useWebRTC] ICE still disconnected after 5s, trying ICE restart for ${userId}`);
      if (pc.restartIce && pc.signalingState === 'stable') {
        pc.restartIce();
      }
    }
  }, 5000); // ❌ БЫЛО 5000
}

// ДОЛЖНО БЫТЬ:
if (pc.iceConnectionState === 'disconnected') {
  console.warn(`[useWebRTC] ICE disconnected for ${userId}, waiting for reconnection...`);
  
  // ✅ Даем 3 секунды на восстановление (по требованию)
  setTimeout(() => {
    if (pc.iceConnectionState === 'disconnected') {
      console.log(`[useWebRTC] ICE still disconnected after 3s, trying ICE restart for ${userId}`);
      
      if (pc.signalingState === 'stable') {
        // Используем restartIce + новый offer
        if (pc.restartIce) {
          pc.restartIce();
        }
        
        // Создаем новый offer с iceRestart флагом
        const createRestartOffer = async () => {
          try {
            if (room && localStream) {
              console.log('[useWebRTC] Creating ICE restart offer for:', userId);
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socketService.sendOffer(room.slug, userId, offer);
            }
          } catch (error) {
            console.error('[useWebRTC] Error during ICE restart offer:', error);
          }
        };
        createRestartOffer();
      }
    }
  }, 3000); // ✅ ИЗМЕНЕНО на 3000
}
```

**Также добавить обработку reconnect Socket.io**:

```typescript
// ДОБАВИТЬ в useWebRTC новый useEffect для отслеживания socket reconnect:
useEffect(() => {
  const handleSocketReconnect = () => {
    console.log('[useWebRTC] Socket reconnected, recreating WebRTC connections');
    
    // Закрываем все старые соединения
    peerConnectionsRef.current.forEach((pc, userId) => {
      console.log('[useWebRTC] Closing old connection for:', userId);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    // Новые соединения создадутся автоматически через useEffect с participants
    toast('Переподключение к участникам...', { icon: '🔄' });
  };
  
  socketService.on('connect', handleSocketReconnect);
  
  return () => {
    socketService.off('connect', handleSocketReconnect);
  };
}, []);
```

---

### БАГ #5: Оптимизация памяти для 0.5GB RAM

**Файлы**:
- `server/src/services/room-state.service.ts`
- `server/package.json`
- `server/src/socket/index.ts` (Socket.io конфигурация)

**Проблема**: Redis TTL 24 часа, нет Node.js memory flags, нет лимитов Socket.io.

**Решение 1 - room-state.service.ts**: Изменить TTL на 6 часов:

```typescript
// БЫЛО (строка 35):
private static readonly ROOM_TTL = 24 * 60 * 60; // 24 часа

// ДОЛЖНО БЫТЬ:
private static readonly ROOM_TTL = 6 * 60 * 60; // ✅ 6 часов (21600 секунд)
```

**Решение 2 - package.json**: Добавить Node.js memory flags:

```json
{
  "scripts": {
    // БЫЛО:
    "start": "bun run src/server.ts",
    "start:prod": "bun run migrate && bun dist/server.js",
    
    // ДОЛЖНО БЫТЬ:
    "start": "node --max-old-space-size=450 --optimize-for-size --gc-interval=100 src/server.ts",
    "start:prod": "node --max-old-space-size=450 --optimize-for-size --gc-interval=100 dist/server.js"
  }
}
```

**Параметры**:
- `--max-old-space-size=450` - Максимум 450 MB для old space (из 512 MB доступных)
- `--optimize-for-size` - Оптимизация для экономии памяти вместо скорости
- `--gc-interval=100` - Более частый сборщик мусора

**Решение 3 - server/src/socket/index.ts**: Добавить Socket.io лимиты:

```typescript
// НАЙТИ конфигурацию Socket.io и ДОБАВИТЬ:
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  },
  
  // ✅ ДОБАВИТЬ лимиты для экономии памяти:
  maxHttpBufferSize: 1e6, // 1 MB (вместо default 1 MB, но явно указываем)
  pingTimeout: 10000, // 10 секунд
  pingInterval: 5000, // 5 секунд (чаще проверяем живые соединения)
  transports: ['websocket', 'polling'], // Предпочитаем websocket
  allowUpgrades: true,
  perMessageDeflate: false, // Отключаем сжатие для экономии CPU
  
  // Лимиты на количество соединений
  connectTimeout: 45000, // 45 секунд таймаут на connect
});

// ✅ ДОБАВИТЬ middleware для ограничения количества участников в комнате:
io.use(async (socket, next) => {
  // Если это room:join - проверяем лимит участников
  const roomSlug = socket.handshake.query.roomSlug as string;
  if (roomSlug) {
    const participantCount = await RoomStateService.getParticipantCount(roomSlug);
    if (participantCount >= 6) { // Максимум 6 участников для 0.5GB RAM
      return next(new Error('Комната заполнена (максимум 6 участников)'));
    }
  }
  next();
});
```

**Решение 4 - server/src/utils/logger.ts**: Уменьшить логирование в production:

```typescript
// Добавить проверку окружения и уровня логов
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // ... остальная конфигурация
  
  // В production не логировать в файлы (используем только console)
  transports: process.env.NODE_ENV === 'production' 
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
});
```

---

### БАГ #6 (BONUS): Переключение камеры на мобильных

**Файл**: `client/src/components/room/Controls.tsx`

**Решение**: Добавить кнопку переключения камеры (только на мобильных):

```tsx
import { CameraRotate } from 'lucide-react'; // Добавить иконку

// ДОБАВИТЬ в Controls компонент:
const [isMobile, setIsMobile] = useState(false);
const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');

useEffect(() => {
  // Определяем мобильное устройство
  const checkMobile = () => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  };
  checkMobile();
}, []);

const switchCamera = async () => {
  try {
    const { localStream } = useMediaStore.getState();
    if (!localStream) return;
    
    // Останавливаем текущий video track
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
    }
    
    // Переключаем facing mode
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Получаем новый stream с новой камерой
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: newFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false, // Сохраняем старый audio track
    });
    
    // Заменяем video track в существующем stream
    const newVideoTrack = newStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];
    
    const updatedStream = new MediaStream([newVideoTrack, audioTrack]);
    useMediaStore.getState().setLocalStream(updatedStream);
    
    setCurrentFacingMode(newFacingMode);
    toast.success('Камера переключена');
    
    // TODO: Отправить новый track через WebRTC к другим участникам
    // Нужно triggernуть renegotiation в useWebRTC
  } catch (error) {
    console.error('Error switching camera:', error);
    toast.error('Не удалось переключить камеру');
  }
};

// ДОБАВИТЬ кнопку в UI (рядом с Video toggle):
{isMobile && (
  <button
    onClick={switchCamera}
    className="p-2 sm:p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
    title="Переключить камеру"
  >
    <CameraRotate className="w-5 h-5 text-white" />
  </button>
)}
```

---

## 📝 Порядок внедрения

### Этап 1: Критические баги (БАГ #3, #1)
1. ✅ БАГ #3 - Множественные подключения (server/room.handler.ts)
2. ✅ БАГ #1 - Toggle отключает (client/mediaStore.ts)

### Этап 2: UX и стабильность (БАГ #2, #4)
3. ✅ БАГ #2 - localStorage для медиа (client/mediaStore.ts, LobbyPage.tsx)
4. ✅ БАГ #4 - ICE restart 3с (client/useWebRTC.ts)

### Этап 3: Оптимизация (БАГ #5)
5. ✅ БАГ #5 - Memory optimization (server configs)

### Этап 4: Bonus (БАГ #6)
6. ✅ БАГ #6 - Mobile camera flip (client/Controls.tsx)

---

## ✅ Проверка после внедрения

1. Проверить логи сервера - не должно быть дубликатов "Participant added"
2. Проверить toggle камеры - соединение не должно разрываться
3. Проверить localStorage - предпочтения сохраняются между сессиями
4. Проверить ICE restart - срабатывает через 3 секунды
5. Проверить memory usage - не превышает 450 MB
6. (Bonus) Проверить переключение камеры на мобильном

---

## 📊 Ожидаемые результаты

- **БАГ #1**: toggleVideo/toggleAudio работают без разрывов соединения
- **БАГ #2**: Пользователь сам решает включать ли камеру/микрофон (сохраняется в localStorage)
- **БАГ #3**: Один userId = одно WebRTC соединение (нет дубликатов)
- **БАГ #4**: Стабильные соединения с ICE restart через 3с, socket reconnect handling
- **БАГ #5**: Сервер стабильно работает на 0.5GB RAM с 5+ участниками
- **БАГ #6**: На мобильных можно переключать фронтальную/заднюю камеру
