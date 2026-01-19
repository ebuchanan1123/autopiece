import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
export declare class UsersService {
    private readonly usersRepository;
    private readonly MAX_FAILED_LOGINS;
    private readonly LOCK_MINUTES;
    constructor(usersRepository: Repository<User>);
    findAll(): Promise<User[]>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    createUser(params: {
        email: string;
        passwordHash: string;
        role: UserRole;
        phone?: string;
    }): Promise<User>;
    isLocked(user: User): boolean;
    resetLoginFailures(userId: number): Promise<void>;
    recordFailedLogin(userId: number): Promise<void>;
    updatePasswordHash(userId: number, passwordHash: string): Promise<void>;
    setPasswordHashIfMatches(userId: number, oldHash: string, newHash: string): Promise<boolean>;
}
