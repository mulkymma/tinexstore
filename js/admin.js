const LOW_STOCK_DEFAULT = 5;
const ADMIN_SESSION_KEY = "tinex_admin_unlocked";
const ADMIN_USER_SESSION_KEY = "tinex_admin_user";
const ADMIN_AUDIT_SESSION_KEY = "tinex_audit_session";
const SELLER_USERS_STORAGE_KEY = "tinex_seller_users";
const ADMIN_SESSIONS_STORAGE_KEY = "tinex_admin_sessions";
const INVENTORY_AUDIT_STORAGE_KEY = "tinex_inventory_audit";
const DEFAULT_SELLER = {
  id: "seller-demo",
  name: "Demo Seller",
  username: "seller",
  password: "seller-demo",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z"
};
let sales = readSales();
let activePeriod = "day";
let productImage = "";
let currentRole = null;
let currentUser = null;
let currentAuditSessionId = null;
let sellerUsers = readSellerUsers();

function readSales() {
  const saved = localStorage.getItem(SALES_STORAGE_KEY);
  if (!saved) return [];
  const records = JSON.parse(saved);
  if (!Array.isArray(records)) throw new Error("Saved sales data must be a list.");
  return records;
}

function readSellerUsers() {
  const saved = localStorage.getItem(SELLER_USERS_STORAGE_KEY);
  if (!saved) return [{ ...DEFAULT_SELLER }];
  const users = JSON.parse(saved);
  if (!Array.isArray(users)) throw new Error("Saved seller accounts must be a list.");
  return users;
}

function readAuditList(storageKey, label) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];
  const entries = JSON.parse(saved);
  if (!Array.isArray(entries)) throw new Error(`Saved ${label} must be a list.`);
  return entries;
}

function getUserRole(user) {
  return user.role || "seller";
}

function isInventoryEditor() {
  return currentRole === "super-admin" || currentRole === "inventory-manager";
}

function isAuthorizedStaff() {
  if (!["seller", "inventory-manager"].includes(currentRole)) return false;
  const user = readSellerUsers().find(account =>
    account.active &&
    account.username.toLowerCase() === currentUser?.username.toLowerCase() &&
    getUserRole(account) === currentRole
  );
  if (user) return true;
  endCurrentAuditSession();
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
  currentRole = null;
  currentUser = null;
  document.getElementById("admin-dashboard").hidden = true;
  document.getElementById("admin-login").hidden = false;
  document.getElementById("admin-login-error").textContent = "Your access was revoked. Contact the Super admin.";
  return false;
}

function recordStaffSession(user) {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sessions = readAuditList(ADMIN_SESSIONS_STORAGE_KEY, "staff sessions");
  sessions.push({
    id,
    username: user.username,
    name: user.name,
    role: user.role,
    loginAt: new Date().toISOString(),
    logoutAt: null
  });
  localStorage.setItem(ADMIN_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  currentAuditSessionId = id;
  try {
    sessionStorage.setItem(ADMIN_AUDIT_SESSION_KEY, id);
  } catch (error) {
    const session = sessions.find(item => item.id === id);
    session.logoutAt = new Date().toISOString();
    localStorage.setItem(ADMIN_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    throw error;
  }
}

function endCurrentAuditSession() {
  const id = currentAuditSessionId || sessionStorage.getItem(ADMIN_AUDIT_SESSION_KEY);
  if (!id) return;
  const sessions = readAuditList(ADMIN_SESSIONS_STORAGE_KEY, "staff sessions");
  const session = sessions.find(item => item.id === id);
  if (session && !session.logoutAt) {
    session.logoutAt = new Date().toISOString();
    localStorage.setItem(ADMIN_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }
  sessionStorage.removeItem(ADMIN_AUDIT_SESSION_KEY);
  currentAuditSessionId = null;
}

function createInventoryAuditEntry(product, action, quantity = null, details = "") {
  return {
    id: `inventory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: product.id,
    productTitle: product.title,
    productCode: product.code,
    action,
    quantity,
    details,
    actorName: currentUser?.name || "Super admin",
    actorUsername: currentUser?.username || "admin",
    actorRole: currentRole,
    recordedAt: new Date().toISOString()
  };
}

function getProductChangeDetails(previous, next) {
  const fields = [
    ["Name", "title"],
    ["Part number", "code"],
    ["Brand", "brand"],
    ["Price", "price"],
    ["Stock", "stock"],
    ["Restock alert", "reorderAt"],
    ["Description", "desc"]
  ];
  const changes = fields
    .filter(([, key]) => String(previous[key] ?? "") !== String(next[key] ?? ""))
    .map(([label, key]) => `${label}: ${previous[key] || "(empty)"} -> ${next[key] || "(empty)"}`);
  if (previous.image !== next.image) {
    const imageChange = !previous.image ? "added" : !next.image ? "removed" : "replaced";
    changes.push(`Product image ${imageChange}`);
  }
  return changes.join("; ");
}

function commitInventoryUpdate(nextProducts, auditEntries, nextSales = null) {
  const previousProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  const previousSales = nextSales ? localStorage.getItem(SALES_STORAGE_KEY) : null;
  const previousAudit = localStorage.getItem(INVENTORY_AUDIT_STORAGE_KEY);
  let productsSaved = false;
  let salesSaved = false;
  let auditSaved = false;
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
    productsSaved = true;
    if (nextSales) {
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales));
      salesSaved = true;
    }
    const audit = [...readAuditList(INVENTORY_AUDIT_STORAGE_KEY, "inventory activity"), ...auditEntries];
    localStorage.setItem(INVENTORY_AUDIT_STORAGE_KEY, JSON.stringify(audit));
    auditSaved = true;
  } catch (error) {
    try {
      if (productsSaved) {
        if (previousProducts === null) localStorage.removeItem(PRODUCTS_STORAGE_KEY);
        else localStorage.setItem(PRODUCTS_STORAGE_KEY, previousProducts);
      }
      if (salesSaved) {
        if (previousSales === null) localStorage.removeItem(SALES_STORAGE_KEY);
        else localStorage.setItem(SALES_STORAGE_KEY, previousSales);
      }
      if (auditSaved) {
        if (previousAudit === null) localStorage.removeItem(INVENTORY_AUDIT_STORAGE_KEY);
        else localStorage.setItem(INVENTORY_AUDIT_STORAGE_KEY, previousAudit);
      }
    } catch (rollbackError) {
      throw new Error(`${error.message}; saved data could not be fully restored: ${rollbackError.message}`);
    }
    throw error;
  }
  PRODUCTS = nextProducts;
  if (nextSales) sales = nextSales;
  window.dispatchEvent(new CustomEvent("tinex:inventory-updated"));
}

function renderActivityLog() {
  const sessionsTable = document.getElementById("admin-sessions-table");
  const inventoryTable = document.getElementById("inventory-audit-table");
  if (!sessionsTable || !inventoryTable || currentRole !== "super-admin") return;
  const sessions = readAuditList(ADMIN_SESSIONS_STORAGE_KEY, "staff sessions")
    .sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
  const activity = readAuditList(INVENTORY_AUDIT_STORAGE_KEY, "inventory activity")
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  sessionsTable.innerHTML = sessions.length ? sessions.map(session => `<tr>
    <td><strong>${escapeHTML(session.name)}</strong><small>${escapeHTML(session.username)}</small></td>
    <td>${escapeHTML(session.role === "inventory-manager" ? "Inventory staff" : session.role === "super-admin" ? "Super admin" : "Seller")}</td>
    <td>${formatAdminDate(session.loginAt, { dateStyle: "medium", timeStyle: "short" })}</td>
    <td>${session.logoutAt ? formatAdminDate(session.logoutAt, { dateStyle: "medium", timeStyle: "short" }) : "Still signed in"}</td>
  </tr>`).join("") : `<tr><td colspan="4" class="admin-empty">No sign-in sessions recorded yet.</td></tr>`;
  inventoryTable.innerHTML = activity.length ? activity.map(entry => `<tr>
    <td><strong>${escapeHTML(entry.productTitle)}</strong><small>${escapeHTML(entry.productCode || "")}</small></td>
    <td>${escapeHTML(entry.action)}${entry.quantity === null ? "" : ` (${entry.quantity} unit${entry.quantity === 1 ? "" : "s"})`}${entry.details ? `<small>${escapeHTML(entry.details)}</small>` : ""}</td>
    <td><strong>${escapeHTML(entry.actorName)}</strong><small>${escapeHTML(entry.actorRole === "inventory-manager" ? "Inventory staff" : entry.actorRole === "super-admin" ? "Super admin" : "Seller")}</small></td>
    <td>${formatAdminDate(entry.recordedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
  </tr>`).join("") : `<tr><td colspan="4" class="admin-empty">No inventory changes recorded yet.</td></tr>`;
}

function renderSellerUsers() {
  const table = document.getElementById("seller-users-table");
  if (!table) return;
  table.innerHTML = sellerUsers.length ? sellerUsers.map(user => `<tr>
    <td><strong>${escapeHTML(user.name)}</strong></td>
    <td>${escapeHTML(user.username)}</td>
    <td>${getUserRole(user) === "inventory-manager" ? "Inventory staff" : "Seller"}</td>
    <td><span class="stock-status ${user.active ? "available" : "out"}">${user.active ? "Active" : "Access revoked"}</span></td>
    <td>${formatAdminDate(user.createdAt || new Date().toISOString())}</td>
    <td><button class="admin-edit-button" type="button" data-toggle-seller="${escapeHTML(user.id)}" data-active="${user.active ? "true" : "false"}">${user.active ? "Revoke access" : "Restore access"}</button></td>
  </tr>`).join("") : `<tr><td colspan="6" class="admin-empty">No staff accounts yet.</td></tr>`;
}

function getSaleTypeLabel(sale) {
  return sale.saleType === "whatsapp-order" || sale.orderId ? "WhatsApp order" : "Recorded sale";
}

function saveSellerUsers(nextUsers) {
  localStorage.setItem(SELLER_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  sellerUsers = nextUsers;
  renderSellerUsers();
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

function addSellerUser(event) {
  event.preventDefault();
  if (currentRole !== "super-admin") {
    showAdminMessage("Only a Super admin can authorize sellers.", "error");
    return;
  }
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;
  const confirmPassword = form.elements.confirmPassword.value;
  const role = form.elements.role.value;
  if (!name || !/^[a-zA-Z0-9._-]{3,30}$/.test(username) || password.length < 8 || !["seller", "inventory-manager"].includes(role)) {
    showAdminMessage("Enter a name, a 3–30 character username, and a password of at least 8 characters.", "error");
    return;
  }
  if (password !== confirmPassword) {
    showAdminMessage("Passwords do not match. Confirm the seller password and try again.", "error");
    form.elements.confirmPassword.focus();
    return;
  }
  if (sellerUsers.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    showAdminMessage("That username is already assigned. Choose another.", "error");
    return;
  }
  const user = {
    id: `seller-${Date.now()}`,
    name,
    username,
    password,
    role,
    active: true,
    createdAt: new Date().toISOString()
  };
  try {
    saveSellerUsers([...sellerUsers, user]);
  } catch (error) {
    showAdminMessage(`Could not authorize seller: ${error.message}`, "error");
    return;
  }
  form.reset();
  showAdminMessage(`${user.role === "inventory-manager" ? "Inventory staff" : "Seller"} ${name} authorized. Share the username and password privately.`);
}

function toggleSellerAccess(userId) {
  if (currentRole !== "super-admin") {
    showAdminMessage("Only a Super admin can change seller access.", "error");
    return;
  }
  const user = sellerUsers.find(item => item.id === userId);
  if (!user) {
    showAdminMessage("Seller account not found.", "error");
    return;
  }
  try {
    saveSellerUsers(sellerUsers.map(item => item.id === userId ? { ...item, active: !item.active } : item));
  } catch (error) {
    showAdminMessage(`Could not update seller access: ${error.message}`, "error");
    return;
  }
  showAdminMessage(`${user.name}'s access ${user.active ? "revoked" : "restored"}.`);
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
    <td><strong>${escapeHTML(sale.productTitle)}</strong><small>${escapeHTML(sale.code)}</small><span class="admin-sale-type${getSaleTypeLabel(sale) === "WhatsApp order" ? " whatsapp" : ""}">${getSaleTypeLabel(sale)}</span></td>
    <td>${sale.quantity}</td><td>${formatPrice(getSaleRevenue(sale))}</td>
    <td><strong>${escapeHTML(sale.sellerName || (sale.recordedBy === "super-admin" ? "Super admin" : sale.recordedBy || "Legacy sale"))}</strong><small>${formatAdminDate(sale.recordedAt || sale.soldAt, { dateStyle: "medium", timeStyle: "short" })}</small></td>
  </tr>`).join("") : `<tr><td colspan="4" class="admin-empty">No sales recorded yet.</td></tr>`;
}

function renderInventory() {
  const query = document.getElementById("inventory-search").value.trim().toLowerCase();
  const statusFilter = document.getElementById("inventory-status").value;
  const canEdit = isInventoryEditor();
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
      ${canEdit ? `<td><button class="admin-edit-button" type="button" data-edit-product="${escapeHTML(product.id)}">Edit</button></td>` : ""}
    </tr>`;
  }).join("") : `<tr><td colspan="${canEdit ? 6 : 5}" class="admin-empty">No products match these filters.</td></tr>`;

  document.querySelectorAll(".admin-order-product").forEach(select => {
    const previous = select.value;
    select.innerHTML = `<option value="">Select a product</option>${PRODUCTS.map(product =>
      `<option value="${escapeHTML(product.id)}">${escapeHTML(product.title)} (${escapeHTML(product.code)}) — ${product.stock} in stock</option>`
    ).join("")}`;
    if (PRODUCTS.some(product => product.id === previous)) select.value = previous;
    select.disabled = PRODUCTS.length === 0;
  });
  const sellerProduct = document.getElementById("seller-product");
  const previousSellerProduct = sellerProduct.value;
  sellerProduct.innerHTML = `<option value="">Select a product</option>${PRODUCTS.map(product =>
    `<option value="${escapeHTML(product.id)}">${escapeHTML(product.title)} (${escapeHTML(product.code)})</option>`
  ).join("")}`;
  if (PRODUCTS.some(product => product.id === previousSellerProduct)) sellerProduct.value = previousSellerProduct;
  sellerProduct.disabled = PRODUCTS.length === 0;
  const restockProduct = document.getElementById("restock-product");
  const previousRestockProduct = restockProduct.value;
  restockProduct.innerHTML = `<option value="">Select a product</option>${PRODUCTS.map(product =>
    `<option value="${escapeHTML(product.id)}">${escapeHTML(product.title)} (${escapeHTML(product.code)}) — ${product.stock} in stock</option>`
  ).join("")}`;
  if (PRODUCTS.some(product => product.id === previousRestockProduct)) restockProduct.value = previousRestockProduct;
  restockProduct.disabled = !canEdit || PRODUCTS.length === 0;
  if (currentRole === "seller" && !document.querySelector("#order-items .admin-order-item")) addOrderItem();
  if (currentRole === "super-admin") renderDashboard();
  if (currentRole === "super-admin") renderActivityLog();
}

function addOrderItem(productId = "", quantity = 1) {
  if (currentRole !== "seller") return;
  const row = document.createElement("div");
  row.className = "admin-order-item";
  row.innerHTML = `
    <label>Product<select class="admin-order-product" name="productId" required>
      <option value="">Select a product</option>
      ${PRODUCTS.map(product =>
        `<option value="${escapeHTML(product.id)}">${escapeHTML(product.title)} (${escapeHTML(product.code)}) — ${product.stock} in stock</option>`
      ).join("")}
    </select></label>
    <label>Quantity<input name="quantity" type="number" min="1" step="1" value="${quantity}" required /></label>
    <button type="button" class="admin-icon-button" data-remove-order-item aria-label="Remove item">×</button>`;
  row.querySelector(".admin-order-product").value = productId;
  document.getElementById("order-items").append(row);
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
  document.getElementById("period-orders").textContent = new Set(currentSales.map(sale => sale.orderId || sale.id)).size.toLocaleString("en-KE");
  const sorted = [...currentSales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
  document.getElementById("sales-table").innerHTML = sorted.length ? sorted.map(sale => `<tr>
    <td><strong>${escapeHTML(sale.productTitle)}</strong><small>${escapeHTML(sale.code)}</small><span class="admin-sale-type${getSaleTypeLabel(sale) === "WhatsApp order" ? " whatsapp" : ""}">${getSaleTypeLabel(sale)}</span></td>
    <td>${sale.quantity}</td><td>${formatPrice(Number(sale.unitPrice))}</td>
    <td>${formatPrice(getSaleRevenue(sale))}</td>
    <td class="admin-sale-stock-status">
      <span class="stock-status ${sale.stockDeducted === false ? "low" : "available"}">${sale.stockDeducted === false ? "Pending admin" : "Sold — deducted"}</span>
      ${currentRole === "super-admin" && sale.stockDeducted === false
        ? `<button class="admin-edit-button admin-deduct-button" type="button" data-deduct-sale="${escapeHTML(sale.id)}">Deduct stock</button>`
        : ""}
    </td>
    <td><strong>${escapeHTML(sale.sellerName || (sale.recordedBy === "super-admin" ? "Super admin" : sale.recordedBy || "Legacy sale"))}</strong><small>Logged ${formatAdminDate(sale.recordedAt || sale.soldAt, { dateStyle: "medium", timeStyle: "short" })}</small></td>
  </tr>`).join("") : `<tr><td colspan="6" class="admin-empty">No recorded sales for this period.</td></tr>`;
  if (currentRole === "super-admin") renderSellerUsers();
}

function renderAdmin() {
  renderInventory();
  renderSales();
  if (currentRole === "super-admin") renderDashboard();
}

function showProductForm(product = null) {
  if (!isInventoryEditor()) return;
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
  if (!isInventoryEditor() || (currentRole === "inventory-manager" && !isAuthorizedStaff())) {
    showAdminMessage("Only authorized inventory staff can change product details.", "error");
    return;
  }
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
  const previousProduct = PRODUCTS.find(existing => existing.id === productId);
  const stockDifference = product.stock - (previousProduct?.stock || 0);
  const changeDetails = previousProduct
    ? getProductChangeDetails(previousProduct, product)
    : `Initial stock: ${product.stock}`;
  const auditEntry = createInventoryAuditEntry(
    product,
    previousProduct
      ? stockDifference > 0 ? "Product updated; stock added" : stockDifference < 0 ? "Product updated; stock deducted" : "Product details updated"
      : "Product added",
    previousProduct ? Math.abs(stockDifference) : product.stock,
    changeDetails || "Product saved without changes"
  );
  try {
    commitInventoryUpdate(nextProducts, [auditEntry]);
    closeProductForm();
    showAdminMessage(productId ? "Product updated." : "Product added.");
  } catch (error) {
    showAdminMessage(`Could not save product: ${error.message}`, "error");
  }
}

function addStock(event) {
  event.preventDefault();
  if (!isInventoryEditor() || (currentRole === "inventory-manager" && !isAuthorizedStaff())) {
    showAdminMessage("Only authorized inventory staff can adjust stock.", "error");
    return;
  }
  const form = event.currentTarget;
  const product = PRODUCTS.find(item => item.id === form.elements.productId.value);
  const quantity = Number(form.elements.quantity.value);
  const action = form.elements.action.value;
  if (!product || !Number.isInteger(quantity) || quantity <= 0 || !["add", "deduct"].includes(action)) {
    showAdminMessage("Choose a product and enter a positive whole-number quantity.", "error");
    return;
  }
  if (action === "deduct" && quantity > product.stock) {
    showAdminMessage(`Only ${product.stock} ${product.stock === 1 ? "unit is" : "units are"} in stock for ${product.title}.`, "error");
    return;
  }
  const adjustment = action === "deduct" ? -quantity : quantity;
  const nextProducts = PRODUCTS.map(item => item.id === product.id
    ? { ...item, stock: Number(item.stock) + adjustment }
    : item);
  try {
    commitInventoryUpdate(nextProducts, [
      createInventoryAuditEntry(product, action === "deduct" ? "Stock deducted" : "Stock added", quantity)
    ]);
  } catch (error) {
    showAdminMessage(`Could not adjust stock: ${error.message}`, "error");
    return;
  }
  form.elements.quantity.value = 1;
  form.elements.action.value = "add";
  showAdminMessage(`${action === "deduct" ? "Deducted" : "Added"} ${quantity} ${quantity === 1 ? "unit" : "units"} ${action === "deduct" ? "from" : "to"} ${product.title} inventory.`);
}

function confirmOrder(event) {
  event.preventDefault();
  if (currentRole !== "seller") {
    showAdminMessage("Only a Seller can confirm WhatsApp orders.", "error");
    return;
  }
  if (!isAuthorizedStaff()) return;
  const authorizedUser = readSellerUsers().find(user =>
    user.active && user.username.toLowerCase() === currentUser?.username.toLowerCase() && getUserRole(user) === "seller"
  );
  const form = event.currentTarget;
  const recordedAt = new Date().toISOString();
  const requestedItems = [...form.querySelectorAll(".admin-order-item")].map(row => ({
    productId: row.querySelector('[name="productId"]').value,
    quantity: Number(row.querySelector('[name="quantity"]').value)
  }));
  if (!requestedItems.length) {
    showAdminMessage("Add at least one product to the WhatsApp order.", "error");
    return;
  }
  if (requestedItems.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    showAdminMessage("Choose a product and enter a whole-number quantity for every item.", "error");
    return;
  }
  const quantities = new Map();
  requestedItems.forEach(item => quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity));
  const orderProducts = [...quantities].map(([productId, quantity]) => ({
    product: PRODUCTS.find(item => item.id === productId),
    quantity
  }));
  const missingProduct = orderProducts.find(item => !item.product);
  if (missingProduct) {
    showAdminMessage("A selected product is no longer in inventory. Refresh and try again.", "error");
    return;
  }
  const insufficientStock = orderProducts.find(({ product, quantity }) => quantity > product.stock);
  if (insufficientStock) {
    showAdminMessage(`Only ${insufficientStock.product.stock} ${insufficientStock.product.stock === 1 ? "unit is" : "units are"} in stock for ${insufficientStock.product.title}.`, "error");
    return;
  }
  const orderId = `order-${Date.now()}`;
  const orderSales = orderProducts.map(({ product, quantity }, index) => ({
    id: `${orderId}-${index + 1}`,
    orderId,
    productId: product.id,
    productTitle: product.title,
    code: product.code,
    quantity,
    unitPrice: Number(product.price),
    soldAt: recordedAt,
    recordedAt,
    stockDeducted: true,
    recordedBy: authorizedUser.username,
    sellerName: authorizedUser.name,
    saleType: "whatsapp-order"
  }));
  const nextSales = [...sales, ...orderSales];
  const nextProducts = PRODUCTS.map(product => quantities.has(product.id)
    ? { ...product, stock: product.stock - quantities.get(product.id) }
    : product);
  const auditEntries = orderProducts.map(({ product, quantity }) =>
    createInventoryAuditEntry(product, "WhatsApp order stock deducted", quantity, `Order ${orderId}`)
  );
  try {
    commitInventoryUpdate(nextProducts, auditEntries, nextSales);
  } catch (error) {
    showAdminMessage(`Could not confirm order: ${error.message}`, "error");
    return;
  }
  document.getElementById("order-items").replaceChildren();
  addOrderItem();
  showAdminMessage(`WhatsApp order confirmed by ${authorizedUser.name}; stock updated.`);
}

function recordSellerSale(event) {
  event.preventDefault();
  if (currentRole !== "seller") {
    showAdminMessage("Only a Seller can submit a daily sales report this way.", "error");
    return;
  }
  if (!isAuthorizedStaff()) return;
  const form = event.currentTarget;
  const authorizedUser = readSellerUsers().find(user =>
    user.active && user.username.toLowerCase() === currentUser?.username.toLowerCase() && getUserRole(user) === "seller"
  );
  const product = PRODUCTS.find(item => item.id === form.elements.productId.value);
  const quantity = Number(form.elements.quantity.value);
  if (!product || !Number.isInteger(quantity) || quantity <= 0) {
    showAdminMessage("Choose a product and enter a whole-number quantity.", "error");
    return;
  }
  if (quantity > product.stock) {
    showAdminMessage(`Only ${product.stock} ${product.stock === 1 ? "unit is" : "units are"} in stock for ${product.title}.`, "error");
    return;
  }
  const recordedAt = new Date().toISOString();
  const sale = {
    id: `report-${Date.now()}`,
    productId: product.id,
    productTitle: product.title,
    code: product.code,
    quantity,
    unitPrice: Number(product.price),
    soldAt: recordedAt,
    recordedAt,
    stockDeducted: true,
    stockDeductedAt: recordedAt,
    recordedBy: authorizedUser.username,
    sellerName: authorizedUser.name
  };
  const nextSales = [...sales, sale];
  const nextProducts = PRODUCTS.map(item => item.id === product.id
    ? { ...item, stock: item.stock - quantity }
    : item);
  const auditEntry = createInventoryAuditEntry(product, "Seller sale stock deducted", quantity);
  try {
    commitInventoryUpdate(nextProducts, [auditEntry], nextSales);
  } catch (error) {
    showAdminMessage(`Could not save daily sales report: ${error.message}`, "error");
    return;
  }
  renderSales();
  form.elements.quantity.value = 1;
  showAdminMessage(`Sale recorded. ${quantity} ${quantity === 1 ? "unit was" : "units were"} deducted from ${product.title} inventory.`);
}

function deductReportedSale(saleId) {
  if (currentRole !== "super-admin") {
    showAdminMessage("Only a Super admin can deduct stock.", "error");
    return;
  }
  const sale = sales.find(item => item.id === saleId);
  if (!sale || sale.stockDeducted !== false) {
    showAdminMessage("This sales report was not found or has already been processed.", "error");
    return;
  }
  const product = PRODUCTS.find(item => item.id === sale.productId);
  if (!product) {
    showAdminMessage("The reported product is no longer in inventory.", "error");
    return;
  }
  if (sale.quantity > product.stock) {
    showAdminMessage(`Only ${product.stock} ${product.stock === 1 ? "unit is" : "units are"} in stock for ${product.title}.`, "error");
    return;
  }
  const nextProducts = PRODUCTS.map(item => item.id === product.id
    ? { ...item, stock: item.stock - sale.quantity }
    : item);
  const nextSales = sales.map(item => item.id === sale.id
    ? { ...item, stockDeducted: true, stockDeductedAt: new Date().toISOString() }
    : item);
  const auditEntry = createInventoryAuditEntry(product, "Reported sale stock deducted", Number(sale.quantity));
  try {
    commitInventoryUpdate(nextProducts, [auditEntry], nextSales);
  } catch (error) {
    showAdminMessage(`Could not deduct stock: ${error.message}`, "error");
    return;
  }
  renderSales();
  showAdminMessage(`Deducted ${sale.quantity} ${sale.quantity === 1 ? "unit" : "units"} of ${product.title} from stock.`);
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
  if (currentRole !== "super-admin" && ["overview", "users", "activity"].includes(name)) return;
  if (currentRole === "inventory-manager" && name !== "inventory") return;
  document.querySelectorAll(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.panel === name));
  document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${name}`));
}

function setRoleAccess(role) {
  currentRole = role;
  const isSuperAdmin = role === "super-admin";
  const isInventoryManager = role === "inventory-manager";
  const canEditInventory = isSuperAdmin || isInventoryManager;
  document.querySelectorAll("[data-super-admin-only]").forEach(element => {
    element.hidden = !isSuperAdmin;
  });
  document.querySelectorAll("[data-seller-only]").forEach(element => {
    element.hidden = role !== "seller";
  });
  document.querySelectorAll("[data-inventory-access]").forEach(element => {
    element.hidden = !canEditInventory;
  });
  document.getElementById("seller-sale-entry").hidden = role !== "seller";
  document.getElementById("inventory-actions-heading").hidden = !canEditInventory;
  document.getElementById("sales-tab").hidden = isInventoryManager;
  document.getElementById("panel-sales").hidden = isInventoryManager;
  document.getElementById("admin-role-badge").textContent = isSuperAdmin ? "Super admin" : isInventoryManager ? "Inventory staff" : "Seller";
  document.getElementById("dashboard-title").textContent = isSuperAdmin ? "Inventory dashboard" : isInventoryManager ? "Inventory staff dashboard" : "Seller dashboard";
  document.getElementById("dashboard-caption").textContent = isSuperAdmin
    ? "Manage parts, check restock needs, and review sales."
    : isInventoryManager
      ? `Signed in as ${currentUser?.name || "Inventory staff"}. Update products and stock.`
      : `Signed in as ${currentUser?.name || "Seller"}. View inventory and record sales.`;
  document.getElementById("inventory-intro").textContent = canEditInventory
    ? "Add new parts or update their details, price, photo and quantity."
    : "Read-only inventory view. Contact a Super admin to change products or stock.";
  document.getElementById("sales-intro").textContent = isSuperAdmin
    ? "Review sales and inventory changes. Sellers confirm WhatsApp orders and deduct stock."
    : "Record item sales or confirm completed WhatsApp orders. Sale time is recorded automatically.";
  setAdminPanel(isSuperAdmin ? "overview" : isInventoryManager ? "inventory" : "sales");
}

document.addEventListener("DOMContentLoaded", () => {
  const expectedRole = document.body.dataset.adminRole;
  const login = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const lockButton = document.getElementById("admin-lock-button");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const passwordToggle = document.querySelector(".admin-password-toggle");
  const loginError = document.getElementById("admin-login-error");

  function showDashboard(unlocked) {
    login.hidden = unlocked;
    dashboard.hidden = !unlocked;
    lockButton.hidden = !unlocked;
    if (unlocked) {
      setRoleAccess(currentRole);
      renderAdmin();
    } else {
      currentRole = null;
      currentUser = null;
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("admin-username")?.value || "";
    let authenticatedUser;
    try {
      authenticatedUser = window.TINEX_ADMIN_AUTH?.authenticate(passwordInput.value, username);
    } catch (error) {
      loginError.textContent = `Could not load account data: ${error.message}`;
      return;
    }
    const role = authenticatedUser?.role;
    const roleAllowed = expectedRole === "super-admin"
      ? role === "super-admin"
      : ["seller", "inventory-manager"].includes(role);
    if (!roleAllowed) {
      loginError.textContent = "That password is not correct. Try again.";
      passwordInput.focus();
      passwordInput.select();
      return;
    }
    currentRole = role;
    currentUser = authenticatedUser;
    try {
      recordStaffSession(currentUser);
      sessionStorage.setItem(ADMIN_SESSION_KEY, role);
      sessionStorage.setItem(ADMIN_USER_SESSION_KEY, JSON.stringify(currentUser));
    } catch (error) {
      let failureMessage = `Could not record this sign-in: ${error.message}`;
      try {
        endCurrentAuditSession();
      } catch (sessionError) {
        failureMessage = `Could not finish sign-in tracking: ${sessionError.message}`;
      }
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
      currentRole = null;
      currentUser = null;
      loginError.textContent = failureMessage;
      return;
    }
    loginError.textContent = "";
    showDashboard(true);
  });
  lockButton.addEventListener("click", () => {
    try {
      endCurrentAuditSession();
    } catch (error) {
      showAdminMessage(`Could not record sign-out: ${error.message}`, "error");
      return;
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
    currentRole = null;
    currentUser = null;
    showDashboard(false);
  });
  function bindPasswordToggle(toggle, input) {
    toggle.addEventListener("click", () => {
      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";
      toggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(showPassword));
      toggle.classList.toggle("is-visible", showPassword);
    });
  }
  bindPasswordToggle(passwordToggle, passwordInput);
  document.querySelectorAll("#seller-user-form .admin-password-toggle").forEach(toggle => {
    bindPasswordToggle(toggle, document.getElementById(toggle.getAttribute("aria-controls")));
  });
  const savedRole = sessionStorage.getItem(ADMIN_SESSION_KEY);
  const savedRoleAllowed = expectedRole === "super-admin"
    ? savedRole === "super-admin"
    : ["seller", "inventory-manager"].includes(savedRole);
  currentRole = savedRoleAllowed ? savedRole : null;
  if (currentRole) {
    currentUser = JSON.parse(sessionStorage.getItem(ADMIN_USER_SESSION_KEY) || "null");
    if (currentRole !== "super-admin" && (!currentUser || !sellerUsers.some(user =>
      user.active && user.username.toLowerCase() === currentUser.username.toLowerCase() && getUserRole(user) === currentRole
    ))) {
      currentRole = null;
      currentUser = null;
    }
  }
  if (!currentRole) {
    try {
      endCurrentAuditSession();
    } catch (error) {
      loginError.textContent = `Could not record sign-out: ${error.message}`;
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_AUDIT_SESSION_KEY);
  } else {
    currentAuditSessionId = sessionStorage.getItem(ADMIN_AUDIT_SESSION_KEY);
    try {
      const sessions = readAuditList(ADMIN_SESSIONS_STORAGE_KEY, "staff sessions");
      const activeSession = sessions.find(session => session.id === currentAuditSessionId && !session.logoutAt);
      if (!activeSession) {
        recordStaffSession(currentUser);
      }
    } catch (error) {
      currentRole = null;
      currentUser = null;
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_AUDIT_SESSION_KEY);
      loginError.textContent = `Could not restore sign-in tracking: ${error.message}`;
    }
  }
  showDashboard(currentRole !== null);
  window.addEventListener("storage", event => {
    try {
      if (event.key === SELLER_USERS_STORAGE_KEY && ["seller", "inventory-manager"].includes(currentRole)) {
        sellerUsers = readSellerUsers();
        const stillAuthorized = sellerUsers.some(user =>
          user.active &&
          user.username.toLowerCase() === currentUser?.username.toLowerCase() &&
          getUserRole(user) === currentRole
        );
        if (stillAuthorized) return;
        endCurrentAuditSession();
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_USER_SESSION_KEY);
        currentRole = null;
        currentUser = null;
        dashboard.hidden = true;
        login.hidden = false;
        loginError.textContent = "Your access was revoked. Contact the Super admin.";
        return;
      }
      if ([ADMIN_SESSIONS_STORAGE_KEY, INVENTORY_AUDIT_STORAGE_KEY].includes(event.key) && currentRole === "super-admin") {
        renderActivityLog();
      }
    } catch (error) {
      showAdminMessage(`Could not refresh account activity: ${error.message}`, "error");
    }
  });

  document.querySelectorAll(".admin-tab").forEach(button => button.addEventListener("click", () => setAdminPanel(button.dataset.panel)));
  document.querySelectorAll("[data-open-panel]").forEach(button => button.addEventListener("click", () => setAdminPanel(button.dataset.openPanel)));
  document.getElementById("new-product-button").addEventListener("click", () => showProductForm());
  document.getElementById("cancel-product-button").addEventListener("click", closeProductForm);
  document.getElementById("cancel-product-form").addEventListener("click", closeProductForm);
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  document.getElementById("restock-form").addEventListener("submit", addStock);
  document.getElementById("sale-form").addEventListener("submit", confirmOrder);
  document.getElementById("seller-sale-form").addEventListener("submit", recordSellerSale);
  document.getElementById("seller-user-form").addEventListener("submit", addSellerUser);
  document.getElementById("seller-users-table").addEventListener("click", event => {
    const button = event.target.closest("[data-toggle-seller]");
    if (button) toggleSellerAccess(button.dataset.toggleSeller);
  });
  document.getElementById("sales-table").addEventListener("click", event => {
    const button = event.target.closest("[data-deduct-sale]");
    if (button) deductReportedSale(button.dataset.deductSale);
  });
  document.getElementById("add-order-item").addEventListener("click", () => addOrderItem());
  document.getElementById("order-items").addEventListener("click", event => {
    if (!event.target.closest("[data-remove-order-item]")) return;
    event.target.closest(".admin-order-item").remove();
    if (!document.querySelector("#order-items .admin-order-item")) addOrderItem();
  });
  document.getElementById("inventory-search").addEventListener("input", renderInventory);
  document.getElementById("inventory-status").addEventListener("change", renderInventory);
  document.getElementById("inventory-table").addEventListener("click", event => {
    if (!isInventoryEditor() || (currentRole === "inventory-manager" && !isAuthorizedStaff())) return;
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
});

window.addEventListener("tinex:inventory-updated", () => {
  if (!document.getElementById("admin-dashboard").hidden) renderAdmin();
});

window.addEventListener("storage", event => {
  try {
    if (event.key === SELLER_USERS_STORAGE_KEY) {
      sellerUsers = readSellerUsers();
      if (currentRole === "super-admin") renderSellerUsers();
      return;
    }
    if (event.key !== SALES_STORAGE_KEY) return;
    const records = event.newValue ? JSON.parse(event.newValue) : [];
    if (!Array.isArray(records)) throw new Error("Saved sales data must be a list.");
    sales = records;
    if (!document.getElementById("admin-dashboard").hidden) renderAdmin();
  } catch (error) {
    showAdminMessage(`Could not load updated sales reports: ${error.message}`, "error");
  }
});