export const ErrorMessages = {
  // Auth
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  EMAIL_ALREADY_EXISTS: 'Пользователь с таким email уже существует',
  UNAUTHORIZED: 'Требуется авторизация',
  TOKEN_EXPIRED: 'Токен истек',
  INVALID_TOKEN: 'Невалидный токен',

  // Users
  USER_NOT_FOUND: 'Пользователь не найден',
  USER_ALREADY_BLOCKED: 'Пользователь уже заблокирован',
  USER_NOT_BLOCKED: 'Пользователь не заблокирован',

  // Permissions
  FORBIDDEN: 'Доступ запрещен',
  ADMIN_ONLY: 'Доступно только администраторам',

  // Validation
  VALIDATION_ERROR: 'Ошибка валидации данных',
  INVALID_EMAIL: 'Невалидный email',
  WEAK_PASSWORD: 'Пароль должен содержать минимум 8 символов',
  INVALID_DATE: 'Невалидная дата',

  // Server
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',
} as const;
