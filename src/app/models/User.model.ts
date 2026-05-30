import { Role } from "./Role.enum";

export interface User{
    id: number|null;
    name: string;
    email: string;
    password:string|null;
    role: string;
    createdAt:Date | null;
    emailVerifiedAt:Date | null;
    
}