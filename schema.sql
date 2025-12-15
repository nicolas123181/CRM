-- ============================================
-- Mini-CRM Database Schema for SoftControl
-- ============================================
-- This script creates all necessary tables for the CRM system
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile information and roles
-- Automatically synced with Supabase Auth users

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- CLIENTS TABLE
-- ============================================
-- Stores customer/client information

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_by ON clients(created_by);
CREATE INDEX idx_clients_name ON clients(name);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
-- Stores product catalog with pricing information

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price_one_payment NUMERIC(10, 2) NOT NULL CHECK (price_one_payment >= 0),
    price_subscription NUMERIC(10, 2) NOT NULL CHECK (price_subscription >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for product name searches
CREATE INDEX idx_products_name ON products(name);

-- ============================================
-- LICENSES TABLE
-- ============================================
-- Stores license assignments linking clients to products

CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('licencia_unica', 'suscripcion')),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for perpetual licenses
    status TEXT NOT NULL CHECK (status IN ('activa', 'inactiva', 'pendiente_pago')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_licenses_client_id ON licenses(client_id);
CREATE INDEX idx_licenses_product_id ON licenses(product_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_type ON licenses(type);
CREATE INDEX idx_licenses_dates ON licenses(start_date, end_date);

-- ============================================
-- TRIGGER FUNCTION: Auto-create profile on user signup
-- ============================================
-- This function automatically creates a profile when a user signs up
-- By default, new users get 'staff' role

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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- HELPER FUNCTION: Check if user is admin
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
-- COMMENTS
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE clients IS 'Customer/client information';
COMMENT ON TABLE products IS 'Product catalog with pricing';
COMMENT ON TABLE licenses IS 'License assignments linking clients to products';

COMMENT ON COLUMN licenses.type IS 'License type: licencia_unica (one-time) or suscripcion (subscription)';
COMMENT ON COLUMN licenses.status IS 'License status: activa, inactiva, or pendiente_pago';
COMMENT ON COLUMN licenses.end_date IS 'License expiration date (NULL for perpetual licenses)';
