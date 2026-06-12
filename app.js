const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackImage = "./Foto/Aydinoglu_mebel_berde_logo.jpg";

const fallbackCategories = [
  { id: "living", name: "Divanlar", slug: "divanlar", sort_order: 1 },
  { id: "sofa", name: "Kreslolar", slug: "kreslolar", sort_order: 2 },
  { id: "bedroom", name: "Yataq otağı", slug: "yataq-otagi", sort_order: 3 },
  { id: "kitchen", name: "Mətbəx", slug: "metbex", sort_order: 4 }
];

const fallbackProducts = [
  {
    id: "p1", category_id: "living", name: "Sofa Classic", sku: "AG-001",
    price: 1500, sale_price: null, material: "Premium parça", colors: ["bej", "boz"],
    description: "Zərif görünüşlü, rahat oturumlu klassik divan modeli.",
    stock_status: "in_stock", featured: true, created_at: "2026-01-01",
    product_images: [{ image_url: fallbackImage, sort_order: 0 }]
  },
  {
    id: "p2", category_id: "living", name: "Chaise Retro", sku: "AG-002",
    price: 1850, sale_price: 1690, material: "Taxta karkas", colors: ["qəhvəyi"],
    description: "Retro üslubda, salon və qonaq otağı üçün rahat seçim.",
    stock_status: "in_stock", featured: true, created_at: "2026-01-02",
    product_images: [{ image_url: fallbackImage, sort_order: 0 }]
  },
  {
    id: "p3", category_id: "sofa", name: "Poltrona Luxo", sku: "AG-003",
    price: 780, sale_price: null, material: "Yumşaq parça", colors: ["krem", "boz"],
    description: "Premium kreslo, oxu guşəsi və salon üçün ideal seçim.",
    stock_status: "preorder", featured: true, created_at: "2026-01-03",
    product_images: [{ image_url: fallbackImage, sort_order: 0 }]
  }
];

const state = {
  categories: [],
  products: [],
  filter: "all",
  search: "",
  sort: "featured"
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function money(v) {
  if (!v || Number(v) <= 0) return "Qiymət soruş";
  return `${Number(v).toLocaleString("az-AZ")} AZN`;
}

function stockLabel(v) {
  return { in_stock: "Stokda", preorder: "Sifarişlə", sold_out: "Bitib" }[v] || "Soruş";
}

function imagesOf(p) {
  const arr = Array.isArray(p.product_images) ? p.product_images : [];
  if (arr.length) return arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(x => x.image_url).filter(Boolean);
  return [p.image_url || fallbackImage];
}

function normalizeProduct(p) {
  return {
    ...p,
    colors: Array.isArray(p.colors)
      ? p.colors
      : String(p.colors || "").split(",").map(x => x.trim()).filter(Boolean)
  };
}

async function safeQuery(query, fallback) {
  if (!db || !query) return fallback;
  const { data, error } = await query;
  if (error) {
    console.warn(error.message);
    return fallback;
  }
  return data ?? fallback;
}

async function loadData() {
  const cats = await safeQuery(
    db?.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    fallbackCategories
  );

  const products = await safeQuery(
    db?.from("products").select("*, product_images(*)").eq("is_active", true).order("featured", { ascending: false }).order("created_at", { ascending: false }),
    fallbackProducts
  );

  state.categories = [{ id: "all", name: "Hamısı", slug: "all" }, ...cats];
  state.products = products.map(normalizeProduct);
  renderAll();
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderGallery();
  renderLeadSelect();

  const first = state.products.find(x => x.featured) || state.products[0];
  if (first) $("#heroImage").src = imagesOf(first)[0] || fallbackImage;
}

function renderCategories() {
  const tabs = $("#categoryTabs");
  const select = $("#categorySelect");

  tabs.innerHTML = "";
  select.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  state.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    btn.className = cat.id === state.filter ? "active" : "";
    btn.onclick = () => {
      state.filter = cat.id;
      select.value = cat.id;
      renderCategories();
      renderProducts();
    };
    tabs.append(btn);
  });
}

function visibleProducts() {
  const q = state.search.toLowerCase();
  return state.products
    .filter(p => state.filter === "all" || p.category_id === state.filter)
    .filter(p => [p.name, p.sku, p.description, p.material, ...(p.colors || [])].join(" ").toLowerCase().includes(q))
    .sort((a, b) => {
      if (state.sort === "priceAsc") return Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0);
      if (state.sort === "priceDesc") return Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0);
      if (state.sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return Number(b.featured) - Number(a.featured);
    });
}

function renderProducts() {
  const grid = $("#productGrid");
  const template = $("#productTemplate");
  const list = visibleProducts();

  grid.innerHTML = "";
  $("#emptyProducts").hidden = list.length > 0;

  list.forEach(product => {
    const node = template.content.firstElementChild.cloneNode(true);
    $(".product-image img", node).src = imagesOf(product)[0] || fallbackImage;
    $(".product-image img", node).alt = product.name;
    $(".product-body h3", node).textContent = product.name;
    $(".product-body p", node).textContent = product.description || "";
    $(".product-body b", node).textContent = money(product.sale_price || product.price);
    $(".product-image", node).onclick = () => openProduct(product);
    $(".product-body button", node).onclick = () => openProduct(product);
    grid.append(node);
  });
}

function renderGallery() {
  const list = state.products.slice(0, 5);
  $("#galleryGrid").innerHTML = list.map(p => `
    <article class="gallery-item" onclick="openProductById('${p.id}')">
      <img src="${imagesOf(p)[0] || fallbackImage}" alt="${p.name}">
      <span>${p.name}</span>
    </article>
  `).join("");
}

function renderLeadSelect() {
  $("#leadProductSelect").innerHTML =
    `<option value="">Ümumi sorğu</option>` +
    state.products.map(p => `<option value="${p.id}">${p.name}${p.sku ? ` · ${p.sku}` : ""}</option>`).join("");
}

function openProductById(id) {
  const p = state.products.find(x => x.id === id);
  if (p) openProduct(p);
}

function openProduct(product) {
  const imgs = imagesOf(product);
  $("#modalMainImage").src = imgs[0] || fallbackImage;
  $("#modalSku").textContent = product.sku || "AYDINOĞLU GROUP";
  $("#modalTitle").textContent = product.name;
  $("#modalDesc").textContent = product.description || "";

  $("#modalThumbs").innerHTML = "";
  imgs.forEach(src => {
    const btn = document.createElement("button");
    btn.innerHTML = `<img src="${src}" alt="">`;
    btn.onclick = () => $("#modalMainImage").src = src;
    $("#modalThumbs").append(btn);
  });

  const specs = [
    ["Qiymət", money(product.sale_price || product.price)],
    ["Material", product.material],
    ["Rəng", (product.colors || []).join(", ")],
    ["En", product.width_cm ? `${product.width_cm} sm` : ""],
    ["Hündürlük", product.height_cm ? `${product.height_cm} sm` : ""],
    ["Status", stockLabel(product.stock_status)]
  ].filter(([, v]) => v);

  $("#modalSpecs").innerHTML = specs.map(([k, v]) => `<span>${k}: ${v}</span>`).join("");

  const text = encodeURIComponent(`Salam, ${product.name}${product.sku ? ` (${product.sku})` : ""} haqqında məlumat istəyirəm.`);
  $("#modalWhatsapp").href = `https://wa.me/994502097254?text=${text}`;

  $("#productModal").hidden = false;
}

async function submitLead(e) {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(e.currentTarget));
  $("#leadStatus").textContent = "Göndərilir...";

  if (!db) {
    $("#leadStatus").textContent = "Supabase qoşulandan sonra sorğu bazaya yazılacaq.";
    return;
  }

  const { error } = await db.from("leads").insert({
    name: values.name,
    phone: values.phone,
    product_id: values.product_id || null,
    message: values.message || null,
    status: "new"
  });

  $("#leadStatus").textContent = error ? error.message : "Sorğunuz qəbul edildi.";
  if (!error) e.currentTarget.reset();
}

function bindEvents() {
  $("#menuBtn").onclick = () => $("#nav").classList.toggle("open");

  $$("#nav a").forEach(a => a.onclick = () => $("#nav").classList.remove("open"));

  $("#searchInput").oninput = e => {
    state.search = e.target.value;
    renderProducts();
  };

  $("#categorySelect").onchange = e => {
    state.filter = e.target.value;
    renderCategories();
    renderProducts();
  };

  $("#sortSelect").onchange = e => {
    state.sort = e.target.value;
    renderProducts();
  };

  $("#leadForm").onsubmit = submitLead;

  $$("[data-close-modal]").forEach(el => {
    el.onclick = () => $("#productModal").hidden = true;
  });

  document.onkeydown = e => {
    if (e.key === "Escape") $("#productModal").hidden = true;
  };
}

bindEvents();
loadData();
