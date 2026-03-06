-- Supabase SQL Schema for Jobs Table

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    result_path TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Opcional, pero recomendado si el frontend hiciera queries directos)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Política para permitir que roles anónimos/locales puedan leer (Si decides leer desde React directo en el futuro)
CREATE POLICY "Permitir lectura publica" ON jobs FOR SELECT USING (true);
