const cfg=window.AYDINOGLU_CONFIG||{};
const hasSupabase=Boolean(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase);
const db=hasSupabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const imgFallback="../Foto/Aydinoglu_mebel_berde_logo.jpg";
const state={user:null,products:[],categories:[],leads:[],settings:null};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function money(v){return !v?"Qiymət soruş":`${Number(v).toLocaleString("az-AZ")} AZN`}
function slugify(v){return String(v||"").toLowerCase().trim().replace(/ə/g,"e").replace(/ö/g,"o").replace(/ü/g,"u").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ş/g,"s").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}
function imgs(p){const a=Array.isArray(p.product_images)?p.product_images:[];return a.length?a.sort((x,y)=>(x.sort_order||0)-(y.sort_order||0)).map(x=>x.image_url):[imgFallback]}
function catName(id){return state.categories.find(c=>c.id===id)?.name||""}

async function login(e){
  e.preventDefault();
  if(!db){$("#loginStatus").textContent="config.js Supabase məlumatları boşdur.";return}
  const v=Object.fromEntries(new FormData(e.currentTarget));
  const {error}=await db.auth.signInWithPassword({email:v.email,password:v.password});
  if(error){$("#loginStatus").textContent=error.message;return}
  await check();
}
async function check(){
  if(!db){$("#loginStatus").textContent="Supabase qoşulmayıb.";return}
  const {data}=await db.auth.getSession();
  state.user=data.session?.user;
  if(!state.user)return;
  const {data:p}=await db.from("profiles").select("role").eq("id",state.user.id).maybeSingle();
  if(p?.role!=="admin"){await db.auth.signOut();$("#loginStatus").textContent="Bu istifadəçi admin deyil.";return}
  $("#login").hidden=true;$("#app").hidden=false;await loadAll();
}
async function logout(){await db.auth.signOut();location.reload()}

async function loadAll(){
  await Promise.all([loadCategories(),loadProducts(),loadLeads(),loadSettings()]);
  render();
}
async function loadCategories(){const {data}=await db.from("categories").select("*").order("sort_order");state.categories=data||[]}
async function loadProducts(){const {data}=await db.from("products").select("*, product_images(*)").order("created_at",{ascending:false});state.products=data||[]}
async function loadLeads(){const {data}=await db.from("leads").select("*, products(name,sku)").order("created_at",{ascending:false});state.leads=data||[]}
async function loadSettings(){const {data}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();state.settings=data}

function render(){
  $("#statProducts").textContent=state.products.length;
  $("#statLeads").textContent=state.leads.filter(x=>x.status==="new").length;
  $("#statFeatured").textContent=state.products.filter(x=>x.featured).length;
  $("#bellCount").textContent=state.leads.filter(x=>x.status==="new").length;

  const opts=state.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#productCategory").innerHTML=opts;
  $("#filterCategory").innerHTML=`<option value="">Kateqoriya</option>`+opts;

  $("#productRows").innerHTML=state.products.map(p=>`
    <tr>
      <td>${p.sku||"—"}</td><td><img src="${imgs(p)[0]||imgFallback}"></td><td>${p.name}</td><td>${catName(p.category_id)}</td>
      <td>${p.stock||0}</td><td>${money(p.sale_price||p.price)}</td>
      <td><div class="actions"><button data-edit-product="${p.id}">✎ Düzəlt</button><button class="del" data-delete-product="${p.id}">🗑 Sil</button></div></td>
    </tr>`).join("");

  $("#categoryRows").innerHTML=state.categories.map(c=>`
    <tr><td>${c.name}</td><td>${c.slug}</td><td>${c.sort_order}</td>
    <td><div class="actions"><button data-edit-category="${c.id}">✎ Düzəlt</button><button class="del" data-delete-category="${c.id}">🗑 Sil</button></div></td></tr>`).join("");

  $("#leadRows").innerHTML=state.leads.map(l=>`
    <tr><td>${l.name}</td><td>${l.phone}</td><td>${l.products?.name||"Ümumi"}</td><td>${l.message||""}</td><td>${l.status}</td>
    <td><div class="actions"><button data-lead-status="${l.id}">Əlaqə saxlandı</button><button class="del" data-delete-lead="${l.id}">Sil</button></div></td></tr>`).join("");

  if(state.settings){
    const f=$("#settingsForm");
    Object.entries(state.settings).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||""});
  }
}

function payload(form){
  const v=Object.fromEntries(new FormData(form));
  return {
    category_id:v.category_id||null,name:v.name,slug:slugify(v.name),sku:v.sku||null,stock:v.stock?Number(v.stock):0,
    price:v.price?Number(v.price):null,sale_price:v.sale_price?Number(v.sale_price):null,
    colors:String(v.colors||"").split(",").map(x=>x.trim()).filter(Boolean),material:v.material||null,description:v.description||null,
    stock_status:v.stock_status||"in_stock",featured:form.elements.featured.checked,is_active:form.elements.is_active.checked
  };
}
async function saveProduct(e){
  e.preventDefault();
  const f=e.currentTarget,id=f.elements.id.value,p=payload(f);
  let r=id?await db.from("products").update(p).eq("id",id).select("id").single():await db.from("products").insert(p).select("id").single();
  if(r.error){$("#productStatus").textContent=r.error.message;return}
  const pid=id||r.data.id, files=$("#productImages").files;
  if(files.length){
    await db.from("product_images").delete().eq("product_id",pid);
    for(let i=0;i<files.length;i++){
      const file=files[i],ext=file.name.split(".").pop(),path=`${pid}/${Date.now()}-${i}.${ext}`;
      const up=await db.storage.from("product-images").upload(path,file,{upsert:true});
      if(up.error){$("#productStatus").textContent=up.error.message;return}
      const {data}=db.storage.from("product-images").getPublicUrl(path);
      await db.from("product_images").insert({product_id:pid,image_url:data.publicUrl,storage_path:path,sort_order:i});
    }
  }
  $("#productStatus").textContent="Məhsul saxlandı.";f.reset();f.elements.is_active.checked=true;await loadAll();
}
function editProduct(p){
  const f=$("#productForm");
  Object.entries(p).forEach(([k,v])=>{if(!f.elements[k])return;if(f.elements[k].type==="checkbox")f.elements[k].checked=!!v;else f.elements[k].value=Array.isArray(v)?v.join(", "):v??""});
  show("products");
}
async function delProduct(id){if(confirm("Məhsul silinsin?")){await db.from("products").delete().eq("id",id);await loadAll()}}

async function saveCategory(e){
  e.preventDefault();const f=e.currentTarget,v=Object.fromEntries(new FormData(f));
  const p={name:v.name,slug:v.slug||slugify(v.name),sort_order:Number(v.sort_order||1),is_active:true};
  const r=v.id?await db.from("categories").update(p).eq("id",v.id):await db.from("categories").insert(p);
  $("#categoryStatus").textContent=r.error?r.error.message:"Kateqoriya saxlandı.";if(!r.error){f.reset();await loadAll()}
}
function editCategory(c){const f=$("#categoryForm");f.elements.id.value=c.id;f.elements.name.value=c.name;f.elements.slug.value=c.slug;f.elements.sort_order.value=c.sort_order}
async function delCategory(id){if(confirm("Kateqoriya silinsin?")){await db.from("categories").delete().eq("id",id);await loadAll()}}
async function saveSettings(e){e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget));const {error}=await db.from("site_settings").upsert({id:1,...p});$("#settingsStatus").textContent=error?error.message:"Ayarlar saxlandı.";await loadAll()}
async function leadStatus(id){await db.from("leads").update({status:"contacted"}).eq("id",id);await loadAll()}
async function delLead(id){if(confirm("Sorğu silinsin?")){await db.from("leads").delete().eq("id",id);await loadAll()}}

function show(id){$$(".view").forEach(v=>v.classList.remove("active"));$(`#${id}`).classList.add("active");$$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id))}
function bind(){
  $("#loginForm").onsubmit=login;$("#logoutBtn").onclick=logout;$("#productForm").onsubmit=saveProduct;$("#categoryForm").onsubmit=saveCategory;$("#settingsForm").onsubmit=saveSettings;
  $$(".tab").forEach(t=>t.onclick=()=>show(t.dataset.view));
  $("#newProductBtn").onclick=()=>{$("#productForm").reset();$("#productForm").elements.is_active.checked=true;$("#productForm").elements.id.value=""};
  document.onclick=e=>{
    const ep=e.target.closest("[data-edit-product]"),dp=e.target.closest("[data-delete-product]"),ec=e.target.closest("[data-edit-category]"),dc=e.target.closest("[data-delete-category]"),ls=e.target.closest("[data-lead-status]"),dl=e.target.closest("[data-delete-lead]");
    if(ep)editProduct(state.products.find(p=>p.id===ep.dataset.editProduct)); if(dp)delProduct(dp.dataset.deleteProduct);
    if(ec)editCategory(state.categories.find(c=>c.id===ec.dataset.editCategory)); if(dc)delCategory(dc.dataset.deleteCategory);
    if(ls)leadStatus(ls.dataset.leadStatus); if(dl)delLead(dl.dataset.deleteLead);
  }
}
bind();check();
