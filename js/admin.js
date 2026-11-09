const LOW_STOCK_DEFAULT = 5;
const DEMO_ADMIN_PASSWORD = "tinex-demo";
const ADMIN_SESSION_KEY = "tinex_admin_unlocked";
let sales = readSales();
let activePeriod = "day";
let productImage = "";

function readSales() {
  const saved = localStorage.getItem(SALES_STORAGE_KEY);
  if (!saved) return [];
  const records = JSON.parse(saved);
  if (!Array.isArray(records)) throw new Error("Saved sales data must be a list.");
  return records;
}

function showAdminMessage(message, type = "success") {
  const element = document.getElementById("admin-message");
  element.textContent = message;
  element.className = `admin-message visible ${type}`;
  window.clearTimeout(showAdminMessage.timeout);
  showAdminMessage.timeout = window.setTimeout(() => {
    element.className = "admin-message";
  }, 5000);
}

function getReorderAt(product) {
  return Number.isInteger(Number(product.reorderAt))
    ? Number(product.reorderAt)
    : LOW_STOCK_DEFAULT;
}

function getStockStatus(product) {
  if (product.stock <= 0) return { label: "Out of stock", className: "out" };
  if (product.stock <= getReorderAt(product)) return { label: "Restock soon", className: "low" };
  return { label: "In stock", className: "available" };
}

function formatAdminDate(value, options = { dateStyle: "medium" }) {
  return new Date(value).toLocaleString("en-KE", options);
}

function getLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getPeriodSales(period = activePeriod) {
  const now = new Date();
  return sales.filter(sale => {
    const date = new Date(sale.soldAt);
    if (Number.isNaN(date.getTime())) return false;
    if (period === "day") return getLocalDate(date) === getLocalDate(now);
    if (period === "week") return date >= startOfWeek(now) && date <= now;
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function getSaleRevenue(sale) {
  return Number(sale.unitPrice) * Number(sale.quantity);
}

function renderDashboard() {
  const lowStock = PRODUCTS.filter(product => product.stock <= getReorderAt(product));
  const todaySales = getPeriodSales("day");
  document.getElementById("stat-products").textContent = PRODUCTS.length;
  document.getElementById("stat-units").textContent = PRODUCTS.reduce((sum, product) => sum + Number(product.stock), 0).toLocaleString("en-KE");
  document.getElementById("stat-restock").textContent = lowStock.length;
  document.getElementById("stat-sales-today").textContent = formatPrice(todaySales.reduce((sum, sale) => sum + getSaleRevenue(sale), 0));
  document.getElementById("stat-sales-count").textContent = `${todaySales.reduce((sum, sale) => sum + Number(sale.quantity), 0)} items sold`;

  const restockTable = document.getElementById("restock-table");
  restockTable.innerHTML = lowStock.length ? lowStock.map(product => {
    const status = getStockStatus(product);
    return `<tr>
      <td><strong>${escapeHTML(product.title)}</strong><small>${escapeHTML(product.code)}</small></td>
      <td>${product.stock}</td><td>${getReorderAt(product)}</td>
      <td><span class="stock-status ${status.className}">${status.label}</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" class="admin-empty">All products are above their reorder levels.</td></tr>`;

  const latest = [...sales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 6);
  document.getElementById("recent-sales-table").innerHTML = latest.length ? latest.map(sale => `<tr>
    <td><strong>${escapeHTML(sale.productTitle)}</strong><small>${escapeHTML(sale.code)}</small></td>
    <td>${sale.quantity}</td><td>${formatPrice(getSaleRevenue(sale))}</td><td>${formatAdminDate(sale.soldAt)}</td>
  </tr>`).join("") : `<tr><td colspan="4" class="admin-empty">No sales recorded yet.</td></tr>`;
}

function renderInventory() {
  const query = document.getElementById("inventory-search").value.trim().toLowerCase();
  const statusFilter = document.getElementById("inventory-status").value;
  const filtered = PRODUCTS.filter(product => {
    const matchesText = [product.title, product.code, product.brand].some(value => String(value).toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "restock" && product.stock <= getReorderAt(product)) ||
      (statusFilter === "available" && product.stock > 0) ||
      (statusFilter === "out" && product.stock <= 0);
    return matchesText && matchesStatus;
  });

  document.getElementById("inventory-table").innerHTML = filtered.length ? filtered.map(product => {
    const status = getStockStatus(product);
    const image = product.image
      ? `<img class="admin-product-thumb" src="${escapeHTML(product.image)}" alt="">`
      : `<span class="admin-product-thumb admin-product-placeholder">⚙</span>`;
    return `<tr>
      <td><div class="admin-product-cell">${image}<span><strong>${escapeHTML(product.title)}</strong><small>${escapeHTML(product.brand)}</small></span></div></td>
      <td>${escapeHTML(product.code)}</td><td>${formatPrice(Number(product.price))}</td>
      <td><strong>${product.stock}</strong><small>Reorder at ${getReorderAt(product)}</small></td>
      <td><span class="stock-status ${status.className}">${status.label}</span></td>
      <td><button class="admin-edit-button" type="button" data-edit-product="${escapeHTML(product.id)}">Edit</button></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="admin-empty">No products match these filters.</td></tr>`;

  const select = document.getElementById("sale-product");
  const previous = select.value;
  select.innerHTML = PRODUCTS.length
    ? PRODUCTS.map(product => `<option value="${escapeHTML(product.id)}">${escapeHTML(product.title)} (${escapeHTML(product.code)}) — ${product.stock} in stock</option>`).join("")
    : `<option value="">Add a product to record a sale</option>`;
  if (PRODUCTS.some(product => product.id === previous)) select.value = previous;
  select.disabled = PRODUCTS.length === 0;
  renderDashboard();
}

function renderSales() {
  const currentSales = getPeriodSales();
  const units = currentSales.reduce((sum, sale) => sum + Number(sale.quantity), 0);
  const revenue = currentSales.reduce((sum, sale) => sum + getSaleRevenue(sale), 0);
  const captions = {
    day: "Totals for today.",
    week: "Totals for this week (Monday to today).",
    month: "Totals for this calendar month."
  };
  document.getElementById("sales-period-caption").textContent = captions[activePeriod];
  document.getElementById("period-revenue").textContent = formatPrice(revenue);
  document.getElementById("period-units").textContent = units.toLocaleString("en-KE");
  document.getElementById("period-orders").textContent = currentSales.length.toLocaleString("en-KE");
  const sorted = [...currentSales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
  document.getElementById("sales-table").innerHTML = sorted.length ? sorted.map(sale => `<tr>
    <td><strong>${escapeHTML(sale.productTitle)}</strong><small>${escapeHTML(sale.code)}</small></td>
    <td>${sale.quantity}</td><td>${formatPrice(Number(sale.unitPrice))}</td>
    <td>${formatPrice(getSaleRevenue(sale))}</td><td>${formatAdminDate(sale.soldAt)}</td>
  </tr>`).join("") : `<tr><td colspan="5" class="admin-empty">No recorded sales for this period.</td></tr>`;
}

function renderAdmin() {
  renderInventory();
  renderSales();
}

function showProductForm(product = null) {
  const card = document.getElementById("product-form-card");
  const form = document.getElementById("product-form");
  form.reset();
  form.elements.productId.value = product?.id || "";
  form.elements.title.value = product?.title || "";
  form.elements.code.value = product?.code || "";
  form.elements.brand.value = product?.brand || "Bajaj";
  form.elements.price.value = product?.price ?? "";
  form.elements.stock.value = product?.stock ?? 0;
  form.elements.reorderAt.value = getReorderAt(product || {});
  form.elements.desc.value = product?.desc || "";
  productImage = product?.image || "";
  document.getElementById("product-form-heading").textContent = product ? "Edit product" : "Add product";
  renderImagePreview();
  card.hidden = false;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderImagePreview() {
  const preview = document.getElementById("product-image-preview");
  preview.hidden = !productImage;
  preview.innerHTML = productImage ? `<img src="${escapeHTML(productImage)}" alt="Product image preview"><span>Product image</span>` : "";
  document.getElementById("remove-image-button").hidden = !productImage;
}

function closeProductForm() {
  document.getElementById("product-form-card").hidden = true;
  document.getElementById("product-form").reset();
  productImage = "";
  document.getElementById("product-image-preview").hidden = true;
}

function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const productId = form.elements.productId.value;
  const code = form.elements.code.value.trim();
  const duplicate = PRODUCTS.some(product => product.id !== productId && product.code.toLowerCase() === code.toLowerCase());
  if (duplicate) {
    showAdminMessage("A product with this part number already exists.", "error");
    form.elements.code.focus();
    return;
  }
  const product = {
    id: productId || `product-${Date.now()}`,
    title: form.elements.title.value.trim(),
    code,
    brand: form.elements.brand.value,
    price: Number(form.elements.price.value),
    stock: Number(form.elements.stock.value),
    reorderAt: Number(form.elements.reorderAt.value),
    desc: form.elements.desc.value.trim(),
    image: productImage
  };
  if (!product.title || !product.code || !Number.isFinite(product.price) || !Number.isInteger(product.stock) || product.stock < 0) {
    showAdminMessage("Enter a product name, part number, valid price and whole-number stock quantity.", "error");
    return;
  }
  const nextProducts = productId
    ? PRODUCTS.map(existing => existing.id === productId ? product : existing)
    : [...PRODUCTS, product];
  try {
    persistProducts(nextProducts);
    closeProductForm();
    showAdminMessage(productId ? "Product updated." : "Product added.");
  } catch (error) {
    showAdminMessage(`Could not save product: ${error.message}`, "error");
  }
}

function recordSale(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const product = PRODUCTS.find(item => item.id === form.elements.productId.value);
  const quantity = Number(form.elements.quantity.value);
  const soldAt = new Date(form.elements.soldAt.value);
  if (!product || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(soldAt.getTime())) {
    showAdminMessage("Choose a product, quantity and valid sale date.", "error");
    return;
  }
  if (quantity > product.stock) {
    showAdminMessage(`Only ${product.stock} ${product.stock === 1 ? "unit is" : "units are"} in stock. Update inventory before recording this sale.`, "error");
    return;
  }
  const sale = {
    id: `sale-${Date.now()}`,
    productId: product.id,
    productTitle: product.title,
    code: product.code,
    quantity,
    unitPrice: Number(product.price),
    soldAt: soldAt.toISOString()
  };
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify([...sales, sale]));
    sales = [...sales, sale];
    persistProducts(PRODUCTS.map(item => item.id === product.id ? { ...item, stock: item.stock - quantity } : item));
    form.elements.quantity.value = 1;
    form.elements.soldAt.value = getNowForDateInput();
    showAdminMessage("Sale recorded and stock updated.");
  } catch (error) {
    showAdminMessage(`Could not record sale: ${error.message}`, "error");
  }
}

function getNowForDateInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function loadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showAdminMessage("Choose an image file.", "error");
    event.target.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showAdminMessage("Image must be 2 MB or smaller.", "error");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") {
      showAdminMessage("Could not read the selected image.", "error");
      return;
    }
    productImage = reader.result;
    renderImagePreview();
  };
  reader.onerror = () => showAdminMessage("Could not read the selected image.", "error");
  reader.readAsDataURL(file);
}

function setAdminPanel(name) {
  document.querySelectorAll(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.panel === name));
  document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${name}`));
}

document.addEventListener("DOMContentLoaded", () => {
  const login = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const lockButton = document.getElementById("admin-lock-button");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");

  function showDashboard(unlocked) {
    login.hidden = unlocked;
    dashboard.hidden = !unlocked;
    lockButton.hidden = !unlocked;
    if (unlocked) {
      renderAdmin();
    } else {
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    if (passwordInput.value !== DEMO_ADMIN_PASSWORD) {
      loginError.textContent = "That password is not correct. Try again.";
      passwordInput.focus();
      passwordInput.select();
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    loginError.textContent = "";
    showDashboard(true);
  });
  lockButton.addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showDashboard(false);
  });
  showDashboard(sessionStorage.getItem(ADMIN_SESSION_KEY) === "true");

  document.querySelectorAll(".admin-tab").forEach(button => button.addEventListener("click", () => setAdminPanel(button.dataset.panel)));
  document.querySelectorAll("[data-open-panel]").forEach(button => button.addEventListener("click", () => setAdminPanel(button.dataset.openPanel)));
  document.getElementById("new-product-button").addEventListener("click", () => showProductForm());
  document.getElementById("cancel-product-button").addEventListener("click", closeProductForm);
  document.getElementById("cancel-product-form").addEventListener("click", closeProductForm);
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  document.getElementById("sale-form").addEventListener("submit", recordSale);
  document.getElementById("inventory-search").addEventListener("input", renderInventory);
  document.getElementById("inventory-status").addEventListener("change", renderInventory);
  document.getElementById("inventory-table").addEventListener("click", event => {
    const button = event.target.closest("[data-edit-product]");
    if (!button) return;
    const product = PRODUCTS.find(item => item.id === button.dataset.editProduct);
    if (product) showProductForm(product);
  });
  document.getElementById("product-image-file").addEventListener("change", loadImage);
  document.getElementById("remove-image-button").addEventListener("click", () => {
    productImage = "";
    document.getElementById("product-image-file").value = "";
    renderImagePreview();
  });
  document.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => {
    activePeriod = button.dataset.period;
    document.querySelectorAll("[data-period]").forEach(item => item.classList.toggle("active", item === button));
    renderSales();
  }));
  document.getElementById("sale-date").value = getNowForDateInput();
});

window.addEventListener("tinex:inventory-updated", () => {
  if (!document.getElementById("admin-dashboard").hidden) renderAdmin();
});