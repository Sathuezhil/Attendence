import { Role } from '@prisma/client';

export interface PublicAdmin {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
