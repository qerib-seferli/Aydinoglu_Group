const config = window.NAR_NOOR_CONFIG || {};
const hasSupabase =
  window.supabase &&
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_") &&
  !config.supabaseAnonKey.includes("YOUR_");

const db = hasSupabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

const fallbackMenu = [
  {
    id: "local-1",
    title: "Nar Souslu Dana",
    description: "Kömürdə bişmiş dana filesi, nar demi-glace və xırtıldayan soğan.",
    category: "grill",
    price: 34,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-2",
    title: "Qara Trüf Risotto",
    description: "Arborio düyüsü, qəhvəyi yağ, parmesan və trüf aroması.",
    category: "hot",
    price: 24,
    image_url: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-3",
    title: "Noor Burger",
    description: "Smash köftə, qırmızı sous, cheddar, karamelizə soğan.",
    category: "hot",
    price: 18,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-4",
    title: "Şokolad Lava",
    description: "İsti şokolad keki, maloçnu krem və sarı meyvə coulis.",
    category: "dessert",
    price: 12,
    image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-5",
    title: "Fire Kebab Set",
    description: "Quzu tikələri, qəhvəyi ədviyyat mix, köz tərəvəzləri.",
    category: "grill",
    price: 29,
    image_url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-6",
    title: "Saffron Spritz",
    description: "Zəfəran, sitrus, tonik və qırmızı giləmeyvə notları.",
    category: "drink",
    price: 10,
    image_url: "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-7",
    title: "Maloçnu Cheesecake",
    description: "Yüngül krem pendir, qızılı biskvit və nar reduksiyası.",
    category: "dessert",
    price: 11,
    image_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "local-8",
    title: "Espresso Tonic",
    description: "Soyuq espresso, tonik, limon qabığı və sarı buz kubu.",
    category: "drink",
    price: 8,
    image_url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=80"
  }
];

const categoryLabels = {
  hot: "İsti",
  grill: "Grill",
  dessert: "Desert",
  drink: "İçki"
};

let menuItems = [];
let currentFilter = "all";
let cart = JSON.parse(localStorage.getItem("narNoorCart") || "[]");

const menuGrid = document.querySelector("[data-menu-grid]");
const template = document.querySelector("#menu-card-template");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const backdrop = document.querySelector("[data-backdrop]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCount = document.querySelector("[data-cart-count]");
const cartTotal = document.querySelector("[data-cart-total]");

function formatPrice(value) {
  return `${Number(value).toFixed(0)} AZN`;
}

function saveCart() {
  localStorage.setItem("narNoorCart", JSON.stringify(cart));
  renderCart();
}

function addToCart(item) {
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  openCart();
}

function changeQty(id, delta) {
  cart = cart
    .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
    .filter((item) => item.quantity > 0);
  saveCart();
}

function renderMenu() {
  const visible =
    currentFilter === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === currentFilter);

  menuGrid.innerHTML = "";
  visible.forEach((item) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector("[data-img]").src = item.image_url;
    card.querySelector("[data-img]").alt = item.title;
    card.querySelector("[data-category]").textContent = categoryLabels[item.category] || item.category;
    card.querySelector("[data-title]").textContent = item.title;
    card.querySelector("[data-description]").textContent = item.description;
    card.querySelector("[data-price]").textContent = formatPrice(item.price);
    card.querySelector("[data-add]").addEventListener("click", () => addToCart(item));
    menuGrid.append(card);
  });
  observeReveals();
}

function renderCart() {
  cartItems.innerHTML = "";
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);
  cartCount.textContent = count;
  cartTotal.textContent = formatPrice(total);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="form-status">Səbət boşdur. Menyudan dadlı nəsə seç.</p>';
    return;
  }

  cart.forEach((item) => {
    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <span>${formatPrice(item.price)} x ${item.quantity}</span>
      </div>
      <div class="qty">
        <button type="button" aria-label="Azalt">-</button>
        <b>${item.quantity}</b>
        <button type="button" aria-label="Artır">+</button>
      </div>
    `;
    const [minus, plus] = row.querySelectorAll("button");
    minus.addEventListener("click", () => changeQty(item.id, -1));
    plus.addEventListener("click", () => changeQty(item.id, 1));
    cartItems.append(row);
  });
}

function openCart() {
  cartDrawer.classList.add("open");
  backdrop.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  backdrop.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

async function loadMenu() {
  if (!db) {
    menuItems = fallbackMenu;
    renderMenu();
    return;
  }

  const { data, error } = await db
    .from("menu_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  menuItems = error || !data?.length ? fallbackMenu : data;
  renderMenu();
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function insertRow(table, payload) {
  if (!db) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { error: null };
  }
  return db.from(table).insert(payload);
}

function wireForms() {
  const reservationForm = document.querySelector("[data-reservation-form]");
  const reservationStatus = document.querySelector("[data-reservation-status]");
  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    reservationStatus.textContent = "Göndərilir...";
    const payload = getFormData(reservationForm);
    payload.guests = Number(payload.guests);
    const { error } = await insertRow("reservations", payload);
    reservationStatus.textContent = error
      ? "Xəta baş verdi. Supabase ayarlarını yoxla."
      : "Rezervasiya qəbul edildi. Tezliklə əlaqə saxlayacağıq.";
    if (!error) reservationForm.reset();
  });

  const newsletterForm = document.querySelector("[data-newsletter-form]");
  const newsletterStatus = document.querySelector("[data-newsletter-status]");
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    newsletterStatus.textContent = "Yazılır...";
    const { error } = await insertRow("newsletter_subscribers", getFormData(newsletterForm));
    newsletterStatus.textContent = error ? "Bu email artıq qeydiyyatda ola bilər." : "Abunəlik aktivdir.";
    if (!error) newsletterForm.reset();
  });

  const orderForm = document.querySelector("[data-order-form]");
  const orderStatus = document.querySelector("[data-order-status]");
  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!cart.length) {
      orderStatus.textContent = "Əvvəlcə səbətə məhsul əlavə et.";
      return;
    }
    orderStatus.textContent = "Sifariş göndərilir...";
    const form = getFormData(orderForm);
    const total = cart.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);
    const { error } = await insertRow("orders", {
      ...form,
      items: cart,
      total_amount: total
    });
    orderStatus.textContent = error ? "Sifariş yazılmadı. Supabase ayarlarını yoxla." : "Sifariş qəbul edildi.";
    if (!error) {
      cart = [];
      orderForm.reset();
      saveCart();
    }
  });
}

function observeReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal:not(.in)").forEach((item) => observer.observe(item));
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderMenu();
  });
});

document.querySelector("[data-open-cart]").addEventListener("click", openCart);
document.querySelector("[data-close-cart]").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);

document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".nav").classList.toggle("open");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => document.querySelector(".nav").classList.remove("open"));
});

renderCart();
wireForms();
observeReveals();
loadMenu();
