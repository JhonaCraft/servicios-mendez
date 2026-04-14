// Reemplaza con tu número (formato internacional sin '+', ej: 54911xxxxxxx)
const PHONE = "584247226480"; // <-- reemplaza aquí

const ITEMS_INDEX = "items/index.json"; // lista de rutas a cada JSON de item
const BAZAR_CONTAINER_ID = "bazar-list";

function whatsappUrl(item){
  const precio = item.price ? formatPriceCOP(item.price) : "Consultar";
  const text = `Hola, estoy interesado en: ${item.title}. Precio: ${precio}. ¿Está disponible?`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(text)}`;
}

function escapeHtml(s){
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// Formatea números a estilo COP: 120000 -> "120.000 cop"
function formatPriceCOP(price){
  if (price === undefined || price === null) return "Consultar";
  const n = Number(price);
  if (!Number.isFinite(n)) return "Consultar";
  // sin decimales, separador de miles con punto, sufijo ' cop'
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " cop";
}

async function loadBazar(){
  const container = document.getElementById(BAZAR_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = `<p class="muted">Cargando artículos...</p>`;

  try{
    const idxRes = await fetch(ITEMS_INDEX);
    if (!idxRes.ok) throw new Error(`No se pudo cargar ${ITEMS_INDEX}: ${idxRes.status}`);
    const itemsList = await idxRes.json(); // espera array de rutas relativas
    container.innerHTML = "";

    for (const path of itemsList){
      try {
        const res = await fetch(path);
        if (!res.ok) {
          console.warn("No se pudo cargar item:", path, res.status);
          continue;
        }
        const item = await res.json();
        const card = document.createElement("article");
        card.className = "card item-card";

        // generar galería de imágenes (si hay)
        let imagesHtml = "";
        if (Array.isArray(item.images) && item.images.length){
          imagesHtml = `<div class="item-images">` + item.images.map(src =>
            `<a href="${escapeHtml(src)}" target="_blank" rel="noopener">
               <img class="item-img" src="${escapeHtml(src)}" alt="${escapeHtml(item.title || '')}">
             </a>`
          ).join("") + `</div>`;
        }

        const priceText = item.price ? formatPriceCOP(item.price) : "Consultar";
        card.innerHTML = `
          <h3 class="item-title">${escapeHtml(item.title || 'Sin título')}</h3>
          ${imagesHtml}
          <p class="item-desc">${escapeHtml(item.description || '')}</p>
          <p class="item-meta">${escapeHtml(item.condition || '')} · Precio: ${priceText}</p>
          <div class="card-actions">
            <a class="btn btn-cta" target="_blank" rel="noopener" href="${whatsappUrl(item)}">Consultar</a>
          </div>
        `;
        container.appendChild(card);

        // --- listeners para miniaturas: abrir lightbox con todas las imágenes del item
        const imgs = card.querySelectorAll('.item-img');
        if (imgs.length){
          const srcs = Array.from(imgs).map(i => i.src);
          imgs.forEach((im, idx) => {
            im.addEventListener('click', ev => {
              ev.preventDefault();
              openLightbox(srcs, idx);
            });
            const a = im.closest('a');
            if (a) a.addEventListener('click', ev => ev.preventDefault());
          });
        }
      } catch(innerErr){
        console.error("Error al cargar item", path, innerErr);
      }
    }

    if (!container.children.length){
      container.innerHTML = `<p class="muted">No hay artículos disponibles por ahora.</p>`;
    }

  } catch(err){
    console.error(err);
    container.innerHTML = `<p class="muted">Error al cargar artículos.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // actualizar año en footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Botón WhatsApp del hero
  const btnHero = document.getElementById("btn-whatsapp-hero");
  if (btnHero){
    const text = encodeURIComponent("Hola, necesito información sobre reparaciones. ¿Podemos coordinar?");
    btnHero.href = `https://api.whatsapp.com/send?phone=${PHONE}&text=${text}`;
  }

  loadBazar();
  // No llamamos a loadGallery() — las imágenes en /images son decorativas y se usan estáticamente.
});

// LIGHTBOX: funciones para abrir/mostrar imágenes
let _lbOverlay = null;
let _lbImg = null;
let _lbCurrent = 0;
let _lbSources = [];

function createLightboxIfNeeded(){
  if (_lbOverlay) return;
  _lbOverlay = document.createElement("div");
  _lbOverlay.className = "lightbox-overlay";
  _lbOverlay.innerHTML = `
    <div class="lightbox-inner">
      <button class="lightbox-close" aria-label="Cerrar">&times;</button>
      <button class="lightbox-nav lightbox-prev" aria-label="Anterior">&#10094;</button>
      <img class="lightbox-img" src="" alt="">
      <button class="lightbox-nav lightbox-next" aria-label="Siguiente">&#10095;</button>
    </div>
  `;
  document.body.appendChild(_lbOverlay);
  _lbImg = _lbOverlay.querySelector(".lightbox-img");
  _lbOverlay.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  _lbOverlay.querySelector(".lightbox-prev").addEventListener("click", ev => { ev.stopPropagation(); showLightboxIndex(_lbCurrent - 1); });
  _lbOverlay.querySelector(".lightbox-next").addEventListener("click", ev => { ev.stopPropagation(); showLightboxIndex(_lbCurrent + 1); });
  _lbOverlay.addEventListener("click", (e) => { if (e.target === _lbOverlay) closeLightbox(); });
}

function openLightbox(sources, index = 0){
  if (!Array.isArray(sources) || !sources.length) return;
  createLightboxIfNeeded();
  _lbSources = sources;
  showLightboxIndex(index);
  _lbOverlay.classList.add("open");
  document.addEventListener("keydown", _lbKeyHandler);
}

function closeLightbox(){
  if (!_lbOverlay) return;
  _lbOverlay.classList.remove("open");
  document.removeEventListener("keydown", _lbKeyHandler);
}

function showLightboxIndex(i){
  if (!_lbSources || !_lbSources.length) return;
  if (i < 0) i = _lbSources.length - 1;
  if (i >= _lbSources.length) i = 0;
  _lbCurrent = i;
  _lbImg.src = _lbSources[_lbCurrent];
  _lbImg.alt = `Imagen ${_lbCurrent + 1} de ${_lbSources.length}`;
}

function _lbKeyHandler(e){
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") showLightboxIndex(_lbCurrent - 1);
  if (e.key === "ArrowRight") showLightboxIndex(_lbCurrent + 1);
}

// Hero slideshow: usa las imágenes de .decor-grid .decor-img
function initHeroSlideshow({ interval = 5000 } = {}){
  const hero = document.querySelector(".hero");
  const slideshowRoot = document.querySelector(".hero-slideshow");
  if (!hero || !slideshowRoot) return;

  // recoger fuentes desde decor-grid (si existen) -- usan rutas relativas desde index.html
  const decorImgs = Array.from(document.querySelectorAll(".decor-grid .decor-img img, .decor-grid .decor-img"))
    .map(el => el.tagName === 'IMG' ? el.src : (el.getAttribute('src') || el.getAttribute('data-src')))
    .filter(Boolean);

  const sources = decorImgs.length ? decorImgs : ["images/hero-bg.jpg"];

  // limpiar slideshowRoot
  slideshowRoot.innerHTML = "";

  // crear slides
  sources.forEach((src, i) => {
    const div = document.createElement("div");
    div.className = "hero-slide";
    div.style.backgroundImage = `url("${src}")`;
    if (i === 0) div.classList.add("active");
    slideshowRoot.appendChild(div);
  });

  // agregar overlay para legibilidad (si no existe)
  if (!hero.querySelector(".hero-overlay")){
    const ov = document.createElement("div");
    ov.className = "hero-overlay";
    hero.appendChild(ov);
  }

  // rotación
  let idx = 0;
  const slides = Array.from(slideshowRoot.children);
  if (slides.length < 2) return;

  setInterval(() => {
    slides[idx].classList.remove("active");
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add("active");
  }, interval);
}

// llamar en DOMContentLoaded (añade si ya existe el listener)
document.addEventListener("DOMContentLoaded", () => {
  // ...existing code...
  initHeroSlideshow({ interval: 5000 }); // cambia intervalo (ms) si quieres otro ritmo
});


// Delegación robusta: abrir lightbox al hacer click en miniaturas o enlaces de imagen dentro de una card
document.addEventListener('click', (ev) => {
  // detectar imagen o enlace clicado
  const clickedImg = ev.target.closest('img.item-img');
  const clickedLink = ev.target.closest('a');
  const clicked = clickedImg || clickedLink;
  if (!clicked) return;

  // solo continuar si el enlace/imagen apunta a una imagen (fallback permite anchors generales)
  const likelyImageHref = clickedLink && /\.(jpe?g|png|webp|gif|svg)$/i.test(clickedLink.href || '');
  if (!clickedImg && !likelyImageHref) return;

  ev.preventDefault();

  // encontrar la card que agrupa las miniaturas
  const card = clicked.closest('.item-card, .card, .service-item');

  // recopilar miniaturas dentro de la card (preferir imgs con clase item-img)
  let imgs = card ? Array.from(card.querySelectorAll('img.item-img')) : [];
  // si no hay imgs con clase, tomar anchors con href a imágenes
  if (!imgs.length && card) {
    imgs = Array.from(card.querySelectorAll('a[href]'))
      .filter(a => /\.(jpe?g|png|webp|gif|svg)$/i.test(a.href))
      .map(a => a.querySelector('img') || a);
  }

  // construir array de src/href
  const srcs = imgs.map(el => el.tagName === 'IMG' ? el.src : el.href).filter(Boolean);

  // determinar índice inicial
  let idx = 0;
  if (clickedImg) idx = imgs.indexOf(clickedImg);
  else if (clickedLink) {
    // si el link contiene img, buscarlo; si no, buscar por href
    const innerImg = clickedLink.querySelector('img');
    if (innerImg) idx = imgs.indexOf(innerImg);
    else idx = srcs.indexOf(clickedLink.href);
  }

  if (srcs.length) {
    openLightbox(srcs, idx >= 0 ? idx : 0);
  } else {
    // fallback: abrir solo la imagen clicada si no se pudo recopilar galería
    const single = clickedImg ? clickedImg.src : (clickedLink && clickedLink.href);
    if (single) openLightbox([single], 0);
  }
});