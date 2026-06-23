-- Programacion diaria para anuncios popup.
-- Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.anuncio_popup_programacion (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    anuncio_popup_id bigint NOT NULL,
    fecha_mostrar date NOT NULL,
    prioridad smallint NOT NULL DEFAULT 0,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT anuncio_popup_programacion_pkey PRIMARY KEY (id),
    CONSTRAINT fk_programacion_anuncio_popup
        FOREIGN KEY (anuncio_popup_id) REFERENCES public.anuncio_popup (id) ON DELETE CASCADE,
    CONSTRAINT uq_anuncio_popup_fecha_unica UNIQUE (anuncio_popup_id, fecha_mostrar)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_anuncio_popup_programacion_fecha
ON public.anuncio_popup_programacion (fecha_mostrar, activo)
INCLUDE (anuncio_popup_id, prioridad);

ALTER TABLE public.anuncio_popup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncio_popup_programacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica anuncio popup" ON public.anuncio_popup;
CREATE POLICY "Lectura publica anuncio popup"
ON public.anuncio_popup
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Lectura publica anuncio popup programacion" ON public.anuncio_popup_programacion;
CREATE POLICY "Lectura publica anuncio popup programacion"
ON public.anuncio_popup_programacion
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins gestionan anuncio popup programacion" ON public.anuncio_popup_programacion;
CREATE POLICY "Admins gestionan anuncio popup programacion"
ON public.anuncio_popup_programacion
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
