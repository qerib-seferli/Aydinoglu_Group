const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackImage = "./Foto/Aydinoglu_mebel_berde_logo.jpg";

const fallbackCategories = [
  { id: "living", name: "Qonaq otağı", slug: "qonaq-otagi", sort_order: 1 },
  { id: "bedroom", name: "Yataq otağı", slug: "yataq-otagi", sort_order: 2 },
  { id: "kitchen", name: "Mətbəx", slug: "metbex", sort_order: 3 },
  { id: "office", name: "Ofis", slug: "ofis", sort_order: 4 }
];

const fallbackProducts = [
  {
    id: "demo-1",
    category_id: "living",
    name: "Modern künc divan",
    sku: "AG-001",
    price: 1850,
    sale_price: 1690,
    material: "Premium parça",
    colors: ["qəhvəyi", "maloçnu"],
    width_cm: 320,
    height_cm: 82,
    length_cm: 240,
    depth_cm: 96,
    description: "Geniş və rahat qonaq otaqları üçün modern künc divan.",
    stock_status: "in_stock",
    featured: true,
    created_at: "2026-01-01",
    product_images: [{ image_url: fallbackImage, sort_order: 0 }]
  },
  {
    id: "demo-2",
    category_id: "bedroom",
    name: "Yataq otağı dəsti",
    sku: "AG-002",
    price: 2400,
    sale_price: null,
    material: "MDF və yumşaq başlıq",
    colors: ["ağ", "maloçnu"],
    width_cm: 280,
    height_cm: 220,
    length_cm: 210,
    depth_cm: 60,
    description: "Çarpayı, dolab və tumba ilə tamamlanan yataq otağı dəsti.",
    stock_status: "preorder",
    featured: true,
    created_at: "2026-01-02",
    product_images: [{ image_url: fallbackImage, sort_order: 0 }]
  }
];

const state = {
  categories: [],
  products: [],
  filter: "all",
  search: "",
  sort: "featured",
  settings: {
    store_name: "AYDINOĞLU GROUP",
    phone: "+994502097255",
    whatsapp: "+994502097254",
    address: "Bərdə Şəhər Bayraq Meydanının yanı",
    instagram_url: "https://www.instagram.com/aydinoglu_mebel_berde?igsh=MTUwZW15OG01dHlweg==",
    tiktok_url: "https://www.tiktok.com/@aydinoglu_mebel_berde?_r=1&_t=ZS-9781rpFnJX2",
    working_hours: "Hər gün 09:00-20:00"
  }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function money(value) {
  if (!value || Number(value) <= 0) return "Qiymət soruş";
  return `${Number(value).toLocaleString("az-AZ")} AZN`;
}

function phoneClean(value) {
  return String(value || "").replace(/\D/g, "");
}

function stockLabel(value) {
  return {
    in_stock: "Stokda",
    preorder: "Sifarişlə",
    sold_out: "Bitib"
  }[value] || "Soruş";
}

function productImages(product) {
  const imgs = Array.isArray(product.product_images) ? product.product_images : [];
  if (imgs.length) return imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(x => x.image_url).filter(Boolean);
  if (product.image_url) return [product.image_url];
  return [fallbackImage];
}

function normalizeProduct(product) {
  return {
    ...product,
    colors: Array.isArray(product.colors)
      ? product.colors
      : String(product.colors || "").split(",").map(x => x.trim()).filter(Boolean)
  };
}

async function safeQuery(promise, fallback) {
  if (!db || !promise) return fallback;
  const { data, error } = await promise;
  if (error) {
    console.warn(error.message);
    return fallback;
  }
  return data ?? fallback;
}

async function loadData() {
  const categories = await safeQuery(
    db?.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    fallbackCategories
  );

  const products = await safeQuery(
    db?.from("products")
      .select("*, product_images(*)")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
    fallbackProducts
  );

  const settings = await safeQuery(
    db?.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    state.settings
  );

  state.categories = [{ id: "all", name: "Hamısı", slug: "all" }, ...categories];
  state.products = products.map(normalizeProduct);
  state.settings = { ...state.settings, ...(settings || {}) };

  renderAll();
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderLeadSelect();
  renderHero();
  observeReveals();
}

function renderHero() {
  $("#productCount").textContent = state.products.length;
  const featured = state.products.find(p => p.featured) || state.products[0];
  if (!featured) return;
  $("#heroProductName").textContent = featured.name;
  $("#heroImage").src = productImages(featured)[0] || fallbackImage;
}

function renderCategories() {
  const wrap = $("#categoryTabs");
  wrap.innerHTML = "";

  state.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat.name;
    btn.className = cat.id === state.filter ? "active" : "";
    btn.addEventListener("click", () => {
      state.filter = cat.id;
      renderCategories();
      renderProducts();
    });
    wrap.append(btn);
  });
}

function visibleProducts() {
  const q = state.search.toLowerCase().trim();

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
  const empty = $("#emptyProducts");
  const template = $("#productTemplate");
  const list = visibleProducts();

  grid.innerHTML = "";
  empty.hidden = list.length > 0;

  list.forEach(product => {
    const node = template.content.firstElementChild.cloneNode(true);
    const image = productImages(product)[0];

    $(".product-img img", node).src = image || fallbackImage;
    $(".product-img img", node).alt = product.name;
    $(".badge", node).textContent = stockLabel(product.stock_status);
    $(".product-top h3", node).textContent = product.name;
    $(".product-top small", node).textContent = product.sku || "";
    $(".product-content p", node).textContent = product.description || "";
    $(".product-bottom strong", node).textContent = money(product.sale_price || product.price);

    const chips = $(".chips", node);
    [product.material, ...(product.colors || [])].filter(Boolean).slice(0, 3).forEach(text => {
      const chip = document.createElement("span");
      chip.textContent = text;
      chips.append(chip);
    });

    $(".product-img", node).addEventListener("click", () => openProduct(product));
    $(".details-btn", node).addEventListener("click", () => openProduct(product));

    grid.append(node);
  });

  observeReveals();
}

function renderLeadSelect() {
  const select = $("#leadProductSelect");
  select.innerHTML = `<option value="">Ümumi sorğu</option>` + state.products.map(p => {
    return `<option value="${p.id}">${p.name}${p.sku ? ` · ${p.sku}` : ""}</option>`;
  }).join("");
}

function openProduct(product) {
  const images = productImages(product);
  const main = $("#modalMainImage");
  const thumbs = $("#modalThumbs");

  main.src = images[0] || fallbackImage;
  main.alt = product.name;
  thumbs.innerHTML = "";

  images.forEach(src => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<img src="${src}" alt="${product.name}">`;
    btn.addEventListener("click", () => {
      main.src = src;
    });
    thumbs.append(btn);
  });

  $("#modalSku").textContent = product.sku || "AYDINOĞLU GROUP";
  $("#modalTitle").textContent = product.name;
  $("#modalDescription").textContent = product.description || "";

  const specs = [
    ["Qiymət", money(product.sale_price || product.price)],
    ["Rəng", (product.colors || []).join(", ")],
    ["Material", product.material],
    ["En", product.width_cm ? `${product.width_cm} sm` : ""],
    ["Hündürlük", product.height_cm ? `${product.height_cm} sm` : ""],
    ["Uzunluq", product.length_cm ? `${product.length_cm} sm` : ""],
    ["Dərinlik", product.depth_cm ? `${product.depth_cm} sm` : ""],
    ["Status", stockLabel(product.stock_status)]
  ].filter(([, v]) => v);

  $("#modalSpecs").innerHTML = specs.map(([k, v]) => `<span>${k}: ${v}</span>`).join("");

  const waText = encodeURIComponent(`Salam, ${product.name}${product.sku ? ` (${product.sku})` : ""} haqqında məlumat istəyirəm.`);
  $("#modalWhatsapp").href = `https://wa.me/${phoneClean(state.settings.whatsapp)}?text=${waText}`;
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
    $("#leadStatus").textContent = "Sorğu üçün Supabase bağlantısı aktivləşdirilməlidir.";
    return;
  }

  const { error } = await db.from("leads").insert({
    name: payload.name,
    phone: payload.phone,
    product_id: payload.product_id || null,
    message: payload.message || null,
    status: "new"
  });

  if (error) {
    $("#leadStatus").textContent = error.message;
    return;
  }

  $("#leadStatus").textContent = "Sorğunuz qəbul edildi.";
  form.reset();
}

function bindEvents() {
  $("#menuBtn").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
  $$("#mainNav a").forEach(a => a.addEventListener("click", () => $("#mainNav").classList.remove("open")));

  $("#searchInput").addEventListener("input", e => {
    state.search = e.target.value;
    renderProducts();
  });

  $("#sortSelect").addEventListener("change", e => {
    state.sort = e.target.value;
    renderProducts();
  });

  $("#leadForm").addEventListener("submit", submitLead);

  $$("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
}

let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.08 });
  }

  $$(".reveal").forEach(el => revealObserver.observe(el));
}

async function init() {
  bindEvents();
  await loadData();
}

init();
