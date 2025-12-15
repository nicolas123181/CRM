# 📚 Documentación del CRM Shaluqa

## Índice
1. [Información General](#información-general)
2. [Sistema de Login y Autenticación](#sistema-de-login-y-autenticación)
3. [Modelo de Datos](#modelo-de-datos)
4. [Guía Visual de Pantallas](#guía-visual-de-pantallas)
5. [Instalación y Configuración](#instalación-y-configuración)

---

## Información General

**Nombre del Proyecto:** Shaluqa CRM  
**Tecnologías:** Astro, Supabase, Tailwind CSS, TypeScript  
**Base de Datos:** PostgreSQL (Supabase)  
**Autenticación:** Supabase Auth  
**Diseño:** Responsive, Azul Marino Profesional  

---

## Sistema de Login y Autenticación

### 🔐 Arquitectura de Autenticación

El sistema de autenticación se basa en **Supabase Auth** con las siguientes capas:

#### 1. **Registro de Usuario**
- **Ubicación:** `/register`
- **Proceso:**
  1. El usuario completa el formulario con nombre completo, email y contraseña
  2. Se envía petición a Supabase Auth: `supabase.auth.signUp()`
  3. Supabase crea el usuario en la tabla `auth.users`
  4. **Trigger automático** (`handle_new_user()`) crea registro en tabla `profiles`
  5. Por defecto, nuevo usuario obtiene rol `staff`
  6. Se redirige al dashboard

**Código del Trigger:**
```sql
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
```

#### 2. **Inicio de Sesión**
- **Ubicación:** `/login`
- **Proceso:**
  1. Usuario ingresa email y contraseña
  2. Se valida con `supabase.auth.signInWithPassword()`
  3. Supabase genera JWT token y establece cookie de sesión
  4. Se obtiene perfil del usuario desde tabla `profiles`
  5. Se almacena sesión en `Astro.locals`
  6. Redirección al dashboard

**Flujo de Autenticación:**
```javascript
// En middleware.ts
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
    
  Astro.locals.user = session.user;
  Astro.locals.profile = profile;
}
```

#### 3. **Middleware de Protección**
- **Archivo:** `src/middleware.ts`
- **Funciones:**
  - Verifica sesión activa en cada petición
  - Protege rutas autenticadas
  - Inyecta datos de usuario en `Astro.locals`
  - Redirige a `/login` si no hay sesión válida

#### 4. **Sistema de Roles**
- **Admin:** Control total (CRUD de clientes, productos, licencias)
- **Staff:** Solo lectura (puede ver datos, no modificar)

**Verificación de Permisos:**
```javascript
const isAdmin = profile.role === 'admin';

// En el frontend
{isAdmin && (
  <button>Editar</button>
)}
```

#### 5. **Row Level Security (RLS)**
Todas las tablas tienen políticas RLS que validan:
- Usuarios autenticados pueden leer
- Solo administradores pueden crear/editar/eliminar

**Ejemplo de Política:**
```sql
CREATE POLICY "Admins can insert clients"
    ON clients
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));
```

#### 6. **Cierre de Sesión**
- **Endpoint:** `/api/auth/logout`
- **Proceso:**
  1. Llamada a `supabase.auth.signOut()`
  2. Eliminación de cookie de sesión
  3. Redirección a `/login`

---

## Modelo de Datos

### 📊 Diagrama de Relaciones

```
┌─────────────┐         ┌──────────────┐
│   profiles  │         │   clients    │
├─────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │
│ full_name   │         │ name         │
│ role        │         │ email        │
│ created_at  │         │ phone        │
└─────────────┘         │ company      │
                        │ created_by   │
                        └──────┬───────┘
                               │
                               │ 1:N
                               │
                        ┌──────▼────────┐
                        │   licenses    │
                        ├───────────────┤
                        │ id (PK)       │
                        │ client_id (FK)│
                        │ product_id(FK)│
                        │ type          │
                        │ start_date    │
                        │ end_date      │
                        │ status        │
                        └──────┬────────┘
                               │
                               │ N:1
                               │
                        ┌──────▼────────┐
                        │   products    │
                        ├───────────────┤
                        │ id (PK)       │
                        │ name          │
                        │ description   │
                        │ price_one     │
                        │ price_sub     │
                        └───────────────┘
```

### 📋 Tablas Detalladas

#### 1. **profiles**
Almacena información de usuarios y roles.

| Campo       | Tipo          | Descripción                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | ID del usuario (ref: auth.users)     |
| full_name   | TEXT          | Nombre completo del usuario          |
| role        | TEXT          | Rol: 'admin' o 'staff'               |
| created_at  | TIMESTAMPTZ   | Fecha de creación                    |

**Restricciones:**
- `role` debe ser 'admin' o 'staff'
- Sincronizado automáticamente con `auth.users`

#### 2. **clients**
Información de clientes del CRM.

| Campo       | Tipo          | Descripción                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | Identificador único del cliente      |
| name        | TEXT          | Nombre del cliente                   |
| email       | TEXT (UNIQUE) | Email del cliente                    |
| phone       | TEXT          | Teléfono de contacto                 |
| company     | TEXT          | Nombre de la empresa                 |
| created_by  | UUID (FK)     | Usuario que creó el registro         |
| created_at  | TIMESTAMPTZ   | Fecha de creación                    |

**Restricciones:**
- Email debe ser único
- Referencias a `profiles(id)`

#### 3. **products**
Catálogo de productos/servicios.

| Campo               | Tipo          | Descripción                          |
|---------------------|---------------|--------------------------------------|
| id                  | UUID (PK)     | Identificador único del producto     |
| name                | TEXT          | Nombre del producto                  |
| description         | TEXT          | Descripción del producto             |
| price_one_payment   | NUMERIC(10,2) | Precio pago único                    |
| price_subscription  | NUMERIC(10,2) | Precio suscripción mensual           |
| created_at          | TIMESTAMPTZ   | Fecha de creación                    |

**Restricciones:**
- Precios deben ser ≥ 0
- Ambos precios son requeridos

#### 4. **licenses**
Licencias asignadas a clientes.

| Campo       | Tipo          | Descripción                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | Identificador único de licencia      |
| client_id   | UUID (FK)     | Cliente propietario                  |
| product_id  | UUID (FK)     | Producto licenciado                  |
| type        | TEXT          | 'licencia_unica' o 'suscripcion'     |
| start_date  | DATE          | Fecha de inicio                      |
| end_date    | DATE          | Fecha de expiración (NULL si perpetua)|
| status      | TEXT          | 'activa', 'inactiva', 'pendiente_pago'|
| created_at  | TIMESTAMPTZ   | Fecha de creación                    |

**Restricciones:**
- `type` debe ser 'licencia_unica' o 'suscripcion'
- `status` debe ser 'activa', 'inactiva' o 'pendiente_pago'
- `client_id` referencia a `clients(id)` con CASCADE
- `product_id` referencia a `products(id)` con RESTRICT

### 🔗 Relaciones Clave

1. **profiles → clients** (1:N)
   - Un usuario puede crear múltiples clientes
   - `clients.created_by → profiles.id`

2. **clients → licenses** (1:N)
   - Un cliente puede tener múltiples licencias
   - `licenses.client_id → clients.id`

3. **products → licenses** (1:N)
   - Un producto puede estar en múltiples licencias
   - `licenses.product_id → products.id`

### 🔒 Políticas de Seguridad (RLS)

Todas las tablas implementan Row Level Security:

- **Lectura:** Usuarios autenticados pueden ver todos los registros
- **Escritura:** Solo administradores pueden crear/editar/eliminar
- **Excepciones:** 
  - Usuarios pueden ver y editar su propio perfil
  - Sistema valida automáticamente con función `is_admin()`

---

## Guía Visual de Pantallas

### 1. **Login** (`/login`)
**Descripción:** Pantalla de inicio de sesión.

**Elementos:**
- Logo Shaluqa CRM
- Campo Email
- Campo Contraseña
- Botón "Iniciar Sesión"
- Link "¿No tienes cuenta? Regístrate"

**Funcionalidad:**
- Validación de credenciales
- Mensaje de error si credenciales incorrectas
- Redirección a dashboard tras login exitoso

---

### 2. **Registro** (`/register`)
**Descripción:** Formulario de registro de nuevos usuarios.

**Elementos:**
- Campo Nombre Completo
- Campo Email
- Campo Contraseña
- Campo Confirmar Contraseña
- Botón "Registrarse"
- Link "¿Ya tienes cuenta? Inicia sesión"

**Funcionalidad:**
- Creación de cuenta nueva
- Validación de contraseñas coincidentes
- Asignación automática de rol 'staff'
- Redirección a dashboard

---

### 3. **Dashboard** (`/dashboard`)
**Descripción:** Panel principal con estadísticas y accesos rápidos.

**Elementos:**
- **Header:** Bienvenida personalizada con nombre de usuario
- **Tarjetas de Estadísticas:**
  - Total Clientes
  - Total Productos
  - Licencias Activas
  - Total Licencias
- **Gráfico:** Evolución de licencias (últimos 6 meses)
  - Gráfico de línea azul marino
  - Tooltips interactivos
  - Responsive
- **Tabla:** Licencias Recientes (últimas 5)
  - Cliente, Producto, Estado, Fecha
- **Acciones Rápidas (solo admin):**
  - Nuevo Cliente
  - Nuevo Producto
  - Nueva Licencia

**Funcionalidad:**
- Visualización de KPIs
- Análisis temporal de licencias
- Acceso rápido a creación de registros

---

### 4. **Clientes** (`/clients`)
**Descripción:** Gestión completa de clientes.

**Elementos:**
- Header con título y botón "Nuevo Cliente" (admin)
- **Buscador:** Filtro por ID
  - Input de búsqueda
  - Botón "Buscar"
  - Botón "Limpiar" (si hay filtro activo)
- **Grid de Tarjetas:**
  - Avatar con inicial del nombre
  - Nombre del cliente
  - Empresa
  - ID del cliente
  - Email con icono
  - Teléfono con icono
  - Fecha de registro
  - Botones Editar/Eliminar (admin)

**Funcionalidad:**
- Búsqueda por ID (coincidencia desde el inicio)
- Vista en grid responsive
- Confirmación antes de eliminar
- Validación de dependencias (no elimina si tiene licencias)

---

### 5. **Nuevo Cliente** (`/clients/new`)
**Descripción:** Formulario para crear cliente.

**Elementos:**
- Título "Nuevo Cliente"
- Campo Nombre (requerido)
- Campo Email (requerido, formato email)
- Campo Teléfono
- Campo Empresa
- Botones:
  - Guardar (primario)
  - Cancelar (secundario)

**Funcionalidad:**
- Validación en tiempo real
- Mensaje de éxito/error
- Redirección a lista tras creación

---

### 6. **Editar Cliente** (`/clients/edit/[id]`)
**Descripción:** Modificación de datos de cliente existente.

**Elementos:**
- Título "Editar Cliente"
- Formulario precargado con datos actuales
- Mismos campos que crear
- Botones Guardar/Cancelar

**Funcionalidad:**
- Carga automática de datos
- Validaciones
- Actualización en tiempo real

---

### 7. **Detalle Cliente** (`/clients/[id]`)
**Descripción:** Vista detallada de un cliente.

**Elementos:**
- Avatar grande con inicial
- Nombre y empresa destacados
- ID del cliente
- Información de contacto
- Fecha de creación
- Lista de licencias asociadas
- Botón "Editar" (admin)
- Botón "Volver"

---

### 8. **Productos** (`/products`)
**Descripción:** Catálogo de productos/servicios.

**Elementos:**
- Header con botón "Nuevo Producto" (admin)
- **Buscador:** Filtro por ID
- **Grid de Tarjetas:**
  - Icono 📦
  - Nombre del producto
  - ID del producto
  - Descripción
  - Precio Pago Anual
  - Precio Suscripción Mensual
  - Botones Editar/Eliminar (admin)

**Funcionalidad:**
- Búsqueda por ID
- Grid responsive (4 columnas en desktop)
- Confirmación de eliminación
- Validación de dependencias

---

### 9. **Nuevo Producto** (`/products/new`)
**Descripción:** Formulario de creación de producto.

**Elementos:**
- Campo Nombre (requerido)
- Campo Descripción (textarea)
- Campo Precio Pago Único (número, ≥0)
- Campo Precio Suscripción (número, ≥0)
- Botones Guardar/Cancelar

---

### 10. **Editar Producto** (`/products/edit/[id]`)
**Descripción:** Modificación de producto.

**Elementos:**
- Formulario precargado
- Mismos campos que crear
- Validaciones de precios

---

### 11. **Licencias** (`/licenses`)
**Descripción:** Gestión de licencias asignadas.

**Elementos:**
- Header con botón "Nueva Licencia" (admin)
- **Buscador:** Filtro por ID
- **Tabs de Estado:**
  - Todas
  - Activas
  - Inactivas
  - Pendientes de Pago
- **Tabla:**
  - Columnas: ID, Cliente, Producto, Tipo, Estado, Vigencia
  - Avatar de cliente
  - Badge de estado (verde/gris/amarillo)
  - Fechas de inicio/fin
  - Botones Editar/Eliminar (admin)

**Funcionalidad:**
- Búsqueda por ID
- Filtros por estado (mantiene búsqueda)
- Tabla responsive
- Estados visuales con colores

---

### 12. **Nueva Licencia** (`/licenses/new`)
**Descripción:** Asignación de licencia a cliente.

**Elementos:**
- Select Cliente (requerido)
- Select Producto (requerido)
- Radio Tipo:
  - Licencia Única (perpetua)
  - Suscripción (con fecha fin)
- Campo Fecha Inicio (requerido)
- Campo Fecha Fin (condicional)
- Select Estado:
  - Activa
  - Inactiva
  - Pendiente de Pago
- Botones Guardar/Cancelar

**Funcionalidad:**
- Selects con datos dinámicos de BD
- Fecha fin solo si es suscripción
- Validación de fechas (inicio < fin)

---

### 13. **Editar Licencia** (`/licenses/edit/[id]`)
**Descripción:** Modificación de licencia existente.

**Elementos:**
- Formulario precargado
- Mismos campos que crear
- Cliente y Producto no editables (solo vista)

---

### 14. **Navbar** (Componente Global)
**Elementos:**
- Logo Shaluqa CRM
- Links de navegación:
  - Dashboard
  - Clientes
  - Productos
  - Licencias
- Dropdown de usuario:
  - Nombre completo
  - Rol (admin/staff)
  - Botón Cerrar Sesión

**Funcionalidad:**
- Navegación global
- Indicador de página activa
- Dropdown responsive

---

## Instalación y Configuración

### Requisitos Previos
- Node.js 18+
- Cuenta de Supabase
- Git

### Pasos de Instalación

1. **Clonar repositorio:**
```bash
git clone <repo-url>
cd astro_Proyecto
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
Crear `.env` con:
```env
PUBLIC_SUPABASE_URL=tu-url-de-supabase
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=tu-resend-api-key
```

4. **Configurar Base de Datos:**
Ejecutar en Supabase SQL Editor (en orden):
- `database_complete.sql` (ver archivo adjunto)

5. **Crear primer usuario admin:**
   - Registrarse en la app
   - Ejecutar en Supabase:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@example.com';
   ```

6. **Iniciar desarrollo:**
```bash
npm run dev
```

7. **Acceder:**
```
http://localhost:4321
```

### Scripts Disponibles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build

---

## Características Destacadas

✅ **Autenticación completa** con roles y permisos  
✅ **CRUD completo** para clientes, productos y licencias  
✅ **Búsqueda avanzada** por ID en todas las secciones  
✅ **Gráficos interactivos** de evolución temporal  
✅ **Diseño responsive** para móvil y desktop  
✅ **Validaciones** en frontend y backend  
✅ **Seguridad RLS** en todas las tablas  
✅ **Sistema de notificaciones** por email  
✅ **Interfaz profesional** en azul marino corporativo  

---

## Soporte y Contacto

Para más información o soporte técnico, contactar al equipo de desarrollo de Shaluqa CRM.

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025
