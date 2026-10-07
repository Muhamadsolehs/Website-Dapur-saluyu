const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Peringatan: SUPABASE_URL atau SUPABASE_SECRET_KEY belum diatur di .env");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;
