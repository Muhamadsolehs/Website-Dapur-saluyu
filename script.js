/* ==========================================================================
   DAPUR SALUYU — Minimalist & Artisanal Website Logic (With Dynamic Sync)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons with robust fallback helper
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn("Lucide createIcons error:", e);
      }
    }
  }
  refreshIcons();
  window.addEventListener("load", refreshIcons);

  // --- Constants & State ---
  let whatsappNumber = "62895634751493";
  const PRICE_PER_PCS = 1000;
  const STEP_PCS = 50;
  
  // Auto-detect API Base URL: Fallback to port 5000 if opened on other ports (e.g. Laragon Apache port 80 or file:///)
  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isDedicatedPort = window.location.port === "5000" || window.location.port === "3000";
  const API_BASE = (window.location.protocol === "file:" || (isLocalHost && !isDedicatedPort))
    ? "http://localhost:5000"
    : "";

  // Shopping Cart state: Map<string, number>
  const cart = new Map();

  // --- DOM Elements ---
  const headerNav = document.getElementById("headerNav");
  const navLinks = document.getElementById("navLinks");
  const menuToggle = document.getElementById("menuToggle");
  const navLinksItems = document.querySelectorAll(".nav-link");

  const filterBtns = document.querySelectorAll(".filter-btn");
  const searchInput = document.getElementById("menuSearch");
  const menuGrid = document.getElementById("menuGrid");
  const noMenuFound = document.getElementById("noMenuFound");
  const btnResetSearch = document.getElementById("btnResetSearch");

  const floatingCartBar = document.getElementById("floatingCartBar");
  const barMenuCount = document.getElementById("barMenuCount");
  const barPcsCount = document.getElementById("barPcsCount");
  const barTotalPrice = document.getElementById("barTotalPrice");
  const btnBarCheckout = document.getElementById("btnBarCheckout");

  const orderModal = document.getElementById("orderModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalOrderList = document.getElementById("modalOrderList");
  const emptyOrderState = document.getElementById("emptyOrderState");
  const orderFormFields = document.getElementById("orderFormFields");
  const modalFooter = document.getElementById("modalFooter");
  const modalSummaryPcs = document.getElementById("modalSummaryPcs");
  const modalSummaryPrice = document.getElementById("modalSummaryPrice");
  const btnSendWhatsApp = document.getElementById("btnSendWhatsApp");
  const btnModalBrowse = document.getElementById("btnModalBrowse");

  const orderCustomerName = document.getElementById("orderCustomerName");
  const orderEventDate = document.getElementById("orderEventDate");
  const orderNotes = document.getElementById("orderNotes");

  const btnNavOrder = document.getElementById("btnNavOrder");
  const btnCtaOrder = document.getElementById("btnCtaOrder");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const currentYear = document.getElementById("currentYear");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  // --- Header & Scroll Handling ---
  window.addEventListener("scroll", () => {
    if (headerNav) {
      headerNav.classList.toggle("scrolled", window.scrollY > 20);
    }

    // Active Section Detection
    const sections = document.querySelectorAll("main section[id]");
    const scrollPos = window.scrollY + 140;
    let currentId = "beranda";

    sections.forEach((sec) => {
      if (scrollPos >= sec.offsetTop) {
        currentId = sec.id;
      }
    });

    navLinksItems.forEach((link) => {
      const target = link.getAttribute("href");
      link.classList.toggle("active", target === `#${currentId}`);
    });
  });

  // Mobile Navigation Toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });

    navLinksItems.forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
      });
    });
  }

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  // --- Format Currency ---
  function formatRupiah(amount) {
    return `Rp${amount.toLocaleString("id-ID")}`;
  }

  // --- Menu Filter & Search ---
  let currentFilter = "all";

  function applyMenuFilters() {
    const query = (searchInput ? searchInput.value.toLowerCase().trim() : "");
    const menuCards = document.querySelectorAll(".menu-card");
    let visibleCount = 0;

    menuCards.forEach((card) => {
      const cardCategory = (card.dataset.category || "").toLowerCase();
      const cardName = (card.dataset.name || "").toLowerCase();
      const cardDesc = (card.querySelector(".menu-desc")?.textContent || "").toLowerCase();

      const matchesCategory =
        currentFilter === "all" || cardCategory.includes(currentFilter.toLowerCase());
      const matchesSearch =
        !query || cardName.includes(query) || cardDesc.includes(query);

      const isVisible = matchesCategory && matchesSearch;
      card.classList.toggle("hide", !isVisible);

      if (isVisible) visibleCount++;
    });

    if (noMenuFound) {
      noMenuFound.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "all";
      applyMenuFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", applyMenuFilters);
  }

  if (btnResetSearch && searchInput) {
    btnResetSearch.addEventListener("click", () => {
      searchInput.value = "";
      currentFilter = "all";
      filterBtns.forEach((b) => b.classList.toggle("active", b.dataset.filter === "all"));
      applyMenuFilters();
    });
  }

  // --- Cart Management & Card Sync ---
  function updateCardUI(itemName) {
    const count = cart.get(itemName) || 0;
    const addBtn = document.querySelector(`.btn-add-item[data-item="${itemName}"]`);
    const stepper = document.querySelector(`.card-stepper[data-stepper="${itemName}"]`);
    const countLabel = document.querySelector(`.stepper-count[data-count="${itemName}"]`);

    if (!addBtn || !stepper) return;

    if (count > 0) {
      addBtn.style.display = "none";
      stepper.classList.add("active");
      if (countLabel) countLabel.textContent = `${count}`;
    } else {
      addBtn.style.display = "inline-flex";
      stepper.classList.remove("active");
      if (countLabel) countLabel.textContent = "0";
    }
  }

  function syncAllCardUIs() {
    const menuCards = document.querySelectorAll(".menu-card");
    menuCards.forEach((card) => {
      const name = card.dataset.name;
      if (name) updateCardUI(name);
    });
  }

  function updateCartState() {
    let totalItems = cart.size;
    let totalPcs = 0;

    cart.forEach((qty) => {
      totalPcs += qty;
    });

    const totalPrice = totalPcs * PRICE_PER_PCS;

    // Update Floating Cart Bar
    if (floatingCartBar) {
      if (totalItems > 0) {
        floatingCartBar.classList.add("visible");
        if (barMenuCount) barMenuCount.textContent = `${totalItems} Menu Terpilih`;
        if (barPcsCount) barPcsCount.textContent = `${totalPcs.toLocaleString("id-ID")} pcs jajanan`;
        if (barTotalPrice) barTotalPrice.textContent = formatRupiah(totalPrice);
      } else {
        floatingCartBar.classList.remove("visible");
      }
    }

    // Update Modal Summary
    if (modalSummaryPcs) modalSummaryPcs.textContent = `${totalPcs.toLocaleString("id-ID")} pcs jajanan`;
    if (modalSummaryPrice) modalSummaryPrice.textContent = formatRupiah(totalPrice);

    renderModalOrderList();
  }

  function addToCart(itemName) {
    const current = cart.get(itemName) || 0;
    cart.set(itemName, current + STEP_PCS);
    updateCardUI(itemName);
    updateCartState();
    showToast(`${itemName} ditambahkan (+50 pcs)`);
  }

  function stepCart(itemName, delta) {
    const current = cart.get(itemName) || 0;
    const next = current + delta;
    if (next <= 0) {
      cart.delete(itemName);
      showToast(`${itemName} dihapus dari pesanan`);
    } else {
      cart.set(itemName, next);
    }
    updateCardUI(itemName);
    updateCartState();
  }

  function removeEntireItem(itemName) {
    cart.delete(itemName);
    updateCardUI(itemName);
    updateCartState();
    showToast(`${itemName} dihapus dari pesanan`);
  }

  // Menu Grid Card Events (Delegated)
  if (menuGrid) {
    menuGrid.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".btn-add-item");
      if (addBtn) {
        const item = addBtn.dataset.item;
        if (item) addToCart(item);
        return;
      }

      const stepperBtn = e.target.closest(".stepper-btn");
      if (stepperBtn) {
        const item = stepperBtn.dataset.item;
        const step = parseInt(stepperBtn.dataset.step, 10) || 50;
        if (item) stepCart(item, step);
      }
    });
  }

  // --- Modal Rendering & Events ---
  function renderModalOrderList() {
    if (!modalOrderList) return;
    modalOrderList.innerHTML = "";

    if (cart.size === 0) {
      if (emptyOrderState) emptyOrderState.style.display = "block";
      if (orderFormFields) orderFormFields.style.display = "none";
      if (modalFooter) modalFooter.style.display = "none";
      return;
    }

    if (emptyOrderState) emptyOrderState.style.display = "none";
    if (orderFormFields) orderFormFields.style.display = "flex";
    if (modalFooter) modalFooter.style.display = "block";

    cart.forEach((qty, name) => {
      const subtotal = qty * PRICE_PER_PCS;
      const row = document.createElement("div");
      row.className = "order-item-row";
      row.innerHTML = `
        <div class="order-item-info">
          <strong>${name}</strong>
          <span>Rp${PRICE_PER_PCS.toLocaleString("id-ID")}/pcs · Min. 50 pcs</span>
        </div>
        <div class="order-item-controls">
          <div class="card-stepper active">
            <button class="stepper-btn" data-modal-step="-50" data-item="${name}">−</button>
            <span class="stepper-count">${qty}</span>
            <button class="stepper-btn" data-modal-step="50" data-item="${name}">+</button>
          </div>
          <span class="order-item-subtotal">${formatRupiah(subtotal)}</span>
          <button class="modal-close-btn" data-remove="${name}" title="Hapus item" style="width: 28px; height: 28px; margin-left: 4px;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `;
      modalOrderList.appendChild(row);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function openModal() {
    if (!orderModal) return;
    renderModalOrderList();
    orderModal.classList.add("open");
    orderModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!orderModal) return;
    orderModal.classList.remove("open");
    orderModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (modalOrderList) {
    modalOrderList.addEventListener("click", (e) => {
      const stepBtn = e.target.closest("[data-modal-step]");
      if (stepBtn) {
        const item = stepBtn.dataset.item;
        const delta = parseInt(stepBtn.dataset.modalStep, 10) || 50;
        if (item) stepCart(item, delta);
        return;
      }

      const removeBtn = e.target.closest("[data-remove]");
      if (removeBtn) {
        const item = removeBtn.dataset.remove;
        if (item) removeEntireItem(item);
      }
    });
  }

  // Modal Triggers
  if (btnBarCheckout) btnBarCheckout.addEventListener("click", openModal);
  if (btnNavOrder) btnNavOrder.addEventListener("click", openModal);
  if (btnCtaOrder) btnCtaOrder.addEventListener("click", openModal);

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
  if (btnModalBrowse) {
    btnModalBrowse.addEventListener("click", () => {
      closeModal();
      const menuSec = document.getElementById("menu");
      if (menuSec) menuSec.scrollIntoView({ behavior: "smooth" });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && orderModal?.classList.contains("open")) {
      closeModal();
    }
  });

  // --- Send WhatsApp Checkout ---
  if (btnSendWhatsApp) {
    btnSendWhatsApp.addEventListener("click", () => {
      if (cart.size === 0) {
        showToast("Pilih menu terlebih dahulu");
        return;
      }

      const customerName = orderCustomerName?.value.trim() || "-";
      const eventDate = orderEventDate?.value.trim() || "-";
      const notes = orderNotes?.value.trim() || "-";

      let totalPcs = 0;
      let totalPrice = 0;
      let itemsListText = "";

      cart.forEach((qty, name) => {
        const subtotal = qty * PRICE_PER_PCS;
        totalPcs += qty;
        totalPrice += subtotal;
        itemsListText += `• ${name}: ${qty} pcs (${formatRupiah(subtotal)})\n`;
      });

      const message = 
`Halo Dapur Saluyu, saya ingin memesan jajanan tradisional:

📋 DAFTAR PESANAN:
${itemsListText}
📦 TOTAL: ${totalPcs.toLocaleString("id-ID")} pcs (${formatRupiah(totalPrice)})
👤 Nama Pemesan: ${customerName}
📅 Tanggal & Waktu Acara: ${eventDate}
📝 Catatan Tambahan: ${notes}

Mohon konfirmasi ketersediaan dan jadwal produksinya ya. Terima kasih!`;

      const encodedUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(encodedUrl, "_blank");
    });
  }

  // --- FAQ Accordion ---
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (question) {
      question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");
        faqItems.forEach((f) => f.classList.remove("active"));
        if (!isActive) {
          item.classList.add("active");
        }
      });
    }
  });

  // ==========================================================================
  // DYNAMIC SYNC FROM BACKEND (SUPABASE)
  // ==========================================================================
  async function syncWithBackend() {
    // 1. Fetch Dynamic Site Settings (WhatsApp Number & Content)
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.whatsapp_number) {
          whatsappNumber = s.whatsapp_number;
          // Update WA links on page
          document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
            a.href = `https://wa.me/${s.whatsapp_number}`;
          });
        }
        if (s.business_name) {
          document.querySelectorAll(".brand-title").forEach((el) => {
            el.textContent = s.business_name;
          });
        }
        if (s.tagline) {
          document.querySelectorAll(".brand-tagline").forEach((el) => {
            el.textContent = s.tagline;
          });
        }
        if (s.hero_lead) {
          const heroLeadEl = document.querySelector(".hero-lead");
          if (heroLeadEl) heroLeadEl.textContent = s.hero_lead;
        }
        if (s.min_order_global) {
          document.querySelectorAll(".trust-info strong").forEach((el) => {
            if (el.textContent.includes("Min.") || el.textContent.includes("50")) {
              el.textContent = `Min. ${s.min_order_global} Pcs`;
            }
          });
          const minNotice = document.querySelector(".section-head p strong:last-child");
          if (minNotice) minNotice.textContent = `${s.min_order_global} pcs per jenis menu`;
        }
      }
    } catch (_) {
      // Keep static default gracefully
    }

    // 2. Fetch Live Menus from Supabase
    try {
      const res = await fetch(`${API_BASE}/api/menus`);
      const data = await res.json();

      if (data.success && Array.isArray(data.menus) && data.menus.length > 0) {
        renderDynamicMenuGrid(data.menus);
      }
    } catch (_) {
      // Keep static menu grid gracefully
    }
  }

  function renderDynamicMenuGrid(menus) {
    if (!menuGrid) return;

    // Filter only available menus for customers
    const availableMenus = menus.filter((m) => m.is_available);

    // Deduplicate menus by name (taking latest entry if duplicate rows exist)
    const uniqueMap = new Map();
    availableMenus.forEach((m) => {
      uniqueMap.set(m.name, m);
    });
    const cleanMenus = Array.from(uniqueMap.values());

    const cardsHtml = cleanMenus
      .map((menu) => {
        let cat = (menu.category || "Tradisional").toLowerCase();
        if (cat.includes("gurih") || cat.includes("asin")) {
          cat = "gurih asin";
        } else if (cat.includes("manis")) {
          cat = "manis";
        } else {
          cat = "tradisional";
        }
        const tagText = menu.category || "Tradisional";
        const imgSrc = menu.image_url || "assets/snack-goreng.jpg";
        const price = menu.price || 1000;
        const minQty = menu.min_quantity || 50;
        const desc = menu.description || (menu.variant ? `Varian: ${menu.variant}` : "Jajanan tradisional gurih nikmat.");

        return `
        <article class="menu-card" data-category="${cat}" data-name="${menu.name}">
          <div class="menu-image-wrap">
            <img src="${imgSrc}" alt="${menu.name}" onerror="this.src='assets/snack-goreng.jpg'">
            <span class="menu-tag">${tagText}</span>
          </div>
          <div class="menu-content">
            <h3 class="menu-title">${menu.name}</h3>
            <p class="menu-desc">${desc}</p>
            <div class="menu-bottom">
              <div class="price-box">
                <span class="price-main">Rp${price.toLocaleString("id-ID")}</span>
                <span class="price-unit">per pcs · min. ${minQty}</span>
              </div>
              <div class="menu-action">
                <button class="btn-add-item" data-item="${menu.name}">
                  <i data-lucide="plus"></i> Tambah
                </button>
                <div class="card-stepper" data-stepper="${menu.name}">
                  <button class="stepper-btn" data-step="-50" data-item="${menu.name}">−</button>
                  <span class="stepper-count" data-count="${menu.name}">0</span>
                  <button class="stepper-btn" data-step="50" data-item="${menu.name}">+</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
      })
      .join("");

    menuGrid.innerHTML = cardsHtml + `
      <div class="no-menu-found" id="noMenuFound">
        <i data-lucide="search-x"></i>
        <p>Tidak ada jajanan yang cocok dengan pencarian Anda.</p>
        <button class="btn btn-secondary btn-small" id="btnResetSearch">Reset Pencarian</button>
      </div>
    `;

    refreshIcons();
    syncAllCardUIs();
  }

  // --- Discreet Admin Access Mechanisms (Khusus Pengelola) ---
  // 1. Keyboard Shortcut: Tekan Ctrl + Shift + A atau Alt + A dari mana saja
  document.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") ||
      (e.altKey && e.key.toLowerCase() === "a")
    ) {
      e.preventDefault();
      window.location.href = "/admin/";
    }
  });

  // 2. Double-Click pada teks hak cipta / footer
  const footerCopyrightWrap = document.getElementById("footerCopyrightWrap");
  if (footerCopyrightWrap) {
    footerCopyrightWrap.addEventListener("dblclick", () => {
      window.location.href = "/admin/";
    });
  }

  // 3. Triple-Click pada logo Dapur Saluyu di header
  let brandClickCount = 0;
  let brandClickTimer = null;
  const navBrand = document.querySelector(".nav-brand");
  if (navBrand) {
    navBrand.addEventListener("click", (e) => {
      brandClickCount++;
      if (brandClickTimer) clearTimeout(brandClickTimer);
      if (brandClickCount >= 3) {
        brandClickCount = 0;
        e.preventDefault();
        window.location.href = "/admin/";
        return;
      }
      brandClickTimer = setTimeout(() => {
        brandClickCount = 0;
      }, 700);
    });
  }

  // Run Initial Sync
  syncAllCardUIs();
  updateCartState();
  syncWithBackend();
});
