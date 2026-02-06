export type JwtUser = {
  sub: number;
  email: string;
  role: 'client' | 'seller' | 'admin';
  jti?: string;
  iat?: number;
  exp?: number;
};
