export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    name: string;
    message: string;
    details?: unknown;
  };
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
