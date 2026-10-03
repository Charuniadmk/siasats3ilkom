export type Role = 'ADMIN' | 'STUDENT';

export interface SessionUser {
  id: string;
  role: Role;
  username: string | null;
  nim: string | null;
  fullName: string | null;
}

export type LoginInput =
  | { role: 'ADMIN'; username: string; password: string }
  | { role: 'STUDENT'; nim: string; password: string };
