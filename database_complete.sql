-- ============================================
-- SHALUQA CRM - BASE DE DATOS COMPLETA
-- ============================================
-- Este archivo contiene todos los scripts SQL necesarios para configurar
-- completamente la base de datos del CRM en Supabase
-- 
-- ORDEN DE EJECUCIÓN:
-- 1. Schema (tablas y funciones)
-- 2. RLS Policies (seguridad)
-- 3. Seed Data (datos de prueba - OPCIONAL)
-- ============================================

-- ============================================
-- PARTE 1: SCHEMA - Creación de Tablas
-- ============================================
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: profiles
-- ============================================
-- Almacena información de usuarios y roles
-- Sincronizada automáticamente con auth.users

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas por rol
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- TABLA: clients
-- ============================================
-- Almacena información de clientes

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_by ON clients(created_by);
CREATE INDEX idx_clients_name ON clients(name);

-- ============================================
-- TABLA: products
-- ============================================
-- Catálogo de productos y servicios

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price_one_payment NUMERIC(10, 2) NOT NULL CHECK (price_one_payment >= 0),
    price_subscription NUMERIC(10, 2) NOT NULL CHECK (price_subscription >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por nombre
CREATE INDEX idx_products_name ON products(name);

-- ============================================
-- TABLA: licenses
-- ============================================
-- Licencias asignadas a clientes

CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('licencia_unica', 'suscripcion')),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL para licencias perpetuas
    status TEXT NOT NULL CHECK (status IN ('activa', 'inactiva', 'pendiente_pago')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_licenses_client_id ON licenses(client_id);
CREATE INDEX idx_licenses_product_id ON licenses(product_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_type ON licenses(type);
CREATE INDEX idx_licenses_dates ON licenses(start_date, end_date);

-- ============================================
-- FUNCIÓN: Auto-crear perfil al registrarse
-- ============================================
-- Se ejecuta automáticamente cuando un usuario se registra

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCIÓN: Verificar si usuario es admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE profiles IS 'Perfiles de usuario con control de roles';
COMMENT ON TABLE clients IS 'Información de clientes del CRM';
COMMENT ON TABLE products IS 'Catálogo de productos y servicios';
COMMENT ON TABLE licenses IS 'Licencias asignadas vinculando clientes con productos';

COMMENT ON COLUMN licenses.type IS 'Tipo: licencia_unica (pago único) o suscripcion (mensual)';
COMMENT ON COLUMN licenses.status IS 'Estado: activa, inactiva, o pendiente_pago';
COMMENT ON COLUMN licenses.end_date IS 'Fecha de expiración (NULL para licencias perpetuas)';

-- ============================================
-- PARTE 2: ROW LEVEL SECURITY (RLS)
-- ============================================
-- Políticas de seguridad para control de acceso

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: profiles
-- ============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON profiles
    FOR SELECT
    USING (is_admin(auth.uid()));

-- Solo admins pueden insertar perfiles
CREATE POLICY "Admins can insert profiles"
    ON profiles
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "Admins can update any profile"
    ON profiles
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden eliminar perfiles
CREATE POLICY "Admins can delete profiles"
    ON profiles
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- POLÍTICAS: clients
-- ============================================

-- Usuarios autenticados pueden ver clientes
CREATE POLICY "Authenticated users can view clients"
    ON clients
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Solo admins pueden insertar clientes
CREATE POLICY "Admins can insert clients"
    ON clients
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden actualizar clientes
CREATE POLICY "Admins can update clients"
    ON clients
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden eliminar clientes
CREATE POLICY "Admins can delete clients"
    ON clients
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- POLÍTICAS: products
-- ============================================

-- Usuarios autenticados pueden ver productos
CREATE POLICY "Authenticated users can view products"
    ON products
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Solo admins pueden insertar productos
CREATE POLICY "Admins can insert products"
    ON products
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden actualizar productos
CREATE POLICY "Admins can update products"
    ON products
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden eliminar productos
CREATE POLICY "Admins can delete products"
    ON products
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- POLÍTICAS: licenses
-- ============================================

-- Usuarios autenticados pueden ver licencias
CREATE POLICY "Authenticated users can view licenses"
    ON licenses
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Solo admins pueden insertar licencias
CREATE POLICY "Admins can insert licenses"
    ON licenses
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden actualizar licencias
CREATE POLICY "Admins can update licenses"
    ON licenses
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Solo admins pueden eliminar licencias
CREATE POLICY "Admins can delete licenses"
    ON licenses
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- PARTE 3: SEED DATA (OPCIONAL)
-- ============================================
-- Datos de prueba para desarrollo y testing
-- NOTA: Ejecutar solo si deseas datos de ejemplo

-- ============================================
-- PRODUCTOS DE EJEMPLO
-- ============================================

INSERT INTO products (name, description, price_one_payment, price_subscription) VALUES
('SoftControl Pro', 'Suite completa de gestión empresarial con módulos de facturación, inventario y CRM', 2999.99, 99.99),
('SoftControl Basic', 'Versión básica con funcionalidades esenciales de gestión', 999.99, 39.99),
('Módulo Contabilidad', 'Módulo adicional para gestión contable avanzada', 499.99, 19.99),
('Módulo Inventario Plus', 'Sistema avanzado de control de stock y almacenes', 799.99, 29.99),
('SoftControl Enterprise', 'Solución empresarial completa para grandes organizaciones', 9999.99, 299.99)
ON CONFLICT DO NOTHING;

-- ============================================
-- CLIENTES DE EJEMPLO
-- ============================================

INSERT INTO clients (name, email, phone, company, created_by) VALUES
('María García López', 'maria.garcia@techinnovate.com', '+34 91 234 5678', 'TechInnovate SL', NULL),
('Carlos Martínez Ruiz', 'carlos.martinez@digitalsolutions.es', '+34 93 456 7890', 'Digital Solutions España', NULL),
('Ana Rodríguez Sánchez', 'ana.rodriguez@consultorabc.com', '+34 95 678 9012', 'Consultora BC', NULL),
('José López Fernández', 'jose.lopez@comercialxyz.es', '+34 96 890 1234', 'Comercial XYZ', NULL),
('Laura Pérez Torres', 'laura.perez@innovatech.com', '+34 91 012 3456', 'InnovaTech Solutions', NULL),
('Miguel Sánchez Castro', 'miguel.sanchez@grupoacme.es', '+34 93 234 5678', 'Grupo ACME', NULL),
('Isabel Fernández Ruiz', 'isabel.fernandez@smartbusiness.com', '+34 95 456 7890', 'Smart Business Ltd', NULL),
('David Torres Moreno', 'david.torres@alphacorp.es', '+34 96 678 9012', 'Alpha Corporation', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- LICENCIAS DE EJEMPLO
-- ============================================

-- Licencia única activa
INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id as client_id,
    p.id as product_id,
    'licencia_unica' as type,
    '2024-01-15'::date as start_date,
    NULL as end_date,
    'activa' as status
FROM clients c, products p
WHERE c.email = 'maria.garcia@techinnovate.com'
AND p.name = 'SoftControl Pro'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Suscripción activa
INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'suscripcion',
    '2024-06-01'::date,
    '2025-06-01'::date,
    'activa'
FROM clients c, products p
WHERE c.email = 'carlos.martinez@digitalsolutions.es'
AND p.name = 'SoftControl Basic'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Suscripción inactiva (expirada)
INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'suscripcion',
    '2024-03-15'::date,
    '2024-09-15'::date,
    'inactiva'
FROM clients c, products p
WHERE c.email = 'ana.rodriguez@consultorabc.com'
AND p.name = 'Módulo Contabilidad'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Licencia pendiente de pago
INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'suscripcion',
    '2024-11-01'::date,
    '2025-11-01'::date,
    'pendiente_pago'
FROM clients c, products p
WHERE c.email = 'jose.lopez@comercialxyz.es'
AND p.name = 'SoftControl Enterprise'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Más licencias de ejemplo
INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'licencia_unica',
    '2023-08-20'::date,
    NULL,
    'activa'
FROM clients c, products p
WHERE c.email = 'laura.perez@innovatech.com'
AND p.name = 'SoftControl Pro'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'suscripcion',
    '2024-10-01'::date,
    '2025-10-01'::date,
    'activa'
FROM clients c, products p
WHERE c.email = 'miguel.sanchez@grupoacme.es'
AND p.name = 'Módulo Inventario Plus'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'suscripcion',
    '2024-05-15'::date,
    '2024-11-15'::date,
    'inactiva'
FROM clients c, products p
WHERE c.email = 'isabel.fernandez@smartbusiness.com'
AND p.name = 'SoftControl Basic'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO licenses (client_id, product_id, type, start_date, end_date, status)
SELECT 
    c.id,
    p.id,
    'licencia_unica',
    '2024-02-10'::date,
    NULL,
    'activa'
FROM clients c, products p
WHERE c.email = 'david.torres@alphacorp.es'
AND p.name = 'SoftControl Enterprise'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar estas consultas para verificar la instalación

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- Ver todas las políticas
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Contar registros
-- SELECT 
--     (SELECT COUNT(*) FROM products) as productos,
--     (SELECT COUNT(*) FROM clients) as clientes,
--     (SELECT COUNT(*) FROM licenses) as licencias;

-- Ver licencias con detalles
-- SELECT 
--     l.id,
--     c.name as cliente,
--     c.company,
--     p.name as producto,
--     l.type as tipo,
--     l.start_date as inicio,
--     l.end_date as fin,
--     l.status as estado
-- FROM licenses l
-- JOIN clients c ON l.client_id = c.id
-- JOIN products p ON l.product_id = p.id
-- ORDER BY l.created_at DESC;

-- ============================================
-- CREAR PRIMER USUARIO ADMIN
-- ============================================
-- IMPORTANTE: Después de ejecutar este script:
-- 
-- 1. Registra un usuario en la aplicación
-- 2. Obtén el email o ID del usuario
-- 3. Ejecuta UNA de estas consultas en Supabase:
--
-- Por email:
-- UPDATE profiles SET role = 'admin' WHERE id = (
--     SELECT id FROM auth.users WHERE email = 'tu-email@example.com'
-- );
--
-- O por ID directo:
-- UPDATE profiles SET role = 'admin' WHERE id = 'tu-uuid-aqui';
--
-- ============================================

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- La base de datos está lista para usar
-- Recuerda crear tu primer usuario admin
-- ============================================
