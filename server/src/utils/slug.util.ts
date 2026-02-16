import { v4 as uuidv4 } from 'uuid';

/**
 * Генерация уникального slug для комнаты в формате: abc-defg-hijk
 * Использует части UUID для создания читаемого ID
 */
export class SlugUtil {
  /**
   * Генерировать slug в формате abc-defg-hijk
   */
  static generateRoomSlug(): string {
    const uuid = uuidv4().replace(/-/g, '');
    
    // Берем первые 12 символов и разбиваем на 3 части по 4 символа
    const part1 = uuid.substring(0, 4);
    const part2 = uuid.substring(4, 8);
    const part3 = uuid.substring(8, 12);
    
    return `${part1}-${part2}-${part3}`;
  }

  /**
   * Валидация формата slug
   */
  static isValidSlug(slug: string): boolean {
    // Формат: 4 символа - 4 символа - 4 символа
    const slugRegex = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
    return slugRegex.test(slug);
  }

  /**
   * Генерировать короткий readable ID (для отображения пользователю)
   */
  static generateShortId(length: number = 6): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Нормализация slug (приведение к нижнему регистру)
   */
  static normalizeSlug(slug: string): string {
    return slug.toLowerCase().trim();
  }
}
