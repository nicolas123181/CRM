// Simple local authentication without Supabase auth
// Credentials: shaluqa / 123123

const VALID_USER = 'shaluqa';
const VALID_PASSWORD = '123123';

// In-memory session state (for server-side)
let isAuthenticated = false;

export interface SimpleUser {
    id: string;
    name: string;
}

export interface SimpleProfile {
    id: string;
    full_name: string;
    role: string;
}

export function signIn(username: string, password: string): { success: boolean; error?: string } {
    if (username === VALID_USER && password === VALID_PASSWORD) {
        isAuthenticated = true;
        return { success: true };
    }
    return { success: false, error: 'Credenciales incorrectas' };
}

export function signOut(): void {
    isAuthenticated = false;
}

export function getSession(): { session: { user: SimpleUser } | null } {
    if (isAuthenticated) {
        return {
            session: {
                user: {
                    id: 'local-user',
                    name: 'Shaluqa Admin'
                }
            }
        };
    }
    return { session: null };
}

export function getProfile(_userId: string): { profile: SimpleProfile | null; error: null } {
    return {
        profile: {
            id: 'local-user',
            full_name: 'Shaluqa Admin',
            role: 'admin'
        },
        error: null
    };
}

// Check authentication status
export function isLoggedIn(): boolean {
    return isAuthenticated;
}

// Set authentication status (for cookie-based persistence)
export function setAuthenticated(value: boolean): void {
    isAuthenticated = value;
}
