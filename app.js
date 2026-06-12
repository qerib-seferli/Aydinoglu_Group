const cfg = window.AYDINOGLU_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const fallbackImage = "./Foto/Aydinoglu_mebel_berde_logo.jpg";

const fallbackCategories = [
  { id:"living", name:"Qonaq otağı", slug:"qonaq-otagi", sort_order:1 },
  { id:"bedroom", name:"Yataq otağı", slug:"yataq-otagi", sort_order:2 },
  { id:"kitchen", name:"Mətbəx", slug:"metbex", sort_order:3 },
  { id:"office", name:"Ofis", slug:"ofis", sort_order:4 }
];

const fallbackProducts = [
  { id:"p1", category_id:"living", name:"Loft Divan", sku:"MS001", price:1500, sale_price:null, stock:25, material:"Parça", colors:["boz","qəhvəyi"], description:"Modern qonaq otağı üçün rahat divan.", stock_status:"in_stock", featured:true, created_at:"2026-01-01", product_images:[{image_url:fallbackImage,sort_order:0}] },
  { id:"p2", category_id:"living", name:"Skandinav Çarpayı", sku:"MS002", price:1100, sale_price:null, stock:25, material:"Taxta", colors:["bej","ağ"], description:"Minimal yataq otağı üçün zövqlü seçim.", stock_status:"in_stock", featured:true, created_at:"2026-01-02", product_images:[{image_url:fallbackImage,sort_order:0}] },
  { id:"p3", category_id:"kitchen", name:"Premium Masa Dəsti", sku:"MS003", price:1290, sale_price:null, stock:15, material:"MDF", colors:["ağ","qara"], description:"Mətbəx və qonaq otağı üçün masa dəsti.", stock_status:"preorder", featured:true, created_at:"2026-01-03", product_images:[{image_url:fallbackImage,sort_order:0}] },
  { id:"p4", category_id:"office", name:"Home Office", sku:"MS004", price:850, sale_price:null, stock:7, material:"Laminat", colors:["qəhvəyi"], description:"Ev ofisi üçün kompakt masa və rəf həlli.", stock_status:"in_stock", featured:false, created_at:"2026-01-04", product_images:[{image_url:fallbackImage,sort_order:0}] }
];

const state = { categories:[], products:[], filter:"all", search:"", sort:"featured" };

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

function money(v){ return !v || Number(v)<=0 ? "Qiymət soruş" : `${Number(v).toLocaleString("az-AZ")} AZN`; }
function cleanPhone(v){ return String(v||"").replace(/\D/g,""); }
function stockLabel(v){ return {in_stock:"Stokda",preorder:"Sifarişlə",sold_out:"Bitib"}[v] || "Soruş"; }
function imgs(p){ const a=Array.isArray(p.product_images)?p.product_images:[]; return a.length?a.sort((x,y)=>(x.sort_order||0)-(y.sort_order||0)).map(x=>x.image_url):[p.image_url||fallbackImage]; }
function norm(p){ return {...p, colors:Array.isArray(p.colors)?p.colors:String(p.colors||"").split(",").map(x=>x.trim()).filter(Boolean)}; }

async function safe(q,f){ if(!db||!q)return f; const {data,error}=await q; if(error){console.warn(error.message);return f} return data??f; }

async function loadData(){
  const cats=await safe(db?.from("categories").select("*").eq("is_active",true).order("sort_order"),fallbackCategories);
  const products=await safe(db?.from("products").select("*, product_images(*)").eq("is_active",true).order("featured",{ascending:false}).order("created_at",{ascending:false}),fallbackProducts);
  state.categories=[{id:"all",name:"Hamısı",slug:"all"},...cats];
  state.products=products.map(norm);
  renderAll();
}

function renderAll(){
  renderCategorySelect();
  renderTabs();
  renderRooms();
  renderFeatured();
  renderProducts();
  renderLeadSelect();
  const f=state.products.find(x=>x.featured)||state.products[0];
  if(f){ $("#heroImg").src=imgs(f)[0]||fallbackImage; }
}

function renderCategorySelect(){
  $("#categorySelect").innerHTML=state.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}

function renderTabs(){
  $("#categoryTabs").innerHTML="";
  state.categories.forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c.name;
    b.className=c.id===state.filter?"active":"";
    b.onclick=()=>{state.filter=c.id;renderTabs();renderProducts();};
    $("#categoryTabs").append(b);
  });
}

function renderRooms(){
  const counts = id => state.products.filter(p=>p.category_id===id).length;
  const data=[
    ["Qonaq Otağı Divanları","living",fallbackImage],
    ["Yataq Otağı","bedroom",fallbackImage],
    ["Premium Masa Dəsti","kitchen",fallbackImage],
    ["Home Office","office",fallbackImage]
  ];
  $("#roomGrid").innerHTML=data.map(x=>`
    <article class="room-card">
      <img src="${x[2]}" alt="">
      <div><h3>${x[0]}</h3><p>${counts(x[1])} məhsul</p></div>
    </article>
  `).join("");
}

function visibleProducts(){
  const q=state.search.toLowerCase();
  return state.products
    .filter(p=>state.filter==="all"||p.category_id===state.filter)
    .filter(p=>[p.name,p.sku,p.description,p.material,...(p.colors||[])].join(" ").toLowerCase().includes(q))
    .sort((a,b)=>{
      if(state.sort==="priceAsc")return Number(a.sale_price||a.price||0)-Number(b.sale_price||b.price||0);
      if(state.sort==="priceDesc")return Number(b.sale_price||b.price||0)-Number(a.sale_price||a.price||0);
      if(state.sort==="newest")return new Date(b.created_at||0)-new Date(a.created_at||0);
      return Number(b.featured)-Number(a.featured);
    });
}

function renderFeatured(){
  const list=state.products.filter(p=>p.featured).slice(0,3);
  $("#featuredGrid").innerHTML=list.map(p=>`
    <article class="featured-card" onclick="openProductById('${p.id}')">
      <img src="${imgs(p)[0]||fallbackImage}" alt="">
      <div><h3>${p.name}</h3><b>${money(p.sale_price||p.price)}</b></div>
    </article>
  `).join("");
}

function renderProducts(){
  const list=visibleProducts();
  const grid=$("#productGrid"), tpl=$("#productTemplate");
  grid.innerHTML="";
  $("#emptyProducts").hidden=list.length>0;
  list.forEach(p=>{
    const n=tpl.content.firstElementChild.cloneNode(true);
    $(".card-img img",n).src=imgs(p)[0]||fallbackImage;
    $(".card-img img",n).alt=p.name;
    $(".card-img span",n).textContent=stockLabel(p.stock_status);
    $(".card-body h3",n).textContent=p.name;
    $(".card-body p",n).textContent=p.description||"";
    $(".card-bottom b",n).textContent=money(p.sale_price||p.price);
    const meta=$(".card-meta",n);
    [p.sku,p.material,...(p.colors||[])].filter(Boolean).slice(0,3).forEach(v=>{
      const s=document.createElement("span"); s.textContent=v; meta.append(s);
    });
    $(".card-img",n).onclick=()=>openProduct(p);
    $(".card-bottom button",n).onclick=()=>openProduct(p);
    grid.append(n);
  });
}

function renderLeadSelect(){
  $("#leadProductSelect").innerHTML=`<option value="">Ümumi sorğu</option>`+state.products.map(p=>`<option value="${p.id}">${p.name} ${p.sku?`· ${p.sku}`:""}</option>`).join("");
}

function openProductById(id){ const p=state.products.find(x=>x.id===id); if(p)openProduct(p); }

function openProduct(p){
  const images=imgs(p);
  $("#modalMain").src=images[0]||fallbackImage;
  $("#modalSku").textContent=p.sku||"AYDINOĞLU GROUP";
  $("#modalTitle").textContent=p.name;
  $("#modalDesc").textContent=p.description||"";
  $("#modalSpecs").innerHTML=[
    ["Qiymət",money(p.sale_price||p.price)],["Material",p.material],["Rəng",(p.colors||[]).join(", ")],
    ["En",p.width_cm?`${p.width_cm} sm`:""],["Hündürlük",p.height_cm?`${p.height_cm} sm`:""],["Stok",stockLabel(p.stock_status)]
  ].filter(x=>x[1]).map(x=>`<span>${x[0]}: ${x[1]}</span>`).join("");
  $("#modalThumbs").innerHTML="";
  images.forEach(src=>{
    const b=document.createElement("button"); b.innerHTML=`<img src="${src}" alt="">`; b.onclick=()=>$("#modalMain").src=src; $("#modalThumbs").append(b);
  });
  const text=encodeURIComponent(`Salam, ${p.name} ${p.sku?`(${p.sku})`:""} haqqında məlumat istəyirəm.`);
  $("#modalWa").href=`https://wa.me/994502097254?text=${text}`;
  $("#productModal").hidden=false;
}

async function submitLead(e){
  e.preventDefault();
  const v=Object.fromEntries(new FormData(e.currentTarget));
  $("#leadStatus").textContent="Göndərilir...";
  if(!db){ $("#leadStatus").textContent="Supabase qoşulandan sonra sorğu bazaya yazılacaq."; return; }
  const {error}=await db.from("leads").insert({name:v.name,phone:v.phone,product_id:v.product_id||null,message:v.message||null,status:"new"});
  $("#leadStatus").textContent=error?error.message:"Sorğunuz qəbul edildi.";
  if(!error)e.currentTarget.reset();
}

function bind(){
  $("#menuBtn").onclick=()=>$("#nav").classList.toggle("open");
  $$("#nav a").forEach(a=>a.onclick=()=>$("#nav").classList.remove("open"));
  $("#searchInput").oninput=e=>{state.search=e.target.value;renderProducts();};
  $("#categorySelect").onchange=e=>{state.filter=e.target.value;renderTabs();renderProducts();};
  $("#sortSelect").onchange=e=>{state.sort=e.target.value;renderProducts();};
  $("#leadForm").onsubmit=submitLead;
  $$("[data-close]").forEach(x=>x.onclick=()=>$("#productModal").hidden=true);
  document.onkeydown=e=>{if(e.key==="Escape")$("#productModal").hidden=true;};
}
bind(); loadData();
