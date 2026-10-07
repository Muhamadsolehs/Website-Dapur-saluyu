/* ==========================================================================
   DAPUR SALUYU — Admin Dashboard Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- API Base URL ---
  const API_BASE = ""; // Relative to server root

  // --- State ---
  let authToken = localStorage.getItem("dapur_admin_token") || null;
  let allMenus = [];
  let currentEditingId = null;

  // --- DOM Elements ---
  const loginScreen = document.getElementById("loginScreen");
  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const adminShell = document.getElementById("adminShell");
  const btnLogout = document.getElementById("btnLogout");

  const navTabBtns = document.querySelectorAll(".nav-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Menu Elements
  const menusTableBody = document.getElementById("menusTableBody");
  const adminSearchMenu = document.getElementById("adminSearchMenu");
  const adminFilterCategory = document.getElementById("adminFilterCategory");
  const btnRefreshMenus = document.getElementById("btnRefreshMenus");
  const btnOpenAddModal = document.getElementById("btnOpenAddModal");

  const statTotalMenu = document.getElementById("statTotalMenu");
  const statAvailableMenu = document.getElementById("statAvailableMenu");
  const statEmptyMenu = document.getElementById("statEmptyMenu");

  // Modal Elements
  const menuModalOverlay = document.getElementById("menuModalOverlay");
  const modalMenuTitle = document.getElementById("modalMenuTitle");
  const menuForm = document.getElementById("menuForm");
  const btnCloseMenuModal = document.getElementById("btnCloseMenuModal");
  const btnCancelMenuModal = document.getElementById("btnCancelMenuModal");
  const menuId = document.getElementById("menuId");
  const menuName = document.getElementById("menuName");
  const menuCategory = document.getElementById("menuCategory");
  const menuVariant = document.getElementById("menuVariant");
  const menuPrice = document.getElementById("menuPrice");
  const menuMinQuantity = document.getElementById("menuMinQuantity");
  const menuDescription = document.getElementById("menuDescription");
  const menuIsAvailable = document.getElementById("menuIsAvailable");
  const menuImageUrl = document.getElementById("menuImageUrl");
  const fileMenuImage = document.getElementById("fileMenuImage");
  const imageUploadArea = document.getElementById("imageUploadArea");
  const uploadPreviewWrap = document.getElementById("uploadPreviewWrap");
  const uploadPreviewImg = document.getElementById("uploadPreviewImg");

  // Settings Elements
  const settingsForm = document.getElementById("settingsForm");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const setWhatsApp = document.getElementById("setWhatsApp");
  const setBusinessName = document.getElementById("setBusinessName");
  const setTagline = document.getElementById("setTagline");
  const setMinOrderGlobal = document.getElementById("setMinOrderGlobal");
  const setOperatingHours = document.getElementById("setOperatingHours");
  const setAddress = document.getElementById("setAddress");
  const setHeroLead = document.getElementById("setHeroLead");

  // Keep-Alive Elements
  const btnTriggerKeepAlive = document.getElementById("btnTriggerKeepAlive");
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const dbStatusText = document.getElementById("dbStatusText");
  const keepAliveLastTime = document.getElementById("keepAliveLastTime");
  const keepAliveLatency = document.getElementById("keepAliveLatency");
  const keepAliveTotalPings = document.getElementById("keepAliveTotalPings");

  // Toast
  const adminToast = document.getElementById("adminToast");
  const toastMsg = document.getElementById("toastMsg");

  function showToast(msg) {
    if (!adminToast || !toastMsg) return;
    toastMsg.textContent = msg;
    adminToast.classList.add("show");
    setTimeout(() => {
      adminToast.classList.remove("show");
    }, 2800);
  }

  // --- Auth Headers Helper ---
  function getAuthHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
  }

  // --- Authentication Flow ---
  async function checkAuth() {
    if (!authToken) {
      showLogin();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch (e) {
      // Offline / network issue, proceed to login
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.style.display = "flex";
    adminShell.style.display = "none";
  }

  function showDashboard() {
    loginScreen.style.display = "none";
    adminShell.style.display = "flex";
    loadAllData();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = loginUsername.value.trim();
      const password = loginPassword.value;

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
          authToken = data.token;
          localStorage.setItem("dapur_admin_token", authToken);
          showToast("Selamat datang, Admin Dapur Saluyu!");
          showDashboard();
        } else {
          alert(data.error || "Gagal masuk.");
        }
      } catch (err) {
        alert("Gagal terhubung ke server backend: " + err.message);
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (confirm("Apakah Anda yakin ingin keluar dari panel admin?")) {
        authToken = null;
        localStorage.removeItem("dapur_admin_token");
        showToast("Sesi berhasil diakhiri.");
        showLogin();
      }
    });
  }

  // --- Tab Navigation ---
  navTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      navTabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add("active");

      if (btn.dataset.tab === "tabKeepAlive") {
        fetchKeepAliveStatus();
      }
    });
  });

  // --- Load All Data ---
  function loadAllData() {
    fetchMenus();
    fetchSettings();
    fetchKeepAliveStatus();
  }

  // ==========================================================================
  // TAB 1: MENU CRUD & PHOTO UPLOAD
  // ==========================================================================
  async function fetchMenus() {
    try {
      menusTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 25px;">Mengambil menu dari Supabase...</td></tr>`;

      const res = await fetch(`${API_BASE}/api/menus`);
      const data = await res.json();

      if (data.success && Array.isArray(data.menus)) {
        allMenus = data.menus;
        renderMenusTable();
        updateMenuStats();
      } else {
        menusTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 25px;">Gagal memuat menu: ${data.error}</td></tr>`;
      }
    } catch (err) {
      menusTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 25px;">Koneksi error: ${err.message}</td></tr>`;
    }
  }

  function updateMenuStats() {
    const total = allMenus.length;
    const available = allMenus.filter((m) => m.is_available).length;
    const empty = total - available;

    if (statTotalMenu) statTotalMenu.textContent = total;
    if (statAvailableMenu) statAvailableMenu.textContent = available;
    if (statEmptyMenu) statEmptyMenu.textContent = empty;
  }

  function renderMenusTable() {
    const query = adminSearchMenu?.value.toLowerCase().trim() || "";
    const cat = adminFilterCategory?.value || "all";

    const filtered = allMenus.filter((m) => {
      const matchCat = cat === "all" || m.category === cat;
      const matchSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        (m.variant && m.variant.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      menusTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Tidak ada menu yang sesuai filter.</td></tr>`;
      return;
    }

    menusTableBody.innerHTML = filtered
      .map((menu) => {
        const catClass = (menu.category || "").toLowerCase().includes("manis")
          ? "manis"
          : "gurih";
        const imgSrc = menu.image_url || "../assets/snack-goreng.jpg";

        return `
        <tr data-id="${menu.id}">
          <td>
            <img src="${imgSrc}" alt="${menu.name}" class="menu-thumb" onerror="this.src='../assets/snack-goreng.jpg'">
          </td>
          <td>
            <strong style="display: block; font-size: 14px;">${menu.name}</strong>
            <small style="color: var(--text-muted);">${menu.variant ? menu.variant : menu.description || "-"}</small>
          </td>
          <td>
            <span class="category-tag ${catClass}">${menu.category || "Tradisional"}</span>
          </td>
          <td>
            <strong style="color: var(--primary);">Rp${(menu.price || 1000).toLocaleString("id-ID")}</strong>
          </td>
          <td>
            <span>${menu.min_quantity || 50} pcs</span>
          </td>
          <td>
            <label class="switch" title="Ubah status ketersediaan">
              <input type="checkbox" class="toggle-availability" data-id="${menu.id}" ${menu.is_available ? "checked" : ""}>
              <span class="slider"></span>
            </label>
            <span style="font-size: 11.5px; margin-left: 6px; font-weight: 600; color: ${menu.is_available ? "var(--success)" : "var(--text-muted)"}">
              ${menu.is_available ? "Tersedia" : "Habis"}
            </span>
          </td>
          <td style="text-align: right;">
            <div class="table-actions" style="justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm btn-edit-menu" data-id="${menu.id}" title="Edit menu">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-delete-menu" data-id="${menu.id}" title="Hapus menu">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    if (window.lucide) window.lucide.createIcons();

    // Bind Table Actions
    bindTableEvents();
  }

  function bindTableEvents() {
    // Availability Toggle
    document.querySelectorAll(".toggle-availability").forEach((chk) => {
      chk.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        const is_available = e.target.checked;
        const menu = allMenus.find((m) => m.id == id);
        if (!menu) return;

        try {
          const res = await fetch(`${API_BASE}/api/menus/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...menu, is_available }),
          });
          const data = await res.json();
          if (data.success) {
            menu.is_available = is_available;
            showToast(`Status "${menu.name}" diperbarui: ${is_available ? "Tersedia" : "Habis"}`);
            updateMenuStats();
            renderMenusTable();
          } else {
            alert("Gagal update status: " + data.error);
            e.target.checked = !is_available;
          }
        } catch (err) {
          alert("Error: " + err.message);
          e.target.checked = !is_available;
        }
      });
    });

    // Edit Menu
    document.querySelectorAll(".btn-edit-menu").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const menu = allMenus.find((m) => m.id == id);
        if (menu) openEditModal(menu);
      });
    });

    // Delete Menu
    document.querySelectorAll(".btn-delete-menu").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const menu = allMenus.find((m) => m.id == id);
        if (!menu) return;

        if (confirm(`Apakah Anda yakin ingin menghapus "${menu.name}" dari katalog?`)) {
          try {
            const res = await fetch(`${API_BASE}/api/menus/${id}`, {
              method: "DELETE",
              headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
              allMenus = allMenus.filter((m) => m.id != id);
              showToast(`"${menu.name}" berhasil dihapus.`);
              updateMenuStats();
              renderMenusTable();
            } else {
              alert("Gagal menghapus: " + data.error);
            }
          } catch (err) {
            alert("Error: " + err.message);
          }
        }
      });
    });
  }

  if (adminSearchMenu) adminSearchMenu.addEventListener("input", renderMenusTable);
  if (adminFilterCategory) adminFilterCategory.addEventListener("change", renderMenusTable);
  if (btnRefreshMenus) btnRefreshMenus.addEventListener("click", fetchMenus);

  // --- Modal Form Actions ---
  function openAddModal() {
    currentEditingId = null;
    modalMenuTitle.textContent = "Tambah Menu Baru";
    menuId.value = "";
    menuName.value = "";
    menuCategory.value = "Tradisional";
    menuVariant.value = "";
    menuPrice.value = "1000";
    menuMinQuantity.value = "50";
    menuDescription.value = "";
    menuIsAvailable.checked = true;
    menuImageUrl.value = "";
    uploadPreviewWrap.style.display = "none";
    uploadPreviewImg.src = "";
    menuModalOverlay.classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  function openEditModal(menu) {
    currentEditingId = menu.id;
    modalMenuTitle.textContent = `Edit Menu: ${menu.name}`;
    menuId.value = menu.id;
    menuName.value = menu.name || "";
    menuCategory.value = menu.category || "Tradisional";
    menuVariant.value = menu.variant || "";
    menuPrice.value = menu.price || 1000;
    menuMinQuantity.value = menu.min_quantity || 50;
    menuDescription.value = menu.description || "";
    menuIsAvailable.checked = menu.is_available !== false;
    menuImageUrl.value = menu.image_url || "";

    if (menu.image_url) {
      uploadPreviewImg.src = menu.image_url;
      uploadPreviewWrap.style.display = "block";
    } else {
      uploadPreviewWrap.style.display = "none";
      uploadPreviewImg.src = "";
    }

    menuModalOverlay.classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  function closeMenuModal() {
    menuModalOverlay.classList.remove("open");
  }

  if (btnOpenAddModal) btnOpenAddModal.addEventListener("click", openAddModal);
  if (btnCloseMenuModal) btnCloseMenuModal.addEventListener("click", closeMenuModal);
  if (btnCancelMenuModal) btnCancelMenuModal.addEventListener("click", closeMenuModal);

  // --- Photo Upload to Supabase Storage ---
  if (imageUploadArea && fileMenuImage) {
    imageUploadArea.addEventListener("click", () => fileMenuImage.click());

    fileMenuImage.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);

      showToast("Mengunggah foto ke Supabase Storage...");

      try {
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          menuImageUrl.value = data.url;
          uploadPreviewImg.src = data.url;
          uploadPreviewWrap.style.display = "block";
          showToast("Foto berhasil diunggah ke Supabase!");
        } else {
          alert("Gagal mengunggah foto: " + data.error);
        }
      } catch (err) {
        alert("Upload error: " + err.message);
      }
    });
  }

  // Submit Menu Form (Create / Update)
  if (menuForm) {
    menuForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        name: menuName.value.trim(),
        category: menuCategory.value,
        variant: menuVariant.value.trim() || null,
        price: parseInt(menuPrice.value, 10) || 1000,
        min_quantity: parseInt(menuMinQuantity.value, 10) || 50,
        description: menuDescription.value.trim(),
        is_available: menuIsAvailable.checked,
        image_url: menuImageUrl.value || null,
      };

      const url = currentEditingId
        ? `${API_BASE}/api/menus/${currentEditingId}`
        : `${API_BASE}/api/menus`;
      const method = currentEditingId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showToast(data.message || "Menu berhasil disimpan!");
          closeMenuModal();
          fetchMenus();
        } else {
          alert("Gagal menyimpan menu: " + data.error);
        }
      } catch (err) {
        alert("Simpan error: " + err.message);
      }
    });
  }

  // ==========================================================================
  // TAB 2: STATIC SETTINGS
  // ==========================================================================
  async function fetchSettings() {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      const data = await res.json();

      if (data.success && data.settings) {
        const s = data.settings;
        if (setWhatsApp) setWhatsApp.value = s.whatsapp_number || "";
        if (setBusinessName) setBusinessName.value = s.business_name || "";
        if (setTagline) setTagline.value = s.tagline || "";
        if (setMinOrderGlobal) setMinOrderGlobal.value = s.min_order_global || 50;
        if (setOperatingHours) setOperatingHours.value = s.operating_hours || "";
        if (setAddress) setAddress.value = s.address || "";
        if (setHeroLead) setHeroLead.value = s.hero_lead || "";
      }
    } catch (err) {
      console.error("Gagal load settings:", err);
    }
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", async () => {
      const newSettings = {
        whatsapp_number: setWhatsApp.value.trim(),
        business_name: setBusinessName.value.trim(),
        tagline: setTagline.value.trim(),
        min_order_global: parseInt(setMinOrderGlobal.value, 10) || 50,
        operating_hours: setOperatingHours.value.trim(),
        address: setAddress.value.trim(),
        hero_lead: setHeroLead.value.trim(),
      };

      try {
        const res = await fetch(`${API_BASE}/api/settings`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(newSettings),
        });
        const data = await res.json();

        if (data.success) {
          showToast("Pengaturan informasi website berhasil disimpan!");
        } else {
          alert("Gagal menyimpan: " + data.error);
        }
      } catch (err) {
        alert("Error simpan: " + err.message);
      }
    });
  }

  // ==========================================================================
  // TAB 3: SUPABASE KEEP-ALIVE MONITOR & PING
  // ==========================================================================
  async function fetchKeepAliveStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/keep-alive/status`);
      const data = await res.json();

      if (data.success && data.state) {
        const state = data.state;
        if (keepAliveLatency && state.lastLatencyMs !== null) {
          keepAliveLatency.textContent = `${state.lastLatencyMs} ms`;
        }
        if (keepAliveLastTime && state.lastPing) {
          const d = new Date(state.lastPing);
          keepAliveLastTime.textContent = d.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "medium",
          });
        }
        if (keepAliveTotalPings) {
          keepAliveTotalPings.textContent = `${state.totalPings} kali interaksi`;
        }
        if (dbStatusBadge && dbStatusText) {
          if (state.status === "active") {
            dbStatusBadge.className = "status-badge active";
            dbStatusText.textContent = "AKTIF & TERHUBUNG";
          } else {
            dbStatusBadge.className = "status-badge";
            dbStatusText.textContent = state.status.toUpperCase();
          }
        }
      }
    } catch (err) {
      console.warn("Gagal load keep-alive status:", err);
    }
  }

  if (btnTriggerKeepAlive) {
    btnTriggerKeepAlive.addEventListener("click", async () => {
      btnTriggerKeepAlive.disabled = true;
      btnTriggerKeepAlive.innerHTML = `<i data-lucide="loader" class="spin"></i> Mengirim Query ke Supabase...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetch(`${API_BASE}/api/keep-alive`);
        const data = await res.json();

        if (data.success) {
          showToast(`Berhasil berinteraksi dengan Supabase PostgreSQL! Waktu respon: ${data.latencyMs}ms`);
          fetchKeepAliveStatus();
        } else {
          alert("Gagal ping Supabase: " + data.error);
        }
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        btnTriggerKeepAlive.disabled = false;
        btnTriggerKeepAlive.innerHTML = `<i data-lucide="zap"></i> Uji Interaksi Database Sekarang`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // --- Initial Auth Check ---
  checkAuth();
});
