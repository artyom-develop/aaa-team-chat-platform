import swaggerJsdoc from 'swagger-jsdoc';
import { AppConfig } from './app.config.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '1.0.0',
      description: 'RESTful API для интернет-магазина с полным функционалом управления товарами, заказами и аналитикой',
    },
    servers: [
      {
        url: `http://localhost:${AppConfig.PORT}/api`,
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Аутентификация',
        description: 'Регистрация и авторизация пользователей',
      },
      {
        name: 'Пользователи',
        description: 'Управление пользователями и их профилями',
      },
      {
        name: 'Категории',
        description: 'Управление категориями товаров',
      },
      {
        name: 'Товары',
        description: 'Управление каталогом товаров',
      },
      {
        name: 'Заказы',
        description: 'Управление заказами покупателей',
      },
      {
        name: 'Отзывы',
        description: 'Управление отзывами на товары',
      },
      {
        name: 'Аналитика',
        description: 'Статистика и аналитика продаж (только для администраторов)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT токен, полученный при авторизации',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Уникальный идентификатор пользователя',
            },
            firstName: {
              type: 'string',
              description: 'Имя',
              example: 'Иван',
            },
            lastName: {
              type: 'string',
              description: 'Фамилия',
              example: 'Иванов',
            },
            middleName: {
              type: 'string',
              nullable: true,
              description: 'Отчество',
              example: 'Иванович',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date-time',
              description: 'Дата рождения',
              example: '1990-01-15T00:00:00.000Z',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email (уникальный)',
              example: 'ivan@example.com',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'USER'],
              description: 'Роль пользователя',
              example: 'USER',
            },
            isActive: {
              type: 'boolean',
              description: 'Статус активности',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата последнего обновления',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'dateOfBirth', 'email', 'password'],
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Имя',
              example: 'Петр',
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Фамилия',
              example: 'Петров',
            },
            middleName: {
              type: 'string',
              maxLength: 50,
              description: 'Отчество (опционально)',
              example: 'Петрович',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Дата рождения',
              example: '1992-05-20',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email',
              example: 'petr@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 100,
              description: 'Пароль (минимум 8 символов)',
              example: 'MyPassword@123',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email',
              example: 'admin@example.com',
            },
            password: {
              type: 'string',
              description: 'Пароль',
              example: 'Admin@12345',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                  description: 'JWT токен для авторизации',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3OCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4ifQ.abcdefghijklmnop',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Авторизация успешна',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'clabcdef1234567890',
            },
            name: {
              type: 'string',
              example: 'iPhone 15 Pro',
            },
            slug: {
              type: 'string',
              example: 'iphone-15-pro',
            },
            description: {
              type: 'string',
              example: 'Флагманский смартфон Apple с чипом A17 Pro',
            },
            price: {
              type: 'number',
              example: 99999,
              description: 'Цена в рублях',
            },
            stock: {
              type: 'integer',
              example: 50,
              description: 'Количество на складе',
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['https://example.com/iphone15pro-1.jpg', 'https://example.com/iphone15pro-2.jpg'],
            },
            categoryId: {
              type: 'string',
              format: 'uuid',
            },
            category: {
              $ref: '#/components/schemas/Category',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['name', 'slug', 'description', 'price', 'stock', 'categoryId'],
          properties: {
            name: {
              type: 'string',
              example: 'iPhone 15 Pro Max',
            },
            slug: {
              type: 'string',
              example: 'iphone-15-pro-max',
            },
            description: {
              type: 'string',
              example: 'Самый мощный iPhone с титановым корпусом',
            },
            price: {
              type: 'number',
              example: 119999,
            },
            stock: {
              type: 'integer',
              example: 30,
            },
            categoryId: {
              type: 'string',
              description: 'ID категории (можно получить из GET /categories)',
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['https://example.com/image1.jpg'],
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Электроника',
            },
            slug: {
              type: 'string',
              example: 'electronics',
            },
            description: {
              type: 'string',
              example: 'Электронные устройства и гаджеты',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateCategoryRequest: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: {
              type: 'string',
              example: 'Планшеты',
            },
            slug: {
              type: 'string',
              example: 'tablets',
            },
            description: {
              type: 'string',
              example: 'Планшетные компьютеры',
            },
            parentId: {
              type: 'string',
              description: 'ID родительской категории (опционально)',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              example: 'PROCESSING',
            },
            totalPrice: {
              type: 'number',
              example: 299999,
            },
            orderItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem',
              },
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            orderId: {
              type: 'string',
              format: 'uuid',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            quantity: {
              type: 'integer',
              example: 1,
            },
            price: {
              type: 'number',
              example: 299999,
              description: 'Цена на момент заказа',
            },
            product: {
              $ref: '#/components/schemas/Product',
            },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: {
                    type: 'string',
                    description: 'ID товара (можно получить из GET /products)',
                  },
                  quantity: {
                    type: 'integer',
                    minimum: 1,
                    example: 2,
                  },
                },
              },
              example: [
                {
                  productId: 'clabcdef1234567890',
                  quantity: 1,
                },
              ],
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5,
            },
            comment: {
              type: 'string',
              example: 'Отличный смартфон! Камера просто невероятная.',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            product: {
              $ref: '#/components/schemas/Product',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateReviewRequest: {
          type: 'object',
          required: ['productId', 'rating', 'comment'],
          properties: {
            productId: {
              type: 'string',
              description: 'ID товара',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5,
            },
            comment: {
              type: 'string',
              example: 'Отличный товар, всем рекомендую!',
            },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalUsers: {
              type: 'integer',
              example: 150,
            },
            totalProducts: {
              type: 'integer',
              example: 245,
            },
            totalOrders: {
              type: 'integer',
              example: 89,
            },
            totalRevenue: {
              type: 'number',
              example: 1234567.89,
            },
            pendingOrders: {
              type: 'integer',
              example: 12,
            },
            completedOrders: {
              type: 'integer',
              example: 67,
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        UsersListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1,
                },
                limit: {
                  type: 'number',
                  example: 10,
                },
                total: {
                  type: 'number',
                  example: 50,
                },
                totalPages: {
                  type: 'number',
                  example: 5,
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Ошибка валидации данных',
            },
            error: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'ValidationError',
                },
                message: {
                  type: 'string',
                  example: 'Невалидные данные',
                },
                details: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
