const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackImage = "../Foto/Aydinoglu_mebel_berde_logo.jpg";
const state = { products: [], categories: [], leads: [], settings: null, user: null };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function money(v){ return !v ? "Qiymət soruş" : `${Number(v).toLocaleString("az-AZ")} AZN`; }
function slugify(v){ return String(v||"").toLowerCase().trim().replace(/ə/g,"e").replace(/ö/g,"o").replace(/ü/g,"u").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ş/g,"s").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function imagesOf(p){ const arr = Array.isArray(p.product_images) ? p.product_images : []; return arr.length ? arr.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url) : [fallbackImage]; }
function catName(id){ return state.categories.find(c=>c.id===id)?.name || ""; }

async function login(e){
  e.preventDefault();
  if(!db){ $("#loginStatus").textContent = "config.js faylında Supabase məlumatları boşdur."; return; }

  const v = Object.fromEntries(new FormData(e.currentTarget));
  const { error } = await db.auth.signInWithPassword({ email: v.email, password: v.password });

  if(error){ $("#loginStatus").textContent = error.message; return; }
  await checkSession();
}

async function checkSession(){
  if(!db){ $("#loginStatus").textContent = "Supabase qoşulmayıb."; return; }

  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;

  if(!state.user) return;

  const { data: profile } = await db.from("profiles").select("role").eq("id", state.user.id).maybeSingle();

  if(profile?.role !== "admin"){
    await db.auth.signOut();
    $("#loginStatus").textContent = "Bu istifadəçi admin deyil.";
    return;
  }

  $("#login").hidden = true;
  $("#app").hidden = false;
  await loadAll();
}

async function logout(){ await db.auth.signOut(); location.reload(); }

async function loadAll(){
  await Promise.all([loadCategories(), loadProducts(), loadLeads(), loadSettings()]);
  renderAll();
}

async function loadCategories(){
  const { data } = await db.from("categories").select("*").order("sort_order", { ascending: true });
  state.categories = data || [];
}

async function loadProducts(){
  const { data } = await db.from("products").select("*, product_images(*)").order("created_at", { ascending: false });
  state.products = data || [];
}

async function loadLeads(){
  const { data } = await db.from("leads").select("*, products(name, sku)").order("created_at", { ascending: false });
  state.leads = data || [];
}

async function loadSettings(){
  const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  state.settings = data;
}

function renderAll(){
  $("#statProducts").textContent = state.products.length;
  $("#statLeads").textContent = state.leads.filter(x => x.status === "new").length;
  $("#statFeatured").textContent = state.products.filter(x => x.featured).length;
  $("#bellCount").textContent = state.leads.filter(x => x.status === "new").length;

  const catOptions = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#productCategory").innerHTML = catOptions;

  $("#productRows").innerHTML = state.products.map(p => `
    <tr>
      <td><img src="${imagesOf(p)[0] || fallbackImage}"></td>
      <td>${p.sku || "—"}</td>
      <td>${p.name}</td>
      <td>${catName(p.category_id)}</td>
      <td>${p.stock || 0}</td>
      <td>${money(p.sale_price || p.price)}</td>
      <td>
        <div class="actions">
          <button data-edit-product="${p.id}">Düzəlt</button>
          <button class="del" data-delete-product="${p.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("#categoryRows").innerHTML = state.categories.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.slug}</td>
      <td>${c.sort_order}</td>
      <td>
        <div class="actions">
          <button data-edit-category="${c.id}">Düzəlt</button>
          <button class="del" data-delete-category="${c.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("#leadRows").innerHTML = state.leads.map(l => `
    <tr>
      <td>${l.name}</td>
      <td>${l.phone}</td>
      <td>${l.products?.name || "Ümumi sorğu"}</td>
      <td>${l.message || ""}</td>
      <td>${l.status}</td>
      <td>
        <div class="actions">
          <button data-lead-status="${l.id}">Əlaqə saxlandı</button>
          <button class="del" data-delete-lead="${l.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("");

  if(state.settings){
    const form = $("#settingsForm");
    Object.entries(state.settings).forEach(([k,v]) => {
      if(form.elements[k]) form.elements[k].value = v || "";
    });
  }
}

function productPayload(form){
  const v = Object.fromEntries(new FormData(form));
  return {
    category_id: v.category_id || null,
    name: v.name,
    slug: slugify(v.name),
    sku: v.sku || null,
    stock: v.stock ? Number(v.stock) : 0,
    price: v.price ? Number(v.price) : null,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    colors: String(v.colors || "").split(",").map(x => x.trim()).filter(Boolean),
    material: v.material || null,
    width_cm: v.width_cm ? Number(v.width_cm) : null,
    height_cm: v.height_cm ? Number(v.height_cm) : null,
    length_cm: v.length_cm ? Number(v.length_cm) : null,
    depth_cm: v.depth_cm ? Number(v.depth_cm) : null,
    description: v.description || null,
    stock_status: v.stock_status || "in_stock",
    featured: form.elements.featured.checked,
    is_active: form.elements.is_active.checked
  };
}

async function saveProduct(e){
  e.preventDefault();
  const form = e.currentTarget;
  const id = form.elements.id.value;
  const payload = productPayload(form);

  let result = id
    ? await db.from("products").update(payload).eq("id", id).select("id").single()
    : await db.from("products").insert(payload).select("id").single();

  if(result.error){ $("#productStatus").textContent = result.error.message; return; }

  const productId = id || result.data.id;
  const files = $("#productImages").files;

  if(files.length){
    await db.from("product_images").delete().eq("product_id", productId);

    for(let i=0; i<files.length; i++){
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}-${i}.${ext}`;

      const upload = await db.storage.from("product-images").upload(path, file, { upsert: true });
      if(upload.error){ $("#productStatus").textContent = upload.error.message; return; }

      const { data } = db.storage.from("product-images").getPublicUrl(path);

      await db.from("product_images").insert({
        product_id: productId,
        image_url: data.publicUrl,
        storage_path: path,
        sort_order: i
      });
    }
  }

  $("#productStatus").textContent = "Məhsul saxlandı.";
  form.reset();
  form.elements.is_active.checked = true;
  await loadAll();
}

function editProduct(product){
  const form = $("#productForm");
  Object.entries(product).forEach(([k,v]) => {
    if(!form.elements[k]) return;
    if(form.elements[k].type === "checkbox") form.elements[k].checked = Boolean(v);
    else form.elements[k].value = Array.isArray(v) ? v.join(", ") : v ?? "";
  });
  showView("products");
}

async function deleteProduct(id){
  if(confirm("Məhsul silinsin?")){
    await db.from("products").delete().eq("id", id);
    await loadAll();
  }
}

async function saveCategory(e){
  e.preventDefault();
  const form = e.currentTarget;
  const v = Object.fromEntries(new FormData(form));

  const payload = {
    name: v.name,
    slug: v.slug || slugify(v.name),
    sort_order: Number(v.sort_order || 1),
    is_active: true
  };

  const result = v.id
    ? await db.from("categories").update(payload).eq("id", v.id)
    : await db.from("categories").insert(payload);

  $("#categoryStatus").textContent = result.error ? result.error.message : "Kateqoriya saxlandı.";
  if(!result.error){ form.reset(); await loadAll(); }
}

function editCategory(cat){
  const form = $("#categoryForm");
  form.elements.id.value = cat.id;
  form.elements.name.value = cat.name;
  form.elements.slug.value = cat.slug;
  form.elements.sort_order.value = cat.sort_order;
}

async function deleteCategory(id){
  if(confirm("Kateqoriya silinsin?")){
    await db.from("categories").delete().eq("id", id);
    await loadAll();
  }
}

async function updateLead(id){
  await db.from("leads").update({ status: "contacted" }).eq("id", id);
  await loadAll();
}

async function deleteLead(id){
  if(confirm("Sorğu silinsin?")){
    await db.from("leads").delete().eq("id", id);
    await loadAll();
  }
}

async function saveSettings(e){
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.currentTarget));
  const { error } = await db.from("site_settings").upsert({ id: 1, ...payload });
  $("#settingsStatus").textContent = error ? error.message : "Ayarlar saxlandı.";
  await loadAll();
}

function showView(id){
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#${id}`).classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === id));
}

function bindEvents(){
  $("#loginForm").onsubmit = login;
  $("#logoutBtn").onclick = logout;
  $("#productForm").onsubmit = saveProduct;
  $("#categoryForm").onsubmit = saveCategory;
  $("#settingsForm").onsubmit = saveSettings;

  $("#newProductBtn").onclick = () => {
    $("#productForm").reset();
    $("#productForm").elements.id.value = "";
    $("#productForm").elements.is_active.checked = true;
  };

  $$(".tab").forEach(btn => btn.onclick = () => showView(btn.dataset.view));

  document.onclick = e => {
    const ep = e.target.closest("[data-edit-product]");
    const dp = e.target.closest("[data-delete-product]");
    const ec = e.target.closest("[data-edit-category]");
    const dc = e.target.closest("[data-delete-category]");
    const ls = e.target.closest("[data-lead-status]");
    const dl = e.target.closest("[data-delete-lead]");

    if(ep) editProduct(state.products.find(p => p.id === ep.dataset.editProduct));
    if(dp) deleteProduct(dp.dataset.deleteProduct);
    if(ec) editCategory(state.categories.find(c => c.id === ec.dataset.editCategory));
    if(dc) deleteCategory(dc.dataset.deleteCategory);
    if(ls) updateLead(ls.dataset.leadStatus);
    if(dl) deleteLead(dl.dataset.deleteLead);
  };
}

bindEvents();
checkSession();
