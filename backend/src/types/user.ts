export type User = {
  id: string;
  name: string;
  avatar: string;
  phone?: string;
  firstLoginAt: number;
  lastLoginAt: number;
  points: number;
};
