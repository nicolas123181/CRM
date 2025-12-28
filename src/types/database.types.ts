export interface Profile {
    id: string;
    full_name: string;
    role: 'admin' | 'staff';
    created_at?: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    created_at: string;
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

export interface Categoria {
    id: number;
    nombre: string;
}

export interface Establecimiento {
    id: number;
    nombre: string;
    descripcion: string | null;
    latitud: number;
    longitud: number;
    imagen_url: string | null;
    categoria_id: number;
    created: string;
    recomendado: number;
    horario: string | null;
    telefono: number | null;
    reservas_url: string | null;
    mensaje_promocional: string | null;
    client_id: string | null;
}

export interface EstablecimientoWithDetails extends Establecimiento {
    categorias: Pick<Categoria, 'nombre'>;
    clients: Pick<Client, 'name' | 'email' | 'company'> | null;
}

export interface Parque {
    id: number;
    nombre: string | null;
    imagen_url: string | null;
    latitud: number | null;
    longitud: number | null;
}

export interface Deporte {
    id: number;
    nombre: string | null;
    descripcion: string | null;
    imagen_url: string | null;
    latitud: number | null;
    longitud: number | null;
}

export interface Monumento {
    id: number;
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
    audio_url: string | null;
    latitud: number;
    longitud: number;
    orden: number | null;
    horario: string | null;
}

export interface EstablecimientoFoto {
    id: number;
    establecimiento_id: number;
    imagen_url: string;
    orden: number | null;
    es_principal: boolean | null;
    descripcion: string | null;
    created_at: string | null;
}
