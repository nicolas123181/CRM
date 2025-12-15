export interface Profile {
    id: string;
    full_name: string;
    role: 'admin' | 'staff';
    created_at: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    created_at: string;
    created_by: string | null;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price_one_payment: number;
    price_subscription: number;
    created_at: string;
}

export interface License {
    id: string;
    client_id: string;
    product_id: string;
    type: 'licencia_unica' | 'suscripcion';
    start_date: string;
    end_date: string | null;
    status: 'activa' | 'inactiva' | 'pendiente_pago';
    created_at: string;
}

export interface LicenseWithDetails extends License {
    clients: Pick<Client, 'name' | 'email' | 'company'>;
    products: Pick<Product, 'name' | 'description'>;
}
