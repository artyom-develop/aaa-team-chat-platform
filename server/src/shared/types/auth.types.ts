export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface IRegisterData {
  displayName: string;
  email: string;
  password: string;
}
