import { Service } from '../services/service.entity';
export type UserRole = 'client' | 'freelancer' | 'admin';
export declare class User {
    id: number;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone?: string;
    failedLoginCount: number;
    lastFailedLoginAt: Date | null;
    lockUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
    listings: Service[];
}
