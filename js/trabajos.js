// Reemplaza con tu número (formato internacional sin '+', ej: 54911xxxxxxx)
const PHONE = "584247226480"; // <-- reemplaza aquí

const TRABAJOS_INDEX = "trabajos/index.json"; // lista de rutas a cada JSON de trabajo
const TRABAJOS_CONTAINER_ID = "trabajos-list";

function whatsappUrlTrabajo(trabajo){
  const text = `Hola, vi el trabajo de "${trabajo.title}" que realizaron. Necesito una reparación similar. ¿Podrían darme más información?`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(text)}`;
}

function escapeHtml(s){
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function loadTrabajos(){
  const container = document.getElementById(TRABAJOS_CONTAINER_ID);
  if (!container) {
    console.error("No se encontró el contenedor:", TRABAJOS_CONTAINER_ID);
    return;
  }
  container.innerHTML = `<p class="muted">Cargando trabajos...</p>`;

  try{
    console.log("Cargando índice de trabajos:", TRABAJOS_INDEX);
    const idxRes = await fetch(TRABAJOS_INDEX);
    if (!idxRes.ok) throw new Error(`No se pudo cargar ${TRABAJOS_INDEX}: ${idxRes.status}`);
    const trabajosList = await idxRes.json(); // espera array de rutas relativas
    console.log("Trabajos encontrados:", trabajosList);
    container.innerHTML = "";

    for (const path of trabajosList){
      try {
        console.log("Cargando trabajo:", path);
        const res = await fetch(path);
        if (!res.ok) {
          console.warn("No se pudo cargar trabajo:", path, res.status);
          continue;
        }
        const trabajo = await res.json();
        console.log("Datos del trabajo:", trabajo);
        const card = document.createElement("article");
        card.className = "card trabajo-card";

        // generar galería de imágenes (si hay)
        let imagesHtml = "";
        if (Array.isArray(trabajo.images) && trabajo.images.length){
          const validImages = trabajo.images.filter(src => src && src.trim() !== '');
          if (validImages.length > 0) {
            imagesHtml = `<div class="trabajo-images">` + validImages.map(src =>
              `<a href="${escapeHtml(src)}" target="_blank" rel="noopener">
                 <img class="trabajo-img" src="${escapeHtml(src)}" alt="${escapeHtml(trabajo.title || '')}" 
                      onerror="this.style.display='none'; this.parentElement.style.display='none';">
               </a>`
            ).join("") + `</div>`;
          }
        }

        card.innerHTML = `
          <h3 class="trabajo-title">${escapeHtml(trabajo.title || 'Sin título')}</h3>
          ${imagesHtml}
          <p class="trabajo-desc">${escapeHtml(trabajo.description || '')}</p>
          <p class="trabajo-meta">${escapeHtml(trabajo.service_type || '')}</p>
          <div class="card-actions">
            <a class="btn btn-cta" target="_blank" rel="noopener" href="${whatsappUrlTrabajo(trabajo)}">Consultar</a>
          </div>
        `;
        container.appendChild(card);
        console.log("Card añadida para:", trabajo.title);

        // --- listeners para miniaturas: abrir lightbox con todas las imágenes del trabajo
        const imgs = card.querySelectorAll('.trabajo-img');
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
        console.error("Error al cargar trabajo", path, innerErr);
      }
    }

    if (!container.children.length){
      container.innerHTML = `<p class="muted">No hay trabajos disponibles por ahora.</p>`;
    }

  } catch(err){
    console.error(err);
    container.innerHTML = `<p class="muted">Error al cargar trabajos.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadTrabajos();
});

// LIGHTBOX: funciones para abrir/mostrar imágenes (reutilizadas de app.js)
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
