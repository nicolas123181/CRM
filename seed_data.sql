-- ============================================
-- Seed Data for Mini-CRM
-- ============================================
-- This script provides sample data for testing
-- OPTIONAL: Run this after schema.sql and rls_policies.sql

-- ============================================
-- IMPORTANT NOTE
-- ============================================
-- To create the first admin user, you need to:
-- 1. Sign up a user through Supabase Auth (using the app or Supabase dashboard)
-- 2. Run the following query to promote them to admin:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
--
-- Or update by user ID:
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';

-- ============================================
-- SAMPLE PRODUCTS
-- ============================================

INSERT INTO products (name, description, price_one_payment, price_subscription) VALUES
('SoftControl Pro', 'Suite completa de gestión empresarial con módulos de facturación, inventario y CRM', 2999.99, 99.99),
('SoftControl Basic', 'Versión básica con funcionalidades esenciales de gestión', 999.99, 39.99),
('Módulo Contabilidad', 'Módulo adicional para gestión contable avanzada', 499.99, 19.99),
('Módulo Inventario Plus', 'Sistema avanzado de control de stock y almacenes', 799.99, 29.99),
('SoftControl Enterprise', 'Solución empresarial completa para grandes organizaciones', 9999.99, 299.99);

-- ============================================
-- SAMPLE CLIENTS
-- ============================================
-- Note: created_by will need to be updated with actual user IDs after admin user creation

INSERT INTO clients (name, email, phone, company, created_by) VALUES
('María García López', 'maria.garcia@techinnovate.com', '+34 91 234 5678', 'TechInnovate SL', NULL),
('Carlos Martínez Ruiz', 'carlos.martinez@digitalsolutions.es', '+34 93 456 7890', 'Digital Solutions España', NULL),
('Ana Rodríguez Sánchez', 'ana.rodriguez@consultorabc.com', '+34 95 678 9012', 'Consultora BC', NULL),
('José López Fernández', 'jose.lopez@comercialxyz.es', '+34 96 890 1234', 'Comercial XYZ', NULL),
('Laura Pérez Torres', 'laura.perez@innovatech.com', '+34 91 012 3456', 'InnovaTech Solutions', NULL),
('Miguel Sánchez Castro', 'miguel.sanchez@grupoacme.es', '+34 93 234 5678', 'Grupo ACME', NULL),
('Isabel Fernández Ruiz', 'isabel.fernandez@smartbusiness.com', '+34 95 456 7890', 'Smart Business Ltd', NULL),
('David Torres Moreno', 'david.torres@alphacorp.es', '+34 96 678 9012', 'Alpha Corporation', NULL);

-- ============================================
-- SAMPLE LICENSES
-- ============================================
-- These will link clients to products with different statuses and types

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

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
LIMIT 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check products count
-- SELECT COUNT(*) as total_products FROM products;

-- Check clients count
-- SELECT COUNT(*) as total_clients FROM clients;

-- Check licenses count
-- SELECT COUNT(*) as total_licenses FROM licenses;

-- View licenses with client and product details
-- SELECT 
--     l.id,
--     c.name as client_name,
--     c.company,
--     p.name as product_name,
--     l.type,
--     l.start_date,
--     l.end_date,
--     l.status
-- FROM licenses l
-- JOIN clients c ON l.client_id = c.id
-- JOIN products p ON l.product_id = p.id
-- ORDER BY l.created_at DESC;
