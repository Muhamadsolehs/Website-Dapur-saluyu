-- ====================================================================
-- SKRIP SETUP DATABASE LENGKAP - DAPUR SALUYU (POSTGRESQL SUPABASE)
-- Jalankan skrip ini sekali di: 
-- Supabase Dashboard -> Project Anda -> SQL Editor -> New Query -> Run
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABEL: MENUS (Katalog Menu Jajanan)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menus (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  variant VARCHAR(255),
  category VARCHAR(100) DEFAULT 'Tradisional',
  price INTEGER DEFAULT 1000,
  min_quantity INTEGER DEFAULT 50,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambahkan image_url jika tabel sudah ada dari sebelumnya
ALTER TABLE public.menus ADD COLUMN IF NOT EXISTS image_url TEXT;

-- --------------------------------------------------------------------
-- 2. TABEL: SITE_SETTINGS (Pengaturan Informasi Statis Website)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. TABEL: KEEP_ALIVE_LOGS (Log Pencegah Pause 7 Hari Supabase)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.keep_alive_logs (
  id BIGSERIAL PRIMARY KEY,
  pinged_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'ok',
  client_info VARCHAR(100) DEFAULT 'auto-worker'
);

-- --------------------------------------------------------------------
-- 4. INSERT DATA BAWAAN: 15 MENU JAJANAN DAPUR SALUYU
-- --------------------------------------------------------------------
INSERT INTO public.menus (name, variant, category, price, min_quantity, description, is_available)
VALUES
  ('Pisang Aroma', NULL, 'Manis', 1000, 50, 'Pisang manis dibalut kulit krispi harum dengan karamelisasi pas.', true),
  ('Donat', 'Aneka rasa', 'Manis', 1000, 50, 'Donat empuk dengan tekstur lembut dan aneka varian taburan manis.', true),
  ('Bapau', NULL, 'Gurih', 1000, 50, 'Bakpau hangat dengan adonan lembut dan isian nikmat yang mantap.', true),
  ('Karoket', NULL, 'Gurih', 1000, 50, 'Gorengan kroket gurih dengan isian bumbu sedap, favorit segala usia.', true),
  ('Cireng Isi', NULL, 'Gurih', 1000, 50, 'Tekstur kenyal renyah di luar dengan isian bumbu gurih kaya rasa.', true),
  ('Puding', NULL, 'Manis', 1000, 50, 'Puding manis dengan tekstur sejuk dan lembut, cocok sebagai penutup.', true),
  ('Bakwan', NULL, 'Gurih', 1000, 50, 'Bakwan renyah keemasan dengan racikan sayuran segar dan bumbu gurih.', true),
  ('Tahu Isi', NULL, 'Gurih', 1000, 50, 'Tahu pong renyah dengan isian sayur berbumbu gurih gurih sedap.', true),
  ('Bola-Bola Isi', 'Manis', 'Manis', 1000, 50, 'Bola goreng renyah dengan isian manis lembut yang meleleh di mulut.', true),
  ('Bola-Bola Isi', 'Asin', 'Gurih', 1000, 50, 'Bola goreng hangat dengan isian gurih sedap bercita rasa otentik.', true),
  ('Pisang Goreng', NULL, 'Tradisional', 1000, 50, 'Pisang pilihan digoreng krispi dengan rasa legit alami khas dapur.', true),
  ('Gegetuk', NULL, 'Tradisional', 1000, 50, 'Olahan singkong manis legit bertabur kelapa gurih, jajanan nostalgia.', true),
  ('Combro', NULL, 'Tradisional', 1000, 50, 'Parutan singkong krispi berpadu oncom berbumbu pedas gurih mantap.', true),
  ('Misro', NULL, 'Tradisional', 1000, 50, 'Singkong renyah dengan lelehan gula merah asli yang manis legit di tengah.', true),
  ('Dadar Gulung', NULL, 'Tradisional', 1000, 50, 'Kulit pandan lembut dengan isian unti kelapa gula merah legit wangi.', true)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------
-- 5. INSERT DATA BAWAAN: INFORMASI STATIS
-- --------------------------------------------------------------------
INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp_number', '"62895634751493"'::jsonb),
  ('business_name', '"Dapur Saluyu"'::jsonb),
  ('tagline', '"Rasa Pas, Harga Selaras"'::jsonb),
  ('address', '"Melayani Area Sekitar & Pengiriman Instan"'::jsonb),
  ('operating_hours', '"Buka Setiap Hari (Pre-order H-1)"'::jsonb),
  ('min_order_global', '50'::jsonb),
  ('hero_lead', '"Pilihan aneka jajanan pasar hangat dan gurih untuk menemani arisan, pengajian, rapat kantor, hajatan, hingga santai bersama keluarga. Dibuat segar setiap hari dengan bahan pilihan."'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- --------------------------------------------------------------------
-- 6. PENGATURAN HAK AKSES (ROW LEVEL SECURITY - RLS)
-- Memungkinkan publik membaca menu, dan admin mengelola data
-- --------------------------------------------------------------------
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keep_alive_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan publik membaca menu dan settings (GET)
DROP POLICY IF EXISTS "Public can view menus" ON public.menus;
CREATE POLICY "Public can view menus" ON public.menus FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view site_settings" ON public.site_settings;
CREATE POLICY "Public can view site_settings" ON public.site_settings FOR SELECT USING (true);

-- Izinkan service_role (backend server) melakukan operasi CRUD penuh
DROP POLICY IF EXISTS "Service role full access menus" ON public.menus;
CREATE POLICY "Service role full access menus" ON public.menus FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access site_settings" ON public.site_settings;
CREATE POLICY "Service role full access site_settings" ON public.site_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access keep_alive_logs" ON public.keep_alive_logs;
CREATE POLICY "Service role full access keep_alive_logs" ON public.keep_alive_logs FOR ALL USING (true);
