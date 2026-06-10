const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackCategories = [
  { id: "all", name: "Hamısı", slug: "all" },
  { id: "living", name: "Qonaq otağı", slug: "qonaq-otagi" },
  { id: "bedroom", name: "Yataq otağı", slug: "yataq-otagi" },
  { id: "kitchen", name: "Mətbəx", slug: "metbex" },
  { id: "office", name: "Ofis", slug: "ofis" }
];

const fallbackProducts = [
  {
    id: "p1",
    category_id: "living",
    name: "Milano künc divan",
    sku: "AG-001",
    price: 1850,
    sale_price: 1690,
    colors: ["qəhvəyi", "maloçnu", "qara"],
    material: "Premium parça, metal ayaq",
    width_cm: 320,
    height_cm: 82,
    length_cm: 240,
    depth_cm: 96,
    image_url: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1000&q=82",
    description: "Geniş ailə zonası üçün yumşaq oturumlu, ölçüyə uyğun rəng seçimi olan künc divan.",
    stock_status: "in_stock",
    featured: true,
    is_active: true,
    created_at: "2026-01-01"
  },
  {
    id: "p2",
    category_id: "bedroom",
    name: "Luna yataq dəsti",
    sku: "AG-012",
    price: 2400,
    sale_price: null,
    colors: ["ağ", "maloçnu", "qəhvəyi"],
    material: "MDF, yumşaq başlıq",
    width_cm: 280,
    height_cm: 220,
    length_cm: 210,
    depth_cm: 60,
    image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=82",
    description: "Dolab, çarpayı və tumba komplektindən ibarət modern yataq otağı həlli.",
    stock_status: "preorder",
    featured: true,
    is_active: true,
    created_at: "2026-01-02"
  },
  {
    id: "p3",
    category_id: "kitchen",
    name: "Bərdə mətbəx sistemi",
    sku: "AG-021",
    price: 1250,
    sale_price: null,
    colors: ["qara", "sarı", "ağ"],
    material: "Akril fasad, MDF korpus",
    width_cm: 360,
    height_cm: 240,
    length_cm: null,
    depth_cm: 60,
    image_url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=82",
    description: "Məkan ölçüsünə görə hazırlanan kompakt, işıqlı və funksional mətbəx mebeli.",
    stock_status: "preorder",
    featured: false,
    is_active: true,
    created_at: "2026-01-03"
  },
  {
    id: "p4",
    category_id: "office",
    name: "Nero ofis masası",
    sku: "AG-034",
    price: 620,
    sale_price: 540,
    colors: ["qara", "qəhvəyi"],
    material: "Laminat, metal karkas",
    width_cm: 160,
    height_cm: 75,
    length_cm: 70,
    depth_cm: 70,
    image_url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=82",
    description: "Ev və ofis üçün kabel çıxışlı, möhkəm karkaslı minimal masa.",
    stock_status: "in_stock",
    featured: false,
    is_active: true,
    created_at: "2026-01-04"
  }
];

const rooms = [
  ["Qonaq otağı", "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=82"],
  ["Yataq otağı", "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=82"],
  ["Mətbəx", "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?auto=format&fit=crop&w=900&q=82"],
  ["Ofis", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=82"]
];

const state = {
  categories: [],
  products: [],
  leads: [],
  settings: {
    store_name: "AYDINOĞLU GROUP",
    phone: "+994502097255",
    whatsapp: "+994502097254",
    address: "Bərdə Şəhər Bayraq Meydanının yanı",
    instagram_url: "",
    working_hours: "Hər gün 09:00-20:00"
  },
  filter: "all",
  search: "",
  sort: "featured",
  user: null,
  isAdmin: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function money(value) {
  if (!value) return "Qiymət soruş";
  return `${Number(value).toLocaleString("az-AZ")} AZN`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeProduct(product) {
  return {
    ...product,
    colors: Array.isArray(product.colors)
      ? product.colors
      : String(product.colors || "").split(",").map((x) => x.trim()).filter(Boolean)
  };
}

async function safeQuery(query, fallback) {
  if (!db) return fallback;
  const { data, error } = await query;
  if (error) {
    console.warn(error.message);
    return fallback;
  }
  return data || fallback;
}

async function loadData() {
  const [categories, products, settings] = await Promise.all([
    safeQuery(db?.from("categories").select("*").order("sort_order", { ascending: true }), fallbackCategories.filter((x) => x.id !== "all")),
    safeQuery(db?.from("products").select("*").eq("is_active", true).order("featured", { ascending: false }).order("created_at", { ascending: false }), fallbackProducts),
    safeQuery(db?.from("store_settings").select("*").limit(1).maybeSingle(), state.settings)
  ]);

  state.categories = [{ id: "all", name: "Hamısı", slug: "all" }, ...categories];
  state.products = products.map(normalizeProduct);
  state.settings = settings || state.settings;
  renderAll();
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderRooms();
  renderLeadSelect();
  renderAdminSelectors();
  renderSettingsForm();
  $("#metricProducts").textContent = state.products.length;
  const featured = state.products.find((x) => x.featured) || state.products[0];
  if (featured) $("#heroFeaturedPrice").textContent = money(featured.sale_price || featured.price);
}

function getVisibleProducts() {
  const q = state.search.toLowerCase();
  const products = state.products
    .filter((p) => state.filter === "all" || p.category_id === state.filter)
    .filter((p) => [p.name, p.sku, p.description, p.material, ...(p.colors || [])].join(" ").toLowerCase().includes(q));

  return products.sort((a, b) => {
    if (state.sort === "priceAsc") return (a.sale_price || a.price || 0) - (b.sale_price || b.price || 0);
    if (state.sort === "priceDesc") return (b.sale_price || b.price || 0) - (a.sale_price || a.price || 0);
    if (state.sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return Number(b.featured) - Number(a.featured);
  });
}

function renderCategories() {
  const wrap = $("#categoryTabs");
  wrap.innerHTML = "";
  state.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cat.id === state.filter ? "active" : "";
    btn.textContent = cat.name;
    btn.addEventListener("click", () => {
      state.filter = cat.id;
      renderCategories();
      renderProducts();
    });
    wrap.append(btn);
  });
}

function stockLabel(status) {
  return { in_stock: "Stokda", preorder: "Sifarişlə", sold_out: "Bitib" }[status] || "Soruş";
}

function renderProducts() {
  const grid = $("#productGrid");
  const empty = $("#emptyProducts");
  const template = $("#productCardTemplate");
  const products = getVisibleProducts();
  grid.innerHTML = "";
  empty.hidden = products.length > 0;

  products.forEach((product) => {
    const node = template.content.firstElementChild.cloneNode(true);
    $("img", node).src = product.image_url || fallbackProducts[0].image_url;
    $("img", node).alt = product.name;
    $(".stock-badge", node).textContent = stockLabel(product.stock_status);
    $("h3", node).textContent = product.name;
    $(".sku", node).textContent = product.sku || "";
    $(".product-desc", node).textContent = product.description || "";
    $(".price", node).textContent = money(product.sale_price || product.price);
    const chips = $(".chips", node);
    [product.material, ...(product.colors || []).slice(0, 3)].filter(Boolean).forEach((value) => {
      const chip = document.createElement("span");
      chip.textContent = value;
      chips.append(chip);
    });
    $(".product-image", node).addEventListener("click", () => openProductModal(product));
    $(".details-button", node).addEventListener("click", () => openProductModal(product));
    grid.append(node);
  });
  observeReveals();
}

function renderRooms() {
  const wrap = $("#roomGrid");
  wrap.innerHTML = rooms.map(([name, image]) => `<article class="room-card reveal"><img src="${image}" alt="${name}" /><h3>${name}</h3></article>`).join("");
}

function renderLeadSelect() {
  const select = $("#leadProductSelect");
  select.innerHTML = `<option value="">Ümumi sorğu</option>` + state.products.map((p) => `<option value="${p.id}">${p.name} (${p.sku || "kod yoxdur"})</option>`).join("");
}

function openProductModal(product) {
  $("#modalImage").src = product.image_url || fallbackProducts[0].image_url;
  $("#modalImage").alt = product.name;
  $("#modalSku").textContent = product.sku || "AYDINOĞLU GROUP";
  $("#modalTitle").textContent = product.name;
  $("#modalDescription").textContent = product.description || "";
  const specs = [
    ["Qiymət", money(product.sale_price || product.price)],
    ["Rəng", (product.colors || []).join(", ")],
    ["Material", product.material],
    ["En", product.width_cm && `${product.width_cm} sm`],
    ["Hündürlük", product.height_cm && `${product.height_cm} sm`],
    ["Uzunluq", product.length_cm && `${product.length_cm} sm`],
    ["Dərinlik", product.depth_cm && `${product.depth_cm} sm`],
    ["Stok", stockLabel(product.stock_status)]
  ].filter(([, value]) => value);
  $("#modalSpecs").innerHTML = specs.map(([key, value]) => `<span>${key}: ${value}</span>`).join("");
  const text = encodeURIComponent(`Salam, ${product.name} (${product.sku || ""}) haqqında məlumat istəyirəm.`);
  $("#modalWhatsapp").href = `https://wa.me/${state.settings.whatsapp.replace(/\D/g, "")}?text=${text}`;
  $("#modalCall").href = `tel:${state.settings.phone}`;
  $("#productModal").hidden = false;
}

function closeModal() {
  $("#productModal").hidden = true;
}

async function submitLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  $("#leadStatus").textContent = "Göndərilir...";
  if (!db) {
    $("#leadStatus").textContent = "Supabase config əlavə ediləndən sonra sorğu bazaya yazılacaq.";
    return;
  }
  const { error } = await db.from("leads").insert(payload);
  $("#leadStatus").textContent = error ? error.message : "Sorğunuz qəbul edildi. Tezliklə əlaqə saxlanılacaq.";
  if (!error) form.reset();
}

async function checkSession() {
  if (!db) return;
  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) return setAdminUi(false);
  const { data: profile } = await db.from("profiles").select("role").eq("id", state.user.id).maybeSingle();
  setAdminUi(profile?.role === "admin");
}

function setAdminUi(isAdmin) {
  state.isAdmin = isAdmin;
  $("#adminLogin").hidden = isAdmin;
  $("#adminPanel").hidden = !isAdmin;
  if (isAdmin) {
    renderAdminProducts();
    renderAdminCategories();
    loadLeads();
  }
}

async function login(event) {
  event.preventDefault();
  if (!db) {
    $("#loginStatus").textContent = "Əvvəlcə config.js faylına Supabase URL və anon key yazın.";
    return;
  }
  const { email, password } = Object.fromEntries(new FormData(event.currentTarget));
  $("#loginStatus").textContent = "Yoxlanılır...";
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    $("#loginStatus").textContent = error.message;
    return;
  }
  $("#loginStatus").textContent = "";
  await checkSession();
}

async function logout() {
  if (db) await db.auth.signOut();
  state.user = null;
  setAdminUi(false);
}

function productFormPayload(form) {
  const values = Object.fromEntries(new FormData(form));
  return {
    category_id: values.category_id || null,
    name: values.name,
    sku: values.sku || null,
    price: values.price ? Number(values.price) : null,
    sale_price: values.sale_price ? Number(values.sale_price) : null,
    colors: String(values.colors || "").split(",").map((x) => x.trim()).filter(Boolean),
    material: values.material || null,
    width_cm: values.width_cm ? Number(values.width_cm) : null,
    height_cm: values.height_cm ? Number(values.height_cm) : null,
    length_cm: values.length_cm ? Number(values.length_cm) : null,
    depth_cm: values.depth_cm ? Number(values.depth_cm) : null,
    image_url: values.image_url || null,
    description: values.description || null,
    stock_status: values.stock_status || "in_stock",
    featured: form.elements.featured.checked,
    is_active: form.elements.is_active.checked
  };
}

async function saveProduct(event) {
  event.preventDefault();
  if (!db || !state.isAdmin) return;
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const payload = productFormPayload(form);
  $("#productStatus").textContent = "Yadda saxlanılır...";
  const result = id
    ? await db.from("products").update(payload).eq("id", id)
    : await db.from("products").insert(payload);
  $("#productStatus").textContent = result.error ? result.error.message : "Məhsul yadda saxlandı.";
  if (!result.error) {
    form.reset();
    form.elements.is_active.checked = true;
    await loadData();
    renderAdminProducts();
  }
}

function editProduct(product) {
  const form = $("#productForm");
  Object.entries(product).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = Array.isArray(value) ? value.join(", ") : value ?? "";
  });
  location.hash = "#admin";
  $("#productStatus").textContent = "Redaktə rejimi.";
}

async function deleteProduct(id) {
  if (!db || !state.isAdmin) return;
  if (!confirm("Bu məhsul silinsin?")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  $("#productStatus").textContent = error ? error.message : "Məhsul silindi.";
  await loadData();
  renderAdminProducts();
}

function renderAdminProducts() {
  const list = $("#adminProductList");
  list.innerHTML = state.products.map((p) => `
    <article class="admin-item">
      <div><strong>${p.name}</strong><small>${p.sku || ""} · ${money(p.sale_price || p.price)} · ${stockLabel(p.stock_status)}</small></div>
      <div class="admin-item-actions">
        <button class="button ghost" data-edit-product="${p.id}">Redaktə</button>
        <button class="button ghost danger" data-delete-product="${p.id}">Sil</button>
      </div>
    </article>
  `).join("");
}

function renderAdminSelectors() {
  const options = state.categories.filter((x) => x.id !== "all").map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#productCategorySelect").innerHTML = options;
}

async function saveCategory(event) {
  event.preventDefault();
  if (!db || !state.isAdmin) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const payload = { name: values.name, slug: values.slug || slugify(values.name) };
  const result = values.id
    ? await db.from("categories").update(payload).eq("id", values.id)
    : await db.from("categories").insert(payload);
  $("#categoryStatus").textContent = result.error ? result.error.message : "Kateqoriya saxlandı.";
  if (!result.error) {
    form.reset();
    await loadData();
    renderAdminCategories();
  }
}

function renderAdminCategories() {
  $("#adminCategoryList").innerHTML = state.categories.filter((c) => c.id !== "all").map((c) => `
    <article class="admin-item">
      <div><strong>${c.name}</strong><small>${c.slug}</small></div>
      <div class="admin-item-actions">
        <button class="button ghost" data-edit-category="${c.id}">Redaktə</button>
        <button class="button ghost danger" data-delete-category="${c.id}">Sil</button>
      </div>
    </article>
  `).join("");
}

async function deleteCategory(id) {
  if (!db || !state.isAdmin) return;
  if (!confirm("Bu kateqoriya silinsin? Məhsullarda kateqoriya boş qalacaq.")) return;
  const { error } = await db.from("categories").delete().eq("id", id);
  $("#categoryStatus").textContent = error ? error.message : "Kateqoriya silindi.";
  await loadData();
  renderAdminCategories();
}

async function loadLeads() {
  if (!db || !state.isAdmin) return;
  const { data, error } = await db.from("leads").select("*, products(name, sku)").order("created_at", { ascending: false });
  state.leads = data || [];
  $("#leadList").innerHTML = error ? `<p class="form-note">${error.message}</p>` : state.leads.map((lead) => `
    <article class="admin-item">
      <div>
        <strong>${lead.name} · ${lead.phone}</strong>
        <small>${lead.products?.name || "Ümumi sorğu"} · ${new Date(lead.created_at).toLocaleString("az-AZ")}</small>
        <small>${lead.message || ""}</small>
      </div>
      <div class="admin-item-actions">
        <button class="button ghost" data-lead-status="${lead.id}" data-status="contacted">Əlaqə saxlandı</button>
        <button class="button ghost danger" data-delete-lead="${lead.id}">Sil</button>
      </div>
    </article>
  `).join("");
}

async function updateLeadStatus(id, status) {
  if (!db || !state.isAdmin) return;
  await db.from("leads").update({ status }).eq("id", id);
  await loadLeads();
}

async function deleteLead(id) {
  if (!db || !state.isAdmin) return;
  if (!confirm("Bu müştəri sorğusu silinsin?")) return;
  await db.from("leads").delete().eq("id", id);
  await loadLeads();
}

function renderSettingsForm() {
  const form = $("#settingsForm");
  if (!form) return;
  Object.entries(state.settings).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
}

async function saveSettings(event) {
  event.preventDefault();
  if (!db || !state.isAdmin) return;
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  const { error } = await db.from("store_settings").upsert({ id: 1, ...payload });
  $("#settingsStatus").textContent = error ? error.message : "Ayarlar saxlandı.";
  if (!error) {
    state.settings = { ...state.settings, ...payload };
  }
}

function bindEvents() {
  $("#menuButton").addEventListener("click", () => $(".nav").classList.toggle("open"));
  $$(".nav a").forEach((a) => a.addEventListener("click", () => $(".nav").classList.remove("open")));
  $("#themeToggle").addEventListener("click", () => document.body.classList.toggle("light"));
  $("#searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProducts();
  });
  $("#sortSelect").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });
  $$("[data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
  $("#leadForm").addEventListener("submit", submitLead);
  $("#loginForm").addEventListener("submit", login);
  $("#logoutButton").addEventListener("click", logout);
  $("#productForm").addEventListener("submit", saveProduct);
  $("#categoryForm").addEventListener("submit", saveCategory);
  $("#settingsForm").addEventListener("submit", saveSettings);
  $("#refreshLeadsButton").addEventListener("click", loadLeads);
  $("#newProductButton").addEventListener("click", () => {
    $("#productForm").reset();
    $("#productForm").elements.is_active.checked = true;
    $("#productForm").elements.id.value = "";
    $("#productStatus").textContent = "Yeni məhsul.";
  });

  document.addEventListener("click", (event) => {
    const productEdit = event.target.closest("[data-edit-product]");
    const productDelete = event.target.closest("[data-delete-product]");
    const categoryEdit = event.target.closest("[data-edit-category]");
    const categoryDelete = event.target.closest("[data-delete-category]");
    const leadDelete = event.target.closest("[data-delete-lead]");
    const leadStatus = event.target.closest("[data-lead-status]");
    if (productEdit) editProduct(state.products.find((p) => p.id === productEdit.dataset.editProduct));
    if (productDelete) deleteProduct(productDelete.dataset.deleteProduct);
    if (categoryEdit) {
      const cat = state.categories.find((c) => c.id === categoryEdit.dataset.editCategory);
      $("#categoryForm").elements.id.value = cat.id;
      $("#categoryForm").elements.name.value = cat.name;
      $("#categoryForm").elements.slug.value = cat.slug;
    }
    if (categoryDelete) deleteCategory(categoryDelete.dataset.deleteCategory);
    if (leadDelete) deleteLead(leadDelete.dataset.deleteLead);
    if (leadStatus) updateLeadStatus(leadStatus.dataset.leadStatus, leadStatus.dataset.status);
  });

  $$(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".admin-tab").forEach((x) => x.classList.remove("active"));
      $$(".admin-view").forEach((x) => x.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.adminTab}`).classList.add("active");
    });
  });
}

let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: .1 });
  }
  $$(".reveal").forEach((el) => revealObserver.observe(el));
}

async function init() {
  bindEvents();
  await loadData();
  await checkSession();
  observeReveals();
}

init();
