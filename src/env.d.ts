/// <reference path="../.astro/types.d.ts" />

// Simple user type for local authentication
interface LocalUser {
    id: string;
    name: string;
}

interface LocalProfile {
    id: string;
    full_name: string;
    role: 'admin' | 'staff';
    created_at?: string;
}

declare namespace App {
    interface Locals {
        user: LocalUser;
        profile: LocalProfile;
    }
}
