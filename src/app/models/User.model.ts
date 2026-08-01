import { Role } from "./Role.enum";

export interface User{
    id: number|null;
    name: string;
    email: string;
    password:string|null;
    role: string;
    phone?: string | null;
    shop?: { id: number; name: string } | null;
    created_at?: string | null;
    createdAt:Date | null;
    emailVerifiedAt:Date | null;

}