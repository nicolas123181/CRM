BEGIN;

ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS establecimiento_id bigint NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_eventos_establecimiento'
          AND conrelid = 'public.eventos'::regclass
    ) THEN
        ALTER TABLE public.eventos
        ADD CONSTRAINT fk_eventos_establecimiento
        FOREIGN KEY (establecimiento_id)
        REFERENCES public.establecimientos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eventos_establecimiento_id
ON public.eventos USING btree (establecimiento_id)
TABLESPACE pg_default;

COMMIT;
