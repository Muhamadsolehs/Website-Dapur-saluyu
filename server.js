require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend website & static assets
app.use(express.static(path.join(__dirname)));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Setup Multer for in-memory file uploads (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan."));
    }
  },
});

// File fallback path for local mappings
const SETTINGS_FILE = path.join(__dirname, "site-settings.json");
const MENU_IMAGES_FILE = path.join(__dirname, "menu-images-map.json");

// Default initial settings
const DEFAULT_SETTINGS = {
  whatsapp_number: "62895634751493",
  business_name: "Dapur Saluyu",
  tagline: "Rasa Pas, Harga Selaras",
  address: "Melayani Area Sekitar & Pengiriman Instan",
  operating_hours: "Buka Setiap Hari (Pre-order H-1)",
  min_order_global: 50,
  hero_lead: "Pilihan aneka jajanan pasar hangat dan gurih untuk menemani arisan, pengajian, rapat kantor, hajatan, hingga santai bersama keluarga. Dibuat segar setiap hari dengan bahan pilihan.",
};

// Helper: Read/Write Local Settings Fallback
function getLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Gagal membaca settings.json lokal:", e);
  }
  return DEFAULT_SETTINGS;
}

function saveLocalSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  } catch (e) {
    console.error("Gagal menyimpan settings.json lokal:", e);
  }
}

// Helper: Read/Write Local Menu Images Mapping
function getLocalImagesMap() {
  try {
    if (fs.existsSync(MENU_IMAGES_FILE)) {
      return JSON.parse(fs.readFileSync(MENU_IMAGES_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Gagal membaca menu-images-map.json:", e);
  }
  // Default mappings for the 15 initial items
  return {
    "Pisang Aroma": "assets/snack-goreng.jpg",
    "Donat": "assets/bola-bola.jpg",
    "Bapau": "assets/bapau.jpg",
    "Karoket": "assets/gorengan.jpg",
    "Cireng Isi": "assets/cireng-isi.jpg",
    "Puding": "assets/puding.jpg",
    "Bakwan": "assets/gorengan.jpg",
    "Tahu Isi": "assets/cireng-isi.jpg",
    "Bola-Bola Isi (Manis)": "assets/bola-bola.jpg",
    "Bola-Bola Isi (Asin)": "assets/bola-bola.jpg",
    "Pisang Goreng": "assets/snack-goreng.jpg",
    "Gegetuk": "assets/puding.jpg",
    "Combro": "assets/gorengan.jpg",
    "Misro": "assets/snack-goreng.jpg",
    "Dadar Gulung": "assets/puding.jpg",
  };
}

function saveLocalImagesMap(map) {
  try {
    fs.writeFileSync(MENU_IMAGES_FILE, JSON.stringify(map, null, 2), "utf8");
  } catch (e) {
    console.error("Gagal menyimpan menu-images-map.json:", e);
  }
}

// ============================================================================
// SINGLE USER AUTHENTICATION
// ============================================================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "dapursaluyu2026!";
const JWT_SECRET = process.env.JWT_SECRET || "dapur_saluyu_secret_2026";

function generateAdminToken(username) {
  const timestamp = Date.now();
  const raw = `${username}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET).update(raw).digest("hex");
  return Buffer.from(`${raw}:${hmac}`).toString("base64");
}

function verifyAdminToken(token) {
  try {
    if (!token) return false;
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [user, ts, hmac] = decoded.split(":");
    if (!user || !ts || !hmac) return false;

    // Token expires in 14 days
    if (Date.now() - parseInt(ts, 10) > 14 * 24 * 60 * 60 * 1000) return false;

    const expectedHmac = crypto.createHmac("sha256", JWT_SECRET).update(`${user}:${ts}`).digest("hex");
    return user === ADMIN_USERNAME && hmac === expectedHmac;
  } catch (e) {
    return false;
  }
}

// Auth Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers["x-admin-token"];
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (authHeader) {
    token = authHeader;
  }

  if (!verifyAdminToken(token)) {
    return res.status(401).json({
      success: false,
      error: "Akses ditolak. Silakan login sebagai admin terlebih dahulu.",
    });
  }

  next();
}

// ============================================================================
// AUTOMATED SUPABASE KEEP-ALIVE WORKER (PREVENTS 7-DAY INACTIVITY PAUSE)
// ============================================================================
const keepAliveState = {
  lastPing: null,
  totalPings: 0,
  lastLatencyMs: null,
  status: "idle",
  lastError: null,
};

async function executeKeepAlivePing(source = "Automated Cron") {
  const start = Date.now();
  try {
    // 1. Run a lightweight SELECT query against menus to exercise PostgreSQL
    const { data, error } = await supabase.from("menus").select("id").limit(1);

    if (error) {
      throw error;
    }

    // 2. Try inserting heartbeat to keep_alive_logs if table exists (optional)
    try {
      await supabase.from("keep_alive_logs").insert([
        { client_info: source, status: "ok" },
      ]);
    } catch (_) {
      // Ignore if keep_alive_logs table isn't created yet
    }

    const latency = Date.now() - start;
    keepAliveState.lastPing = new Date().toISOString();
    keepAliveState.totalPings += 1;
    keepAliveState.lastLatencyMs = latency;
    keepAliveState.status = "active";
    keepAliveState.lastError = null;

    console.log(`[Supabase Keep-Alive] (${source}) Ping berhasil! Waktu respon: ${latency}ms | Total interaksi: ${keepAliveState.totalPings}`);
    return { success: true, latencyMs: latency, timestamp: keepAliveState.lastPing };
  } catch (err) {
    keepAliveState.lastError = err.message;
    keepAliveState.status = "error";
    console.error(`[Supabase Keep-Alive] (${source}) Gagal berinteraksi dengan database:`, err.message);
    return { success: false, error: err.message };
  }
}

// Setup background interval (defaults to every 6 hours) — hanya aktif di mode standalone server
const KEEP_ALIVE_HOURS = parseFloat(process.env.KEEP_ALIVE_INTERVAL_HOURS) || 6;
const KEEP_ALIVE_MS = KEEP_ALIVE_HOURS * 60 * 60 * 1000;

if (require.main === module) {
  setInterval(() => {
    executeKeepAlivePing("Interval Worker (SetInterval)");
  }, KEEP_ALIVE_MS);

  // Run initial ping 5 seconds after server starts
  setTimeout(() => {
    executeKeepAlivePing("Startup Boot Check");
  }, 5000);
}

// ============================================================================
// API ROUTES
// ============================================================================

// --- Auth Routes ---
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateAdminToken(username);
    return res.json({
      success: true,
      message: "Login berhasil!",
      token,
      user: { username },
    });
  }

  return res.status(401).json({
    success: false,
    error: "Username atau password salah.",
  });
});

app.get("/api/auth/me", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    user: { username: ADMIN_USERNAME },
  });
});

// --- Keep-Alive Status & Manual Trigger Route ---
app.get("/api/keep-alive", async (req, res) => {
  const result = await executeKeepAlivePing("Manual API Request /keep-alive");
  res.json({
    ...result,
    keepAliveState,
    info: "Endpoint ini berinteraksi langsung dengan PostgreSQL di Supabase untuk mereset counter inaktivitas 7 hari.",
  });
});

app.get("/api/keep-alive/status", (req, res) => {
  res.json({
    success: true,
    state: keepAliveState,
    intervalHours: KEEP_ALIVE_HOURS,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// --- Menu Routes ---
app.get("/api/menus", async (req, res) => {
  try {
    const imagesMap = getLocalImagesMap();

    // Fetch menus from Supabase
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Gagal mengambil menu dari Supabase:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Attach image_url (fallback to imagesMap if image_url column is null/empty)
    const menus = (data || []).map((m) => {
      let img = m.image_url;
      if (!img) {
        img = imagesMap[m.name] || "assets/snack-goreng.jpg";
      }
      return {
        ...m,
        image_url: img,
      };
    });

    res.json({ success: true, menus, count: menus.length });
  } catch (err) {
    console.error("Server menu error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/menus", requireAdminAuth, async (req, res) => {
  try {
    const { name, variant, category, price, min_quantity, description, is_available, image_url } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Nama menu wajib diisi." });
    }

    const payload = {
      name: name.trim(),
      variant: variant ? variant.trim() : null,
      category: category || "Tradisional",
      price: parseInt(price, 10) || 1000,
      min_quantity: parseInt(min_quantity, 10) || 50,
      description: description ? description.trim() : "",
      is_available: is_available !== false,
    };

    // Try inserting with image_url if provided
    let insertData = { ...payload };
    if (image_url) {
      insertData.image_url = image_url;
    }

    let { data, error } = await supabase.from("menus").insert([insertData]).select();

    // If column image_url doesn't exist in Supabase yet, retry without image_url
    if (error && error.message && error.message.includes("image_url")) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.image_url;
      const retry = await supabase.from("menus").insert([fallbackPayload]).select();
      data = retry.data;
      error = retry.error;

      // Save image to local map
      if (image_url && name) {
        const imagesMap = getLocalImagesMap();
        imagesMap[name] = image_url;
        saveLocalImagesMap(imagesMap);
      }
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Save image to local mapping too
    if (image_url && name) {
      const imagesMap = getLocalImagesMap();
      imagesMap[name] = image_url;
      saveLocalImagesMap(imagesMap);
    }

    res.json({ success: true, message: "Menu berhasil ditambahkan!", menu: data ? data[0] : null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/menus/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, variant, category, price, min_quantity, description, is_available, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Nama menu wajib diisi." });
    }

    const payload = {
      name: name.trim(),
      variant: variant ? variant.trim() : null,
      category: category || "Tradisional",
      price: parseInt(price, 10) || 1000,
      min_quantity: parseInt(min_quantity, 10) || 50,
      description: description ? description.trim() : "",
      is_available: is_available !== false,
    };

    let updateData = { ...payload };
    if (image_url) {
      updateData.image_url = image_url;
    }

    let { data, error } = await supabase
      .from("menus")
      .update(updateData)
      .eq("id", id)
      .select();

    // If image_url column doesn't exist, retry without it
    if (error && error.message && error.message.includes("image_url")) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.image_url;
      const retry = await supabase
        .from("menus")
        .update(fallbackPayload)
        .eq("id", id)
        .select();
      data = retry.data;
      error = retry.error;

      if (image_url && name) {
        const imagesMap = getLocalImagesMap();
        imagesMap[name] = image_url;
        saveLocalImagesMap(imagesMap);
      }
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: `Menu dengan ID ${id} tidak ditemukan di database.` });
    }

    if (image_url && name) {
      const imagesMap = getLocalImagesMap();
      imagesMap[name] = image_url;
      saveLocalImagesMap(imagesMap);
    }

    res.json({ success: true, message: "Menu berhasil diperbarui!", menu: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/menus/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("menus").delete().eq("id", id);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: "Menu berhasil dihapus!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Upload Image Route (Stores to Supabase Storage) ---
app.post("/api/upload", requireAdminAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Tidak ada file gambar yang diunggah." });
    }

    const bucketName = "menu-images";

    // Ensure bucket exists or create it
    try {
      await supabase.storage.createBucket(bucketName, { public: true });
    } catch (_) {
      // Bucket already exists
    }

    // Clean filename
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `menu-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    // Upload buffer to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    res.json({
      success: true,
      message: "Gambar berhasil diunggah!",
      url: publicUrl,
      filename,
    });
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Static Site Settings Routes ---
app.get("/api/settings", async (req, res) => {
  try {
    let settings = getLocalSettings();

    // Try reading from Supabase site_settings table
    try {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (!error && data && data.length > 0) {
        data.forEach((row) => {
          try {
            settings[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          } catch (_) {
            settings[row.key] = row.value;
          }
        });
      }
    } catch (_) {
      // Fallback cleanly to local settings
    }

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/settings", requireAdminAuth, async (req, res) => {
  try {
    const newSettings = req.body;
    const current = getLocalSettings();
    const updated = { ...current, ...newSettings };

    // Save locally
    saveLocalSettings(updated);

    // Try saving to Supabase site_settings table with onConflict: "key"
    try {
      const entries = Object.entries(newSettings);
      for (const [key, val] of entries) {
        const { error: upsertErr } = await supabase
          .from("site_settings")
          .upsert(
            { key, value: val, updated_at: new Date().toISOString() },
            { onConflict: "key" }
          );

        if (upsertErr) {
          console.error(`Gagal upsert setting "${key}" ke Supabase:`, upsertErr);
        }
      }
    } catch (err) {
      console.warn("Info: site_settings di Supabase belum dibuat, tersimpan di lokal fallback:", err.message);
    }

    res.json({ success: true, message: "Pengaturan berhasil diperbarui!", settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default 404 for API
app.all("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: "Endpoint tidak ditemukan." });
});

// Start Server (Listen when run locally or directly, export app for Vercel/Serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Dapur Saluyu Server berjalan di http://localhost:${PORT}`);
    console.log(`🌐 Landing Page  : http://localhost:${PORT}/`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin/`);
    console.log(`⚡ Keep-Alive Interval: Setiap ${KEEP_ALIVE_HOURS} jam (Otomatis)`);
    console.log(`====================================================`);
  });
}

module.exports = app;

