export type JwtPayload = {
  sub: number;
  email: string;
  role: 'client' | 'seller' | 'admin';
  jti: string;
};

