const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

lucide.createIcons();

const navWrap = $(".nav-wrap");
const progress = $(".progress span");
const glow = $(".cursor-glow");

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${Math.max(0, Math.min(100, scrollY / max * 100))}%`;
  navWrap.classList.toggle("scrolled", scrollY > 20);

  const sections = $$("main section[id]");
  const pos = scrollY + 130;
  let active = "beranda";
  sections.forEach(s => { if (pos >= s.offsetTop) active = s.id; });
  $$(".nav-link").forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${active}`));
});

window.addEventListener("mousemove", e => {
  glow.style.left = `${e.clientX}px`;
  glow.style.top = `${e.clientY}px`;
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: .12 });
$$(".reveal").forEach(el => revealObserver.observe(el));

$$(".tilt").forEach(card => {
  card.addEventListener("mousemove", e => {
    if (matchMedia("(pointer: coarse)").matches) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 5}deg) translateY(-3px)`;
  });
  card.addEventListener("mouseleave", () => card.style.transform = "");
});

const toggle = $(".menu-toggle");
const navLinks = $(".nav-links");
toggle.addEventListener("click", () => navLinks.classList.toggle("open"));
$$(".nav-link").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

$$(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    $$(".menu-card").forEach(card => {
      const show = filter === "all" || card.dataset.category.split(" ").includes(filter);
      card.classList.toggle("hide", !show);
    });
  });
});

const modal = $("#orderModal");
const orderList = $("#orderList");
const emptyOrder = $("#emptyOrder");
const totalQty = $("#totalQty");
const totalPrice = $("#totalPrice");
const toast = $("#toast");
const orders = new Map();
const PRICE = 1000;
const MIN = 50;

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderOrders();
}
function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function showToast(text) {
  $(".toast span").textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1500);
}
function addOrder(name) {
  orders.set(name, (orders.get(name) || 0) + MIN);
  showToast(`${name} ditambahkan (${MIN} pcs)`);
  openModal();
}
function renderOrders() {
  orderList.innerHTML = "";
  let qty = 0;
  if (!orders.size) {
    emptyOrder.style.display = "block";
  } else {
    emptyOrder.style.display = "none";
    orders.forEach((q, name) => {
      qty += q;
      const row = document.createElement("div");
      row.className = "order-item";
      row.innerHTML = `
        <div><strong>${name}</strong><small>Rp${PRICE.toLocaleString("id-ID")}/pcs · minimum 50 pcs</small></div>
        <div class="qty">
          <button data-act="minus" data-name="${name}">−</button>
          <span>${q}</span>
          <button data-act="plus" data-name="${name}">+</button>
        </div>`;
      orderList.appendChild(row);
    });
  }
  totalQty.textContent = qty.toLocaleString("id-ID");
  totalPrice.textContent = `Rp${(qty * PRICE).toLocaleString("id-ID")}`;
}
$$(".add-btn").forEach(btn => btn.addEventListener("click", () => addOrder(btn.dataset.item)));
$("#openOrder").addEventListener("click", openModal);

modal.addEventListener("click", e => {
  const close = e.target.closest("[data-close]");
  if (close) closeModal();
  const button = e.target.closest("[data-act]");
  if (!button) return;
  const name = button.dataset.name;
  const q = orders.get(name) || MIN;
  if (button.dataset.act === "plus") orders.set(name, q + MIN);
  if (button.dataset.act === "minus") {
    if (q <= MIN) orders.delete(name);
    else orders.set(name, q - MIN);
  }
  renderOrders();
});

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

$("#sendOrder").addEventListener("click", () => {
  if (!orders.size) {
    showToast("Pilih menu terlebih dahulu");
    return;
  }
  let message = "Halo Dapur Saluyu, saya ingin memesan:%0A%0A";
  let total = 0;
  orders.forEach((q, name) => {
    message += `• ${name}: ${q} pcs%0A`;
    total += q * PRICE;
  });
  message += `%0AEstimasi total: Rp${total.toLocaleString("id-ID")}%0A%0AMohon konfirmasi ketersediaan dan jadwalnya ya.`;
  // Ganti nomor ini dengan nomor bisnis Dapur Saluyu, format internasional tanpa +.
  const whatsappNumber = "62895634751493";
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
});

$("#year").textContent = new Date().getFullYear();
