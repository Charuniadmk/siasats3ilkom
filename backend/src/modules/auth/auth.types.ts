export type Role = 'ADMIN' | 'STUDENT';

export interface SessionUser {
  id: string;
  role: Role;
  username: string | null;
  nim: string | null;
}

export interface AuthClaims {
  userId: string;
  role: Role;
  sessionVersion: number;
}
