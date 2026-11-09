// TINEX AUTO COMPONENTS - Store Logic

const DEFAULT_PRODUCTS = [
  {
    id: "1a010161",
    title: "3-Speed Gear 2nd",
    code: "1A010161",
    brand: "Bajaj",
    price: 1850,
    stock: 12,
    desc: "Genuine 3-speed second gear for Bajaj three-wheelers."
  },
  {
    id: "kit95036",
    title: "Shoe Hold Down Kit",
    code: "KIT95036",
    brand: "Bajaj",
    price: 320,
    stock: 25,
    desc: "Complete shoe hold down kit for brake assembly."
  },
  {
    id: "1a010162",
    title: "Speed Gear 3rd",
    code: "1A010162",
    brand: "Bajaj",
    price: 2100,
    stock: 8,
    desc: "Third speed gear for Bajaj transmission."
  },
  {
    id: "b023890",
    title: "Clutch Spring",
    code: "B023890",
    brand: "Bajaj",
    price: 45,
    stock: 50,
    desc: "High-quality clutch spring for Bajaj engines."
  },
  {
    id: "aa191139",
    title: "Accelerator Cable",
    code: "AA191139",
    brand: "Bajaj",
    price: 280,
    stock: 18,
    desc: "Genuine accelerator cable for Bajaj tuk-tuks."
  },
  {
    id: "aa121150",
    title: "Air Cleaner",
    code: "AA121150",
    brand: "Bajaj",
    price: 950,
    stock: 0,
    desc: "Air cleaner / filter assembly for Bajaj."
  },
  {
    id: "6c000362",
    title: "Rear Suspension Arm LH with Bush",
    code: "6C000362",
    brand: "Bajaj",
    price: 3200,
    stock: 5,
    desc: "Left-hand rear suspension arm assembly with bush."
  },
  {
    id: "b003388",
    title: "Armature POP",
    code: "B003388",
    brand: "Bajaj",
    price: 1450,
    stock: 7,
    desc: "Armature for starter / POP system."
  },
  {
    id: "e43507784",
    title: "Muffler Assembly",
    code: "E43507784",
    brand: "Piaggio",
    price: 2750,
    stock: 4,
    desc: "Complete muffler assembly for Piaggio Ape."
  },
  {
    id: "an101337",
    title: "Differential Gear Assembly",
    code: "AN101337",
    brand: "Piaggio",
    price: 4800,
    stock: 3,
    desc: "Differential gear assembly for Piaggio three-wheelers."
  },
  {
    id: "632477r",
    title: "Headlamp with Lateral Lamp RH",
    code: "632477R",
    brand: "Piaggio",
    price: 1650,
    stock: 9,
    desc: "Right-hand headlamp assembly with lateral lamp."
  },
  {
    id: "aa191092",
    title: "Clutch Cable",
    code: "AA191092",
    brand: "Bajaj",
    price: 260,
    stock: 22,
    desc: "Genuine clutch cable for Bajaj."
  }
];

const PRODUCTS_STORAGE_KEY = "tinex_products";
const SALES_STORAGE_KEY = "tinex_sales";

function loadProducts() {
  const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!saved) return DEFAULT_PRODUCTS.map(product => ({ ...product }));
  const products = JSON.parse(saved);
  if (!Array.isArray(products)) {
    throw new Error("Saved inventory must be a list of products.");
  }
  return products;
}

let PRODUCTS = loadProducts();

function persistProducts(products) {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  PRODUCTS = products;
  window.dispatchEvent(new CustomEvent("tinex:inventory-updated"));
}

window.addEventListener("storage", event => {
  if (event.key !== PRODUCTS_STORAGE_KEY || !event.newValue) return;
  const products = JSON.parse(event.newValue);
  if (!Array.isArray(products)) return;
  PRODUCTS = products;
  window.dispatchEvent(new CustomEvent("tinex:inventory-updated"));
});

const WHATSAPP_NUMBER = "254759417020"; // international format without +

// Business email that receives contact form messages.
const BUSINESS_EMAIL = "mulkymohammed92@gmail.com";

// Cart state
let cart = JSON.parse(localStorage.getItem("tinex_cart") || "[]");

function saveCart() {
  localStorage.setItem("tinex_cart", JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < product.stock) existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart();
  openCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  const product = PRODUCTS.find(p => p.id === productId);
  if (delta > 0 && (!product || item.qty >= product.stock)) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function formatPrice(n) {
  return "KSh " + n.toLocaleString("en-KE");
}

function updateCartUI() {
  const countEl = document.getElementById("cart-count");
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const whatsappBtn = document.getElementById("whatsapp-order");

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  if (countEl) {
    countEl.textContent = totalQty;
    countEl.style.display = totalQty > 0 ? "flex" : "none";
  }

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">
      <div style="font-size:2.5rem;margin-bottom:0.5rem;">🛒</div>
      <p>Your cart is empty</p>
      <p style="font-size:0.85rem;margin-top:0.5rem;">Add genuine Bajaj & Piaggio parts to get started.</p>
    </div>`;
    if (totalEl) totalEl.textContent = "KSh 0";
    if (whatsappBtn) whatsappBtn.disabled = true;
    return;
  }

  itemsEl.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return "";
    return `
      <div class="cart-item">
        <div class="cart-item-img">⚙️</div>
        <div class="cart-item-info">
          <h4>${p.title}</h4>
          <div class="code">${p.code}</div>
          <div class="cart-item-price">${formatPrice(p.price * item.qty)}</div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="updateQty('${p.id}', -1)">−</button>
            <span style="min-width:24px;text-align:center;font-weight:600;">${item.qty}</span>
            <button class="qty-btn" onclick="updateQty('${p.id}', 1)">+</button>
            <button class="qty-btn" style="margin-left:auto;color:#ef4444;" onclick="removeFromCart('${p.id}')" title="Remove">×</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
  if (whatsappBtn) whatsappBtn.disabled = false;
}

function openCart() {
  document.getElementById("cart-overlay")?.classList.add("open");
  document.getElementById("cart-drawer")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cart-overlay")?.classList.remove("open");
  document.getElementById("cart-drawer")?.classList.remove("open");
  document.body.style.overflow = "";
}

function orderViaWhatsApp() {
  if (cart.length === 0) return;

  let message = "Hello TINEX AUTO COMPONENTS,%0A%0AI would like to order the following parts:%0A%0A";
  cart.forEach(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (p) {
      message += `• ${p.title} (${p.code}) × ${item.qty} — ${formatPrice(p.price * item.qty)}%0A`;
    }
  });
  message += `%0A*Total: ${formatPrice(getCartTotal())}*%0A%0APlease confirm availability and arrange pickup/payment. Thank you!`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank");
}

function renderProductCard(p) {
  const soldOut = p.stock <= 0;
  const image = p.image
    ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy">`
    : `<div class="icon">⚙️</div><div>Image Placeholder</div>`;
  return `
    <div class="product-card" data-brand="${escapeHTML(p.brand)}">
      <div class="product-image">
        ${soldOut ? '<span class="product-badge soldout">Out of stock</span>' : (p.stock < 6 ? '<span class="product-badge">Low stock</span>' : '')}
        <div class="${p.image ? "product-photo" : ""}">
          ${image}
          ${p.image ? "" : `<div style="font-size:0.75rem;margin-top:0.25rem;opacity:0.7;">${escapeHTML(p.brand)}</div>`}
        </div>
      </div>
      <div class="product-body">
        <div class="product-title">${escapeHTML(p.title)}</div>
        <div class="product-code">${escapeHTML(p.code)}</div>
        <div class="product-meta">
          <div class="product-price">${formatPrice(p.price)}</div>
          <button class="btn-add" ${soldOut ? "disabled" : ""} onclick="addToCart('${p.id}')">
            ${soldOut ? "Out of stock" : "Add"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return;
  const featured = PRODUCTS.slice(0, 8);
  container.innerHTML = featured.map(renderProductCard).join("");
}

function renderCatalog(filterBrand = "all") {
  const container = document.getElementById("catalog-products");
  if (!container) return;
  const filtered = filterBrand === "all" 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.brand === filterBrand);
  container.innerHTML = filtered.map(renderProductCard).join("");
}

function setFilter(brand) {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.brand === brand);
  });
  renderCatalog(brand);
}

function openMobileNav() {
  document.getElementById("mobile-nav")?.classList.add("open");
  document.getElementById("mobile-nav-overlay")?.classList.add("open");
}

function closeMobileNav() {
  document.getElementById("mobile-nav")?.classList.remove("open");
  document.getElementById("mobile-nav-overlay")?.classList.remove("open");
}

/**
 * Contact form handler.
 * Opens the visitor's email client with a pre-filled message
 * addressed to BUSINESS_EMAIL.
 * For production server-side delivery, replace with Formspree / EmailJS / backend.
 */
function sendContactEmail(event) {
  event.preventDefault();

  const name = document.getElementById("name")?.value?.trim() || "";
  const phone = document.getElementById("phone")?.value?.trim() || "";
  const email = document.getElementById("email")?.value?.trim() || "";
  const message = document.getElementById("message")?.value?.trim() || "";

  if (!name || !phone || !message) {
    alert("Please fill in your name, phone and message.");
    return;
  }

  const subject = encodeURIComponent(`TINEX enquiry from ${name}`);
  const body = encodeURIComponent(
    `Name: ${name}\n` +
    `Phone / WhatsApp: ${phone}\n` +
    (email ? `Email: ${email}\n` : "") +
    `\nMessage:\n${message}\n\n` +
    `---\nSent from TINEX AUTO COMPONENTS website contact form`
  );

  // Opens the user's default email app addressed to the business
  window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;

  // Optional: also offer WhatsApp as a quick alternative
  setTimeout(() => {
    const useWhatsApp = confirm(
      "Your email app should open.\n\nWould you also like to send the same message via WhatsApp for a faster reply?"
    );
    if (useWhatsApp) {
      const waText = encodeURIComponent(
        `Hello TINEX AUTO COMPONENTS,\n\nName: ${name}\nPhone: ${phone}\n\n${message}`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`, "_blank");
    }
  }, 600);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  updateCartUI();
  renderFeaturedProducts();
  renderCatalog();
});

window.addEventListener("tinex:inventory-updated", () => {
  updateCartUI();
  renderFeaturedProducts();
  const activeFilter = document.querySelector(".filter-btn.active");
  renderCatalog(activeFilter?.dataset.brand || "all");
});