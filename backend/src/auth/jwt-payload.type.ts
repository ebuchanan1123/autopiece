export type JwtPayload = {
  sub: number;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  jti: string;
};

