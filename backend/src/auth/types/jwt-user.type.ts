export type JwtUser = {
  sub: number;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  jti?: string;
  iat?: number;
  exp?: number;
};
