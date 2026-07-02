const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const searchToggle = document.querySelector("[data-search-toggle]");
const headerSearch = document.querySelector("[data-header-search]");
const searchForm = document.querySelector("[data-search-form]");
const searchInput = document.querySelector("[data-search-input]");
const searchResults = document.querySelector("[data-search-results]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.add("reveal-ready");

const touchPointer = window.matchMedia("(pointer: coarse)").matches;
const woodDustConfig = {
  colors: ["#e2dcd3", "#d6b98c", "#b96842", "#c88b54", "#8f5a34"],
  maxParticlesPerMove: 2,
  minTimeBetweenBursts: 34,
  maxParticlesOnScreen: 80,
};

let lastDustTime = 0;
let activeDustParticles = 0;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createWoodParticle = (x, y) => {
  if (activeDustParticles >= woodDustConfig.maxParticlesOnScreen) return;

  const particle = document.createElement("span");
  const size = randomBetween(3, 8);
  const duration = randomBetween(620, 980);

  particle.className = "wood-particle";
  particle.style.setProperty("--particle-x", `${x + randomBetween(-8, 8)}px`);
  particle.style.setProperty("--particle-y", `${y + randomBetween(-8, 8)}px`);
  particle.style.setProperty("--particle-width", `${size * randomBetween(1.2, 2.2)}px`);
  particle.style.setProperty("--particle-height", `${Math.max(2, size * randomBetween(0.45, 0.8))}px`);
  particle.style.setProperty("--particle-drift-x", `${randomBetween(-22, 22)}px`);
  particle.style.setProperty("--particle-fall", `${randomBetween(26, 58)}px`);
  particle.style.setProperty("--particle-rotation", `${randomBetween(0, 180)}deg`);
  particle.style.setProperty("--particle-spin", `${randomBetween(-150, 150)}deg`);
  particle.style.setProperty("--particle-duration", `${duration}ms`);
  particle.style.setProperty("--particle-opacity", `${randomBetween(0.28, 0.58)}`);
  particle.style.setProperty(
    "--particle-color",
    woodDustConfig.colors[Math.floor(Math.random() * woodDustConfig.colors.length)]
  );

  activeDustParticles += 1;
  document.body.appendChild(particle);

  particle.addEventListener(
    "animationend",
    () => {
      particle.remove();
      activeDustParticles -= 1;
    },
    { once: true }
  );
};

const handleWoodDust = (event) => {
  const now = performance.now();

  if (now - lastDustTime < woodDustConfig.minTimeBetweenBursts) return;

  lastDustTime = now;

  for (let index = 0; index < woodDustConfig.maxParticlesPerMove; index += 1) {
    createWoodParticle(event.clientX, event.clientY);
  }
};

if (!reducedMotion && !touchPointer) {
  window.addEventListener("pointermove", handleWoodDust, { passive: true });
}

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

if (searchToggle && headerSearch && searchForm && searchInput && searchResults) {
  const normalizeSearchText = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const quickLinks = [...nav.querySelectorAll("a")].map((link) => ({
    label: link.textContent.trim(),
    href: link.getAttribute("href"),
    keywords: normalizeSearchText(link.textContent),
    type: "Navegación",
  }));

  const sectionLinks = [...document.querySelectorAll("main section")]
    .map((section, index) => {
      const heading = section.querySelector("h1, h2, h3");
      if (!heading) return null;

      if (!section.id && !heading.id) section.id = `seccion-${index + 1}`;
      const label = (heading.innerText || heading.textContent).replace(/\s+/g, " ").trim();

      return {
        label,
        href: section.id ? `#${section.id}` : `#${heading.id}`,
        keywords: normalizeSearchText(`${label} ${section.innerText || section.textContent}`),
        type: "En esta página",
      };
    })
    .filter(Boolean);

  const searchIndex = [...quickLinks, ...sectionLinks].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index
  );
  let closeSearchTimer = null;

  const closeSearch = (returnFocus = false) => {
    headerSearch.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Abrir buscador");

    const finishClose = () => {
      headerSearch.hidden = true;
      if (returnFocus) searchToggle.focus();
    };

    if (reducedMotion) finishClose();
    else closeSearchTimer = window.setTimeout(finishClose, 260);
  };

  const renderSearchResults = (query = "") => {
    const normalizedQuery = normalizeSearchText(query);
    searchResults.replaceChildren();

    const renderedResults = normalizedQuery
      ? searchIndex
          .filter((item) => item.keywords.includes(normalizedQuery))
          .sort((a, b) => {
            const aLabel = normalizeSearchText(a.label);
            const bLabel = normalizeSearchText(b.label);
            return Number(!aLabel.startsWith(normalizedQuery)) - Number(!bLabel.startsWith(normalizedQuery));
          })
          .slice(0, 6)
      : quickLinks;

    if (!renderedResults.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.textContent = "No encontramos coincidencias. Probá con otra palabra.";
      searchResults.appendChild(emptyMessage);
      return;
    }

    renderedResults.forEach((item) => {
      const resultLink = document.createElement("a");
      const resultLabel = document.createElement("span");
      resultLink.className = "search-result";
      resultLink.href = item.href;
      resultLink.setAttribute("data-search-result", "");
      resultLink.setAttribute("aria-label", `${item.label}, ${item.type}`);
      resultLabel.textContent = item.label;
      resultLink.appendChild(resultLabel);
      resultLink.addEventListener("click", () => closeSearch());
      searchResults.appendChild(resultLink);
    });
  };

  const openSearch = () => {
    window.clearTimeout(closeSearchTimer);
    headerSearch.hidden = false;
    searchToggle.setAttribute("aria-expanded", "true");
    searchToggle.setAttribute("aria-label", "Cerrar buscador");
    renderSearchResults(searchInput.value);
    window.requestAnimationFrame(() => headerSearch.classList.add("is-open"));
    window.setTimeout(() => searchInput.focus(), reducedMotion ? 0 : 180);
  };

  searchToggle.addEventListener("click", () => {
    if (searchToggle.getAttribute("aria-expanded") === "true") closeSearch(true);
    else openSearch();
  });

  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const firstResult = searchResults.querySelector("[data-search-result]");
    if (firstResult) firstResult.click();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchToggle.getAttribute("aria-expanded") === "true") {
      closeSearch(true);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      searchToggle.getAttribute("aria-expanded") === "true" &&
      !header.contains(event.target)
    ) {
      closeSearch();
    }
  });
}

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

const revealImages = document.querySelectorAll(".reveal-image");
const restorationSlider = document.querySelector("[data-restoration-slider]");
const restorationSteps = document.querySelectorAll("[data-restoration-step]");
const restorationViewport = restorationSlider?.querySelector(".restoration-viewport");
const restorationProgressItems = document.querySelectorAll("[data-restoration-progress] li");
const learningPath = document.querySelector("[data-learning-path]");
const learningPathCards = learningPath?.querySelectorAll(".learning-card") ?? [];
const learningPathHorizontalQuery = window.matchMedia("(max-width: 760px)");

if (learningPath && learningPathCards.length && !reducedMotion && !learningPathHorizontalQuery.matches) {
  learningPath.classList.add("is-scroll-ready");
}

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const smoothstep = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};
let ticking = false;

const updateRestorationParallax = () => {
  if (!restorationSlider || !restorationSteps.length) return;

  const viewportHeight = window.innerHeight;
  const headerOffset = header.offsetHeight;
  const sliderRect = restorationSlider.getBoundingClientRect();
  const scrollDistance = Math.max(restorationSlider.offsetHeight - viewportHeight, 1);
  const sliderProgress = clamp((headerOffset - sliderRect.top) / scrollDistance);
  let slidePosition = 0;

  if (sliderProgress < 0.18) {
    slidePosition = 0;
  } else if (sliderProgress < 0.42) {
    slidePosition = smoothstep((sliderProgress - 0.18) / 0.24);
  } else if (sliderProgress < 0.58) {
    slidePosition = 1;
  } else if (sliderProgress < 0.82) {
    slidePosition = 1 + smoothstep((sliderProgress - 0.58) / 0.24);
  } else {
    slidePosition = 2;
  }

  const currentIndex = Math.round(slidePosition);

  restorationViewport.style.setProperty("--rail-y", `${slidePosition * 63}px`);
  restorationViewport.style.setProperty("--rail-x", `${slidePosition * 42}px`);

  restorationSteps.forEach((step, index) => {
    const slideOffset = reducedMotion ? index - currentIndex : index - slidePosition;

    step.style.zIndex = String(index + 1);
    step.style.visibility = Math.abs(slideOffset) >= 0.999 ? "hidden" : "visible";
    step.classList.toggle("is-current", index === currentIndex);
    step.setAttribute("aria-hidden", String(index !== currentIndex));
    step.querySelectorAll("a").forEach((link) => {
      link.tabIndex = index === currentIndex ? 0 : -1;
    });

    step.querySelectorAll("[data-depth]").forEach((layer) => {
      const depth = Number(layer.dataset.depth);
      const layerSpeed = Math.max(0.4, 1 + depth * 3);
      const layerOffset = slideOffset * viewportHeight * layerSpeed;
      layer.style.setProperty("--parallax-y", `${layerOffset}px`);
    });
  });

restorationProgressItems.forEach((item, index) => {
    const isCurrent = index === currentIndex;
    item.classList.toggle("is-active", isCurrent);

    if (isCurrent) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
};

const capsule = document.querySelector(".capsule");
const capsulePhotos = capsule?.querySelectorAll(".capsule-photo") ?? [];
const capsulePreview = document.querySelector("[data-capsule-preview]");
const capsulePreviewImage = document.querySelector("[data-capsule-preview-image]");
const capsulePreviewTitle = document.querySelector("[data-capsule-preview-title]");
const capsulePreviewDescription = document.querySelector("[data-capsule-preview-description]");
const capsulePreviewOrigin = document.querySelector("[data-capsule-preview-origin]");
const capsulePreviewMaterial = document.querySelector("[data-capsule-preview-material]");
const capsulePreviewIntervention = document.querySelector("[data-capsule-preview-intervention]");
const capsuleClose = document.querySelector("[data-capsule-close]");
const capsuleMaterialLink = document.querySelector("[data-capsule-materials]");
let lastCapsuleTrigger = null;

const capsulePieces = [
  {
    title: "Trama envolvente",
    description: "Una pieza liviana que explora el encuentro entre superficies tensadas y curvas continuas.",
    origin: "Estructura recuperada / Respaldo flexible",
    material: "Madera laminada / Textil técnico",
    intervention: "Curvado / Retapizado / Terminación mate",
  },
  {
    title: "Sillón cóncavo",
    description: "Pieza ensamblada a partir de fragmentos recuperados, con respaldo curvo y estructura restaurada.",
    origin: "Respaldo recuperado / Estructura de nogal",
    material: "Madera maciza / Textil recuperado",
    intervention: "Reensamble / Reparación / Terminación mate",
  },
  {
    title: "Arco ligero",
    description: "Una silueta de madera clara donde la continuidad formal define una presencia serena.",
    origin: "Silla de comedor / Década del 70",
    material: "Haya maciza / Fibras naturales",
    intervention: "Lijado fino / Curvado / Encerado",
  },
  {
    title: "Unión serena",
    description: "Detalle de apoyo reconstruido para conservar la proporción y el gesto original de la pieza.",
    origin: "Fragmento de respaldo / Autor desconocido",
    material: "Roble claro / Esterilla",
    intervention: "Injerto / Encastre / Protección natural",
  },
  {
    title: "Volumen terracota",
    description: "Un volumen bajo y envolvente renovado desde el color, la textura y el confort cotidiano.",
    origin: "Sillón modular / Producción nacional",
    material: "Espuma recuperada / Bouclé terracota",
    intervention: "Refuerzo / Retapizado / Reconfiguración",
  },
  {
    title: "Curva verde",
    description: "La estructura original vuelve a tomar protagonismo mediante un asiento de tono profundo.",
    origin: "Butaca nórdica / Mediados de siglo",
    material: "Nogal / Paño de lana",
    intervention: "Encolado / Tapicería / Aceitado",
  },
  {
    title: "Respaldo tallado",
    description: "Una geometría expresiva restaurada para recuperar su equilibrio sin borrar las marcas del tiempo.",
    origin: "Silla artesanal / Taller rioplatense",
    material: "Madera maciza / Fibra tejida",
    intervention: "Consolidación / Limpieza / Reintegración",
  },
  {
    title: "Oficio abierto",
    description: "El proceso queda visible como parte del diseño y revela la lógica constructiva de la pieza.",
    origin: "Estructura incompleta / Pieza de archivo",
    material: "Fresno / Cinchas de algodón",
    intervention: "Reensamble / Tensado / Acabado al aceite",
  },
  {
    title: "Perfil nocturno",
    description: "Una lectura íntima del respaldo, donde sombra, veta y proporción construyen el carácter.",
    origin: "Butaca de lectura / Serie limitada",
    material: "Nogal oscuro / Cuero vegetal",
    intervention: "Pulido / Nutrición / Protección mate",
  },
  {
    title: "Nube de roble",
    description: "Un asiento de líneas suaves que combina una base sólida con una superficie táctil y luminosa.",
    origin: "Sillón individual / Estructura recuperada",
    material: "Roble / Bouclé crudo",
    intervention: "Refuerzo / Modelado / Retapizado",
  },
  {
    title: "Ensamble visible",
    description: "La unión entre planos se conserva a la vista como testimonio del sistema constructivo original.",
    origin: "Banco bajo / Carpintería tradicional",
    material: "Petiribí / Lino encerado",
    intervention: "Ajuste / Injerto / Sellado",
  },
  {
    title: "Pliegue carmín",
    description: "Color y textura transforman una pieza compacta en un acento contemporáneo de fuerte presencia.",
    origin: "Módulo tapizado / Década del 80",
    material: "Madera multilaminada / Chenille",
    intervention: "Reparación / Retapizado / Ajuste formal",
  },
  {
    title: "Butaca umbral",
    description: "Una forma escultórica recuperada para habitar el límite entre mobiliario y objeto.",
    origin: "Prototipo de butaca / Colección privada",
    material: "Madera torneada / Tejido de lana",
    intervention: "Consolidación / Revestimiento / Acabado mate",
  },
  {
    title: "Línea suave",
    description: "La mínima intervención devuelve estabilidad y realza la continuidad del respaldo original.",
    origin: "Silla auxiliar / Diseño anónimo",
    material: "Guatambú / Tapizado natural",
    intervention: "Encolado / Limpieza / Retapizado",
  },
  {
    title: "Nudo suspendido",
    description: "Una pieza compacta donde el encuentro entre planos genera una silueta precisa y silenciosa.",
    origin: "Apoyabrazos recuperado / Pieza única",
    material: "Nogal / Textil de alto tránsito",
    intervention: "Reensamble / Calibrado / Protección",
  },
];

const resetCapsuleDepth = () => {
  capsulePhotos.forEach((photo) => {
    photo.style.setProperty("--mag-x", "0px");
    photo.style.setProperty("--mag-y", "0px");
    photo.style.setProperty("--mag-z", "0px");
    photo.style.setProperty("--mag-rx", "0deg");
    photo.style.setProperty("--mag-ry", "0deg");
  });
};

const openCapsulePreview = (photo, index) => {
  const image = photo.querySelector("img");
  const piece = capsulePieces[index] ?? capsulePieces[0];

  lastCapsuleTrigger = photo;
  capsulePreviewImage.src = image.currentSrc || image.src;
  capsulePreviewImage.alt = image.alt;
  capsulePreviewTitle.textContent = piece.title;
  capsulePreviewDescription.textContent = piece.description;
  capsulePreviewOrigin.textContent = piece.origin;
  capsulePreviewMaterial.textContent = piece.material;
  capsulePreviewIntervention.textContent = piece.intervention;
  capsule.classList.add("is-previewing");
  capsulePreview.classList.add("is-open");
  capsulePreview.setAttribute("aria-hidden", "false");
  document.body.classList.add("capsule-modal-open");
  capsuleClose.focus();
};

const closeCapsulePreview = () => {
  capsule.classList.remove("is-previewing");
  capsulePreview.classList.remove("is-open");
  capsulePreview.setAttribute("aria-hidden", "true");
  document.body.classList.remove("capsule-modal-open");
  lastCapsuleTrigger?.focus();
};

if (capsule && capsulePreview) {
  capsulePhotos.forEach((photo, index) => {
    photo.tabIndex = 0;
    photo.setAttribute("role", "button");
    photo.setAttribute("aria-label", `Ver detalle de ${capsulePieces[index]?.title ?? `pieza cápsula ${index + 1}`}`);

    photo.addEventListener("click", () => openCapsulePreview(photo, index));
    photo.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCapsulePreview(photo, index);
    });
  });

  if (!reducedMotion && !touchPointer) {
    capsule.addEventListener("pointermove", (event) => {
      if (capsule.classList.contains("is-previewing")) return;

      const rect = capsule.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      const pointerY = (event.clientY - rect.top) / rect.height - 0.5;

      capsulePhotos.forEach((photo, index) => {
        const depth = 0.35 + (index % 5) * 0.13;
        photo.style.setProperty("--mag-x", `${pointerX * depth * 28}px`);
        photo.style.setProperty("--mag-y", `${pointerY * depth * 22}px`);
        photo.style.setProperty("--mag-z", `${depth * 24}px`);
        photo.style.setProperty("--mag-rx", `${-pointerY * depth * 5}deg`);
        photo.style.setProperty("--mag-ry", `${pointerX * depth * 5}deg`);
      });
    });

    capsule.addEventListener("pointerleave", resetCapsuleDepth);
  }

  capsuleClose.addEventListener("click", closeCapsulePreview);
  capsuleMaterialLink.addEventListener("click", closeCapsulePreview);
  capsulePreview.addEventListener("click", (event) => {
    if (event.target === capsulePreview) closeCapsulePreview();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && capsulePreview.classList.contains("is-open")) {
      closeCapsulePreview();
    }
  });
}

const updateLearningPath = () => {
  if (!learningPath || !learningPathCards.length) return;

  const horizontalLayout = learningPathHorizontalQuery.matches;
  learningPath.classList.toggle("is-scroll-ready", !reducedMotion && !horizontalLayout);

  if (reducedMotion || horizontalLayout) {
    learningPathCards.forEach((card) => {
      card.style.setProperty("--card-y", "0px");
      card.style.setProperty("--card-scale", "1");
      card.style.opacity = "1";
    });
    return;
  }

  const rect = learningPath.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollDistance = Math.max(learningPath.offsetHeight - viewportHeight, 1);
  const sceneProgress = clamp(-rect.top / scrollDistance);

  learningPathCards.forEach((card, index) => {
    const start = 0.05 + index * 0.15;
    const cardProgress = smoothstep((sceneProgress - start) / 0.36);
    const startY = viewportHeight * (1.04 + index * 0.05);
    const currentY = startY * (1 - cardProgress);
    const currentScale = 0.96 + cardProgress * 0.04;

    card.style.setProperty("--card-y", `${currentY}px`);
    card.style.setProperty("--card-scale", currentScale.toFixed(3));
    card.style.opacity = String(clamp(cardProgress * 4));
  });
};

const updateRevealImages = () => {
  const viewportHeight = window.innerHeight;

  revealImages.forEach((image, index) => {
    const rect = image.getBoundingClientRect();
    const start = viewportHeight * 1.08;
    const end = -rect.height * 0.2;
    const progress = clamp((start - rect.top) / (start - end));
    const startY = 240 + index * 34;
    const endY = -130 - index * 24;
    const currentY = startY + (endY - startY) * progress;

    image.style.setProperty("--scroll-y", `${currentY}px`);

    if (progress > 0.08) {
      image.classList.add("is-visible");
    }
  });

  updateRestorationParallax();
  updateLearningPath();
  ticking = false;
};

const requestRevealUpdate = () => {
  if (ticking) return;

  ticking = true;
  window.requestAnimationFrame(updateRevealImages);
};

window.addEventListener("scroll", requestRevealUpdate, { passive: true });
window.addEventListener("resize", requestRevealUpdate);
window.addEventListener("load", requestRevealUpdate);
requestRevealUpdate();

const beforeAfterBlocks = document.querySelectorAll("[data-before-after]");

beforeAfterBlocks.forEach((block) => {
  const range = block.querySelector("[data-before-after-range]");

  const updateSplit = () => {
    const value = Number(range.value);
    block.style.setProperty("--split", `${value}%`);
  };

  range.addEventListener("input", updateSplit);
  updateSplit();
});

const revealTextItems = document.querySelectorAll(".reveal-text");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTextItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealTextObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    }
  );

  revealTextItems.forEach((item) => revealTextObserver.observe(item));
}

const programSection = document.querySelector("[data-program]");

if (programSection) {
  const programTabs = [...programSection.querySelectorAll("[data-program-tab]")];
  const programPanel = programSection.querySelector("#program-stage-panel");
  const programVideo = programSection.querySelector("[data-program-video]");
  const programDescription = programSection.querySelector("[data-program-description]");
  const programPoints = [...programSection.querySelectorAll("[data-program-points] li")];
  const programTechnique = programSection.querySelector("[data-program-technique]");
  const programMobileQuery = window.matchMedia("(max-width: 760px)");
  const programStages = {
    diagnostico: {
      video: "assets/images/paginadetalle/programa/videodiagnostico.mp4",
      description:
        "Leemos la pieza, detectamos daños y definimos el plan de trabajo antes de intervenir.",
      points: [
        "Evaluación estructural",
        "Materiales y uniones",
        "Plan de restauración",
      ],
      technique: "Lectura de la pieza",
    },
    desarme: {
      video: "assets/images/paginadetalle/programa/videodesarme.mp4",
      description:
        "Desarmamos la silla con seguridad y registramos cada unión para preparar una reparación precisa.",
      points: [
        "Desmontaje de piezas",
        "Retiro de herrajes",
        "Registro de componentes",
      ],
      technique: "Desarme seguro",
    },
    reparacion: {
      video: "assets/images/paginadetalle/programa/vedeo reparacion.mp4",
      description:
        "Reparamos uniones, fisuras y piezas dañadas para devolverle estructura, seguridad y estabilidad.",
      points: [
        "Refuerzo de ensambles",
        "Reparación de fisuras",
        "Estabilidad estructural",
      ],
      technique: "Técnicas",
    },
    acabados: {
      video: "assets/images/paginadetalle/programa/videoacabados.mp4",
      description:
        "Preparamos superficies y aplicamos color y protección para lograr una terminación uniforme y duradera.",
      points: [
        "Lijado de superficies",
        "Aplicación de color",
        "Sellado y protección",
      ],
      technique: "Terminaciones",
    },
    renacimiento: {
      video: "assets/images/paginadetalle/programa/videorenacimiento.mp4",
      description:
        "Rearmamos y ajustamos la pieza terminada para que vuelva, renovada, a formar parte de un espacio.",
      points: [
        "Ensamblaje final",
        "Control de estabilidad",
        "Cuidado de la pieza",
      ],
      technique: "Resultado final",
    },
  };

  const selectProgramStage = (stageKey, moveFocus = false) => {
    const stage = programStages[stageKey];
    if (!stage) return;

    programTabs.forEach((tab, index) => {
      const isActive = tab.dataset.programTab === stageKey;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;

      if (!tab.id) tab.id = `program-tab-${index + 1}`;
      if (isActive) {
        programPanel.setAttribute("aria-labelledby", tab.id);
        if (moveFocus) tab.focus({ preventScroll: true });
        if (programMobileQuery.matches) {
          tab.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    });

    programVideo.pause();
    programVideo.setAttribute("src", stage.video);
    programVideo.load();
    const playPromise = programVideo.play();
    if (playPromise) playPromise.catch(() => {});

    programDescription.textContent = stage.description;
    programPoints.forEach((point, index) => {
      point.textContent = stage.points[index];
    });
    programTechnique.textContent = stage.technique;

    programPanel.classList.remove("is-entering");
    void programPanel.offsetWidth;
    programPanel.classList.add("is-entering");
  };

  programTabs.forEach((tab, index) => {
    tab.id = `program-tab-${index + 1}`;
    tab.addEventListener("click", () => selectProgramStage(tab.dataset.programTab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;

      if (event.key === "ArrowRight") nextIndex = (index + 1) % programTabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + programTabs.length) % programTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = programTabs.length - 1;
      if (nextIndex === index) return;

      event.preventDefault();
      selectProgramStage(programTabs[nextIndex].dataset.programTab, true);
    });
  });

  programPanel.setAttribute("aria-labelledby", programTabs[0].id);
  if (programMobileQuery.matches) {
    window.requestAnimationFrame(() => {
      programTabs[0].scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    });
  }
}

const professorCards = document.querySelectorAll("[data-professor]");

if (professorCards.length) {
  const professorList = [...professorCards];
  const professorMobileQuery = window.matchMedia("(max-width: 760px)");

  const setProfessorTeamState = (frameIndex, targetCard = null) => {
    professorList.forEach((card) => {
      const frames = [...card.querySelectorAll(".professor-frame")];
      const safeIndex = ((frameIndex % frames.length) + frames.length) % frames.length;

      frames.forEach((frame, index) => frame.classList.toggle("is-active", index === safeIndex));
      card.classList.toggle("is-target", card === targetCard);
      card.dataset.frame = String(safeIndex);
    });
  };

  const toggleProfessorName = (selectedCard) => {
    const shouldOpen = !selectedCard.classList.contains("is-name-visible");

    professorList.forEach((card) => {
      const isOpen = card === selectedCard && shouldOpen;
      card.classList.toggle("is-name-visible", isOpen);
      card.setAttribute("aria-pressed", String(isOpen));
    });
  };

  professorList.forEach((card, cardIndex) => {
    card.addEventListener("pointerenter", () => {
      if (!professorMobileQuery.matches) setProfessorTeamState(cardIndex, card);
    });
    card.addEventListener("pointerleave", () => {
      if (!professorMobileQuery.matches && !card.matches(":focus")) setProfessorTeamState(0);
    });
    card.addEventListener("focus", () => {
      if (!professorMobileQuery.matches) setProfessorTeamState(cardIndex, card);
    });
    card.addEventListener("blur", () => {
      if (!professorMobileQuery.matches && !card.matches(":hover")) setProfessorTeamState(0);
    });
    card.addEventListener("click", () => {
      if (!professorMobileQuery.matches && touchPointer) setProfessorTeamState(cardIndex, card);
      toggleProfessorName(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!professorMobileQuery.matches) setProfessorTeamState(cardIndex, card);
      toggleProfessorName(card);
    });
  });

  setProfessorTeamState(0);
}

const testimonialsSection = document.querySelector("[data-testimonials]");

if (testimonialsSection) {
  const carousel = testimonialsSection.querySelector("[data-testimonials-carousel]");
  const track = testimonialsSection.querySelector("[data-testimonials-track]");
  const cards = [...track.querySelectorAll(".testimonial-card")];
  const pagination = testimonialsSection.querySelector("[data-testimonials-pagination]");
  const status = testimonialsSection.querySelector("[data-testimonials-status]");
  let currentPage = 0;
  let pageCount = 1;
  let itemsPerPage = 4;
  let autoPlayTimer = null;
  let pointerStartX = null;
  let pointerStartY = null;
  let isSectionVisible = false;
  let resizeFrame = null;

  const getVisibleCards = () => cards.filter((card) => getComputedStyle(card).display !== "none");

  const getItemsPerPage = () => {
    if (window.matchMedia("(max-width: 760px)").matches) return 1;
    if (window.matchMedia("(max-width: 1050px)").matches) return 2;
    return 4;
  };

  const stopAutoPlay = () => {
    window.clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  };

  const startAutoPlay = () => {
    stopAutoPlay();
    if (reducedMotion || !isSectionVisible || document.hidden || pageCount < 2) return;

    autoPlayTimer = window.setInterval(() => {
      showTestimonialsPage(currentPage + 1, false);
    }, 6000);
  };

  const buildPagination = () => {
    pagination.replaceChildren();

    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement("button");
      dot.className = "testimonials-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Mostrar opiniones ${index + 1} de ${pageCount}`);
      dot.addEventListener("click", () => {
        showTestimonialsPage(index);
        startAutoPlay();
      });
      pagination.appendChild(dot);
    }
  };

  const showTestimonialsPage = (requestedPage, announce = true) => {
    const visibleCards = getVisibleCards();
    if (!visibleCards.length) return;

    currentPage = ((requestedPage % pageCount) + pageCount) % pageCount;
    const firstCardIndex = currentPage * itemsPerPage;
    const targetCard = visibleCards[firstCardIndex];
    const offset = targetCard.offsetLeft - visibleCards[0].offsetLeft;

    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    cards.forEach((card) => card.setAttribute("aria-hidden", "true"));
    visibleCards.forEach((card, index) => {
      const isOnPage = index >= firstCardIndex && index < firstCardIndex + itemsPerPage;
      card.setAttribute("aria-hidden", String(!isOnPage));
    });

    [...pagination.children].forEach((dot, index) => {
      const isActive = index === currentPage;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (announce) status.textContent = `Grupo ${currentPage + 1} de ${pageCount}`;
  };

  const configureTestimonials = () => {
    const visibleCards = getVisibleCards();
    itemsPerPage = getItemsPerPage();
    pageCount = Math.max(1, Math.ceil(visibleCards.length / itemsPerPage));
    currentPage = Math.min(currentPage, pageCount - 1);

    visibleCards.forEach((card, index) => {
      card.setAttribute("aria-label", `Opinión ${index + 1} de ${visibleCards.length}`);
    });
    cards.filter((card) => !visibleCards.includes(card)).forEach((card) => {
      card.removeAttribute("aria-label");
      card.setAttribute("aria-hidden", "true");
    });

    buildPagination();
    showTestimonialsPage(currentPage, false);
    startAutoPlay();
  };

  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showTestimonialsPage(currentPage + (event.key === "ArrowRight" ? 1 : -1));
    startAutoPlay();
  });

  carousel.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    stopAutoPlay();
  });

  carousel.addEventListener("pointerup", (event) => {
    if (pointerStartX === null || pointerStartY === null) return;
    const distanceX = event.clientX - pointerStartX;
    const distanceY = event.clientY - pointerStartY;

    if (Math.abs(distanceX) > 45 && Math.abs(distanceX) > Math.abs(distanceY)) {
      showTestimonialsPage(currentPage + (distanceX < 0 ? 1 : -1));
    }

    pointerStartX = null;
    pointerStartY = null;
    startAutoPlay();
  });

  carousel.addEventListener("pointercancel", () => {
    pointerStartX = null;
    pointerStartY = null;
    startAutoPlay();
  });

  testimonialsSection.addEventListener("mouseenter", stopAutoPlay);
  testimonialsSection.addEventListener("mouseleave", startAutoPlay);
  testimonialsSection.addEventListener("focusin", stopAutoPlay);
  testimonialsSection.addEventListener("focusout", (event) => {
    if (!testimonialsSection.contains(event.relatedTarget)) startAutoPlay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoPlay();
    else startAutoPlay();
  });

  if ("IntersectionObserver" in window) {
    const testimonialsObserver = new IntersectionObserver(
      ([entry]) => {
        isSectionVisible = entry.isIntersecting;
        if (isSectionVisible) startAutoPlay();
        else stopAutoPlay();
      },
      { threshold: 0.15 }
    );
    testimonialsObserver.observe(testimonialsSection);
  } else {
    isSectionVisible = true;
  }

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(configureTestimonials);
  });

  configureTestimonials();
}

const faqSection = document.querySelector("[data-faq]");

if (faqSection) {
  const faqItems = [...faqSection.querySelectorAll(".faq-item")];
  const faqQuestions = [...faqSection.querySelectorAll("[data-faq-question]")];
  const closeTimers = new WeakMap();

  const closeFaqItem = (item) => {
    const question = item.querySelector("[data-faq-question]");
    const answer = item.querySelector(".faq-answer");

    window.clearTimeout(closeTimers.get(item));
    item.classList.remove("is-open");
    question.setAttribute("aria-expanded", "false");

    if (reducedMotion) {
      answer.hidden = true;
      return;
    }

    const timer = window.setTimeout(() => {
      if (!item.classList.contains("is-open")) answer.hidden = true;
    }, 360);
    closeTimers.set(item, timer);
  };

  const openFaqItem = (item) => {
    const question = item.querySelector("[data-faq-question]");
    const answer = item.querySelector(".faq-answer");

    faqItems.forEach((otherItem) => {
      if (otherItem !== item && otherItem.classList.contains("is-open")) {
        closeFaqItem(otherItem);
      }
    });

    window.clearTimeout(closeTimers.get(item));
    answer.hidden = false;
    question.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => item.classList.add("is-open"));
  };

  faqQuestions.forEach((question, index) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      if (item.classList.contains("is-open")) closeFaqItem(item);
      else openFaqItem(item);
    });

    question.addEventListener("keydown", (event) => {
      let targetIndex = index;
      if (event.key === "ArrowDown") targetIndex = (index + 1) % faqQuestions.length;
      if (event.key === "ArrowUp") targetIndex = (index - 1 + faqQuestions.length) % faqQuestions.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = faqQuestions.length - 1;
      if (targetIndex === index) return;

      event.preventDefault();
      faqQuestions[targetIndex].focus();
    });
  });
}
