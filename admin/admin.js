const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackImage = "../Foto/Aydinoglu_mebel_berde_logo.jpg";

const state = {
  user: null,
  isAdmin: false,
  products: [],
  categories: [],
  leads: [],
  settings: null
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

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

function money(value) {
  if (!value || Number(value) <= 0) return "Qiymət soruş";
  return `${Number(value).toLocaleString("az-AZ")} AZN`;
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
  if (imgs.length) return imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(x => x.image_url);
  return [fallbackImage];
}

async function ensureAdmin() {
  if (!db) {
    $("#loginStatus").textContent = "Supabase config.js daxil edilməyib.";
    return;
  }

  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;

  if (!state.user) {
    showLogin();
    return;
  }

  const { data: profile, error } = await db.from("profiles").select("role").eq("id", state.user.id).maybeSingle();

  if (error || profile?.role !== "admin") {
    await db.auth.signOut();
    $("#loginStatus").textContent = "Bu istifadəçi admin deyil.";
    showLogin();
    return;
  }

  state.isAdmin = true;
  showPanel();
  await loadAll();
}

function showLogin() {
  $("#loginScreen").hidden = false;
  $("#panel").hidden = true;
}

function showPanel() {
  $("#loginScreen").hidden = true;
  $("#panel").hidden = false;
}

async function login(event) {
  event.preventDefault();

  if (!db) {
    $("#loginStatus").textContent = "Əvvəl config.js faylında Supabase URL və anon key yaz.";
    return;
  }

  const values = Object.fromEntries(new FormData(event.currentTarget));
  $("#loginStatus").textContent = "Yoxlanılır...";

  const { error } = await db.auth.signInWithPassword({
    email: values.email,
    password: values.password
  });

  if (error) {
    $("#loginStatus").textContent = error.message;
    return;
  }

  $("#loginStatus").textContent = "";
  await ensureAdmin();
}

async function logout() {
  if (db) await db.auth.signOut();
  state.user = null;
  state.isAdmin = false;
  showLogin();
}

async function loadAll() {
  await Promise.all([loadCategories(), loadProducts(), loadLeads(), loadSettings()]);
  renderAll();
}

async function loadCategories() {
  const { data, error } = await db.from("categories").select("*").order("sort_order", { ascending: true });
  if (!error) state.categories = data || [];
}

async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("*, product_images(*)")
    .order("created_at", { ascending: false });

  if (!error) state.products = data || [];
}

async function loadLeads() {
  const { data, error } = await db
    .from("leads")
    .select("*, products(name, sku)")
    .order("created_at", { ascending: false });

  if (!error) state.leads = data || [];
}

async function loadSettings() {
  const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (!error) state.settings = data;
}

function renderAll() {
  renderStats();
  renderCategoryOptions();
  renderProducts();
  renderCategories();
  renderLeads();
  renderSettings();
}

function renderStats() {
  $("#statProducts").textContent = state.products.length;
  $("#statCategories").textContent = state.categories.length;
  $("#statLeads").textContent = state.leads.filter(x => x.status === "new").length;
  $("#statFeatured").textContent = state.products.filter(x => x.featured).length;
}

function renderCategoryOptions() {
  $("#productCategory").innerHTML = state.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join("");
}

function renderProducts() {
  const wrap = $("#productList");

  wrap.innerHTML = state.products.map(product => {
    const img = productImages(product)[0] || fallbackImage;
    return `
      <article class="list-item">
        <img src="${img}" alt="">
        <div>
          <strong>${product.name}</strong>
          <small>${product.sku || "Kod yoxdur"} · ${money(product.sale_price || product.price)} · ${stockLabel(product.stock_status)}</small>
          <small>${product.is_active ? "Aktiv" : "Deaktiv"}${product.featured ? " · Seçilmiş" : ""}</small>
        </div>
        <div class="item-actions">
          <button data-edit-product="${product.id}">Redaktə</button>
          <button class="danger" data-delete-product="${product.id}">Sil</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderCategories() {
  $("#categoryList").innerHTML = state.categories.map(cat => `
    <article class="list-item">
      <img src="${fallbackImage}" alt="">
      <div>
        <strong>${cat.name}</strong>
        <small>${cat.slug} · Sıra: ${cat.sort_order || 0}</small>
        <small>${cat.is_active ? "Aktiv" : "Deaktiv"}</small>
      </div>
      <div class="item-actions">
        <button data-edit-category="${cat.id}">Redaktə</button>
        <button class="danger" data-delete-category="${cat.id}">Sil</button>
      </div>
    </article>
  `).join("");
}

function renderLeads() {
  $("#leadList").innerHTML = state.leads.map(lead => `
    <article class="list-item">
      <img src="${fallbackImage}" alt="">
      <div>
        <strong>${lead.name} · ${lead.phone}</strong>
        <small>${lead.products?.name || "Ümumi sorğu"} · ${new Date(lead.created_at).toLocaleString("az-AZ")}</small>
        <small>${lead.message || ""}</small>
      </div>
      <div class="item-actions">
        <button data-lead-status="${lead.id}" data-status="contacted">Əlaqə saxlandı</button>
        <button class="danger" data-delete-lead="${lead.id}">Sil</button>
      </div>
    </article>
  `).join("");
}

function renderSettings() {
  if (!state.settings) return;
  const form = $("#settingsForm");
  Object.entries(state.settings).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
}

function productPayload(form) {
  const values = Object.fromEntries(new FormData(form));

  return {
    category_id: values.category_id || null,
    name: values.name,
    slug: slugify(values.name),
    sku: values.sku || null,
    price: values.price ? Number(values.price) : null,
    sale_price: values.sale_price ? Number(values.sale_price) : null,
    colors: String(values.colors || "").split(",").map(x => x.trim()).filter(Boolean),
    material: values.material || null,
    width_cm: values.width_cm ? Number(values.width_cm) : null,
    height_cm: values.height_cm ? Number(values.height_cm) : null,
    length_cm: values.length_cm ? Number(values.length_cm) : null,
    depth_cm: values.depth_cm ? Number(values.depth_cm) : null,
    description: values.description || null,
    stock_status: values.stock_status || "in_stock",
    featured: form.elements.featured.checked,
    is_active: form.elements.is_active.checked
  };
}

async function saveProduct(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const id = form.elements.id.value;
  const payload = productPayload(form);

  $("#productStatus").textContent = "Yadda saxlanılır...";

  let result;
  if (id) {
    result = await db.from("products").update(payload).eq("id", id).select("id").single();
  } else {
    result = await db.from("products").insert(payload).select("id").single();
  }

  if (result.error) {
    $("#productStatus").textContent = result.error.message;
    return;
  }

  const productId = id || result.data.id;
  const files = $("#productImages").files;

  if (files && files.length) {
    const { error: deleteOldError } = await db.from("product_images").delete().eq("product_id", productId);
    if (deleteOldError) {
      $("#productStatus").textContent = deleteOldError.message;
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const filePath = `${productId}/${Date.now()}-${i}.${ext}`;

      const upload = await db.storage.from("product-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true
      });

      if (upload.error) {
        $("#productStatus").textContent = upload.error.message;
        return;
      }

      const { data: publicData } = db.storage.from("product-images").getPublicUrl(filePath);

      const imgInsert = await db.from("product_images").insert({
        product_id: productId,
        image_url: publicData.publicUrl,
        storage_path: filePath,
        sort_order: i
      });

      if (imgInsert.error) {
        $("#productStatus").textContent = imgInsert.error.message;
        return;
      }
    }
  }

  $("#productStatus").textContent = "Məhsul yadda saxlandı.";
  form.reset();
  form.elements.is_active.checked = true;
  form.elements.id.value = "";
  $("#productImages").value = "";

  await loadAll();
}

function editProduct(product) {
  const form = $("#productForm");

  Object.entries(product).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = Array.isArray(value) ? value.join(", ") : value ?? "";
  });

  showTab("productsView", "Məhsullar");
  $("#productStatus").textContent = "Redaktə rejimi. Yeni şəkil seçsən, köhnə qalereya yenilənəcək.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(id) {
  if (!confirm("Bu məhsul silinsin?")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) alert(error.message);
  await loadAll();
}

async function saveCategory(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));

  const payload = {
    name: values.name,
    slug: values.slug || slugify(values.name),
    sort_order: values.sort_order ? Number(values.sort_order) : 1,
    is_active: true
  };

  const result = values.id
    ? await db.from("categories").update(payload).eq("id", values.id)
    : await db.from("categories").insert(payload);

  $("#categoryStatus").textContent = result.error ? result.error.message : "Kateqoriya saxlandı.";

  if (!result.error) {
    form.reset();
    await loadAll();
  }
}

function editCategory(cat) {
  const form = $("#categoryForm");
  form.elements.id.value = cat.id;
  form.elements.name.value = cat.name;
  form.elements.slug.value = cat.slug || "";
  form.elements.sort_order.value = cat.sort_order || 1;
}

async function deleteCategory(id) {
  if (!confirm("Kateqoriya silinsin?")) return;
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) alert(error.message);
  await loadAll();
}

async function updateLeadStatus(id, status) {
  await db.from("leads").update({ status }).eq("id", id);
  await loadAll();
}

async function deleteLead(id) {
  if (!confirm("Sorğu silinsin?")) return;
  await db.from("leads").delete().eq("id", id);
  await loadAll();
}

async function saveSettings(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));

  const { error } = await db.from("site_settings").upsert({
    id: 1,
    ...payload
  });

  $("#settingsStatus").textContent = error ? error.message : "Ayarlar saxlandı.";

  if (!error) await loadAll();
}

function showTab(id, title) {
  $$(".tab").forEach(x => x.classList.remove("active"));
  $$(".view").forEach(x => x.classList.remove("active"));

  const btn = $(`[data-tab="${id}"]`);
  if (btn) btn.classList.add("active");

  $(`#${id}`).classList.add("active");
  $("#pageTitle").textContent = title;
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", login);
  $("#logoutBtn").addEventListener("click", logout);
  $("#refreshBtn").addEventListener("click", loadAll);

  $("#productForm").addEventListener("submit", saveProduct);
  $("#categoryForm").addEventListener("submit", saveCategory);
  $("#settingsForm").addEventListener("submit", saveSettings);

  $("#newProductBtn").addEventListener("click", () => {
    $("#productForm").reset();
    $("#productForm").elements.id.value = "";
    $("#productForm").elements.is_active.checked = true;
    $("#productImages").value = "";
    $("#productStatus").textContent = "Yeni məhsul.";
  });

  $$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const title = tab.textContent.trim();
      showTab(tab.dataset.tab, title);
    });
  });

  document.addEventListener("click", event => {
    const editProductBtn = event.target.closest("[data-edit-product]");
    const deleteProductBtn = event.target.closest("[data-delete-product]");
    const editCategoryBtn = event.target.closest("[data-edit-category]");
    const deleteCategoryBtn = event.target.closest("[data-delete-category]");
    const leadStatusBtn = event.target.closest("[data-lead-status]");
    const leadDeleteBtn = event.target.closest("[data-delete-lead]");

    if (editProductBtn) editProduct(state.products.find(p => p.id === editProductBtn.dataset.editProduct));
    if (deleteProductBtn) deleteProduct(deleteProductBtn.dataset.deleteProduct);

    if (editCategoryBtn) editCategory(state.categories.find(c => c.id === editCategoryBtn.dataset.editCategory));
    if (deleteCategoryBtn) deleteCategory(deleteCategoryBtn.dataset.deleteCategory);

    if (leadStatusBtn) updateLeadStatus(leadStatusBtn.dataset.leadStatus, leadStatusBtn.dataset.status);
    if (leadDeleteBtn) deleteLead(leadDeleteBtn.dataset.deleteLead);
  });
}

async function init() {
  bindEvents();
  await ensureAdmin();
}

init();
