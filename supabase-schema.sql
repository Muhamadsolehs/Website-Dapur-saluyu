-- ====================================================================
-- SKEMA DATABASE POSTGRESQL (SUPABASE) - DAPUR SALUYU
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query
-- ====================================================================

-- 1. Tambahkan kolom image_url ke tabel menus (jika belum ada)
ALTER TABLE public.menus ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Buat tabel site_settings untuk menyimpan informasi statis (Nomor WA, Jam Buka, Tagline, dll.)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data bawaan untuk informasi statis website
INSERT INTO public.site_settings (key, value) VALUES
('whatsapp_number', '"62895634751493"'::jsonb),
('business_name', '"Dapur Saluyu"'::jsonb),
('tagline', '"Rasa Pas, Harga Selaras"'::jsonb),
('address', '"Melayani Area Sekitar & Pengiriman Instan"'::jsonb),
('operating_hours', '"Buka Setiap Hari (Pre-order H-1)"'::jsonb),
('min_order_global', '50'::jsonb),
('hero_lead', '"Pilihan aneka jajanan pasar hangat dan gurih untuk menemani arisan, pengajian, rapat kantor, hajatan, hingga santai bersama keluarga. Dibuat segar setiap hari dengan bahan pilihan."'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Buat tabel log interaksi otomatis (Keep-Alive)
CREATE TABLE IF NOT EXISTS public.keep_alive_logs (
  id BIGSERIAL PRIMARY KEY,
  pinged_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ok',
  client_info TEXT DEFAULT 'auto-worker'
);
