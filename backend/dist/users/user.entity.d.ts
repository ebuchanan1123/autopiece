export declare class User {
    id: number;
    email: string;
    passwordHash: string;
    role: 'client' | 'vendeur' | 'admin';
}
