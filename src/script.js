import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

// ─── Lenis ───────────────────────────────────────────────────────────────────
const lenis = new Lenis({ smoothWheel: true, syncTouch: false });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

ScrollTrigger.scrollerProxy(document.documentElement, {
  scrollTop(value) {
    if (arguments.length) lenis.scrollTo(value, { immediate: true });
    return lenis.scroll;
  },
  getBoundingClientRect() {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  },
  pinType: document.documentElement.style.transform ? "transform" : "fixed",
});

// ─── Event Data ──────────────────────────────────────────────────────────────
const EVENTS = [
  { num: "01", name: "Back2Dock",          artist: "Various Artists",  date: "14.03.26", city: "flensburg" },
  { num: "02", name: "Jerome",             artist: "Jerome",           date: "21.03.26", city: "hamburg"   },
  { num: "03", name: "Sixteen Beats",      artist: "DJ Collective",    date: "28.03.26", city: "flensburg" },
  { num: "04", name: "Strictly Oldschool", artist: "Various DJs",      date: "04.04.26", city: "kiel"      },
  { num: "05", name: "Kuult",              artist: "Kuult",            date: "11.04.26", city: "flensburg" },
  { num: "06", name: "Live @ Dock50",      artist: "TBA",              date: "18.04.26", city: "hamburg"   },
  { num: "07", name: "Live @ Dock50",      artist: "TBA",              date: "25.04.26", city: "kiel"      },
  { num: "08", name: "Live @ Dock50",      artist: "TBA",              date: "02.05.26", city: "flensburg" },
  { num: "09", name: "Live @ Dock50",      artist: "TBA",              date: "09.05.26", city: "hamburg"   },
  { num: "10", name: "Live @ Dock50",      artist: "TBA",              date: "16.05.26", city: "kiel"      },
];

// ─── Detail-Panel Refs ────────────────────────────────────────────────────────
const spotDetailOuter = document.getElementById("spotDetailOuter");
const spotDetail      = document.getElementById("spotDetail");
const sdOverlay       = spotDetailOuter?.querySelector(".sd-overlay");
const sdImgWrap       = spotDetail?.querySelector(".sd-img-wrap");
const sdNum           = spotDetail?.querySelector(".sd-num");
const sdName          = spotDetail?.querySelector(".sd-name");
const sdArtist        = spotDetail?.querySelector(".sd-artist");
const sdDate          = spotDetail?.querySelector(".sd-date");
const sdImg           = spotDetail?.querySelector(".sd-img-wrap img");
const sdClose         = spotDetail?.querySelector(".sd-close");
const sdCtaArrow      = spotDetail?.querySelector(".sd-cta-arrow");
const sdCta           = spotDetail?.querySelector(".sd-cta");
const snapHint        = document.getElementById("snapClickHint");
const spotFilter      = document.getElementById("spotFilter");

// ─── Module-scope state (accessible from both openDetail and closeDetail) ─────
let detailOpen       = false;
let detailIndex      = -1;
let projectImgs      = null;
let flyEl            = null;
let imgPanelRect     = null;
let activeFilterCity  = null;   // null = show all
let moveDistImages    = 0;      // shared between spotlight onUpdate and filter handler
let spImagesContainer = null;   // ref to .project-images, set during spotlight init

// Snap state at module scope so closeDetail can reset them safely
let spotSnapTimer  = null;
let spotIsSnapping = false;
let navScrolling   = false;  // true while a navbar-initiated scroll is in flight
let spST           = null;   // spotlight ScrollTrigger instance

// ─── Snap hint helpers ────────────────────────────────────────────────────────
function showSnapHint() {
  if (!snapHint) return;
  gsap.to(snapHint, { opacity: 1, duration: 0.35, ease: "power2.out" });
}
function hideSnapHint() {
  if (!snapHint) return;
  gsap.to(snapHint, { opacity: 0, duration: 0.2, ease: "power2.in" });
}

// ─── Open Detail ─────────────────────────────────────────────────────────────
function openDetail(i) {
  if (detailOpen || !spotDetailOuter || !spotDetail || !projectImgs) return;
  detailOpen  = true;
  detailIndex = i;
  lenis.stop();
  hideSnapHint();

  const ev = EVENTS[i];
  if (sdNum)    sdNum.textContent    = ev.num;
  if (sdName)   sdName.textContent   = ev.name;
  if (sdArtist) sdArtist.textContent = ev.artist;
  if (sdDate)   sdDate.textContent   = ev.date;

  const activeImgEl = projectImgs[i];
  const srcImg = activeImgEl?.querySelector("img");

  if (sdImg && srcImg) sdImg.src = srcImg.src;
  if (sdImg) gsap.set(sdImg, { opacity: 0 });

  // Show panel at scale:1 briefly to measure target rect
  gsap.set(spotDetailOuter, { display: "flex", pointerEvents: "auto" });
  gsap.set(sdOverlay,  { opacity: 0 });
  gsap.set(spotDetail, { scale: 1, opacity: 0 });

  imgPanelRect = sdImgWrap ? sdImgWrap.getBoundingClientRect() : null;
  gsap.set(spotDetail, { scale: 0 }); // reset to start

  const srcRect = srcImg ? srcImg.getBoundingClientRect() : null;
  if (srcImg) gsap.set(srcImg, { opacity: 0 });

  if (flyEl) { flyEl.remove(); flyEl = null; }

  if (srcRect && imgPanelRect) {
    flyEl = document.createElement("div");
    Object.assign(flyEl.style, {
      position: "fixed", top: "0px", left: "0px",
      width: srcRect.width + "px", height: srcRect.height + "px",
      zIndex: "9999", pointerEvents: "none", overflow: "hidden",
    });
    gsap.set(flyEl, { x: srcRect.left, y: srcRect.top });
    const cloneImg = document.createElement("img");
    cloneImg.src = srcImg.src;
    Object.assign(cloneImg.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
    flyEl.appendChild(cloneImg);
    document.body.appendChild(flyEl);
  }

  const DUR = 0.52, EASE = "power3.inOut";
  gsap.to(spotDetail, { scale: 1, opacity: 1, duration: DUR, ease: EASE });
  gsap.to(sdOverlay,  { opacity: 1, duration: DUR * 0.65, ease: "power2.out" });

  if (flyEl && imgPanelRect) {
    gsap.to(flyEl, {
      x: imgPanelRect.left, y: imgPanelRect.top,
      width: imgPanelRect.width, height: imgPanelRect.height,
      duration: DUR, ease: EASE,
      onComplete: () => {
        if (sdImg) gsap.set(sdImg, { opacity: 1 });
        flyEl?.remove(); flyEl = null;
      },
    });
  }
}

// ─── Close Detail ─────────────────────────────────────────────────────────────
function closeDetail() {
  if (!detailOpen || !spotDetailOuter) return;

  const activeImgEl = projectImgs?.[detailIndex];
  const srcImg      = activeImgEl?.querySelector("img");
  const panelImgRect = sdImgWrap ? sdImgWrap.getBoundingClientRect() : null;
  const tgtRect      = srcImg ? srcImg.getBoundingClientRect() : null;

  let closeFlyEl = null;
  if (panelImgRect && tgtRect && sdImg) {
    closeFlyEl = document.createElement("div");
    Object.assign(closeFlyEl.style, {
      position: "fixed", top: "0px", left: "0px",
      width: panelImgRect.width + "px", height: panelImgRect.height + "px",
      zIndex: "9999", pointerEvents: "none", overflow: "hidden",
    });
    gsap.set(closeFlyEl, { x: panelImgRect.left, y: panelImgRect.top });
    const cloneImg = document.createElement("img");
    cloneImg.src = sdImg.src;
    Object.assign(cloneImg.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
    closeFlyEl.appendChild(cloneImg);
    document.body.appendChild(closeFlyEl);
    if (sdImg) gsap.set(sdImg, { opacity: 0 });
  }

  const DUR = 0.45, EASE = "power3.inOut";
  gsap.to(spotDetail, { scale: 0, opacity: 0, duration: DUR, ease: EASE });
  gsap.to(sdOverlay, {
    opacity: 0, duration: DUR, ease: "power2.in",
    onComplete: () => {
      gsap.set(spotDetailOuter, { display: "none", pointerEvents: "none" });
      gsap.set(spotDetail, { scale: 1, opacity: 1 });
      if (sdImg) gsap.set(sdImg, { opacity: 1 });
      detailOpen  = false;
      detailIndex = -1;
      // Reset snap state — keep snapping suppressed briefly after lenis.start()
      // so the scroll event lenis emits on resume doesn't trigger a spurious snap
      clearTimeout(spotSnapTimer);
      spotIsSnapping = true;
      lenis.start();
      setTimeout(() => { spotIsSnapping = false; }, 350);
    },
  });

  if (closeFlyEl && tgtRect) {
    gsap.to(closeFlyEl, {
      x: tgtRect.left, y: tgtRect.top,
      width: tgtRect.width, height: tgtRect.height,
      duration: DUR, ease: EASE,
      onComplete: () => {
        if (srcImg) gsap.set(srcImg, { opacity: 1 });
        closeFlyEl.remove();
      },
    });
  } else if (srcImg) {
    setTimeout(() => gsap.set(srcImg, { opacity: 1 }), DUR * 1000 + 50);
  }
}

// ─── Close triggers ───────────────────────────────────────────────────────────
document.addEventListener("keydown",    (e) => { if (e.key === "Escape" && detailOpen) closeDetail(); });
document.addEventListener("wheel",      ()  => { if (detailOpen) closeDetail(); }, { passive: true });
document.addEventListener("touchstart", (e) => {
  if (detailOpen && !spotDetail?.contains(e.target)) closeDetail();
}, { passive: true });
if (sdClose)   sdClose.addEventListener("click", closeDetail);
if (sdOverlay) sdOverlay.addEventListener("click", closeDetail); // click outside panel

// ─── CTA arrow animation ──────────────────────────────────────────────────────
if (sdCta && sdCtaArrow) {
  const animateArrow = () => {
    gsap.killTweensOf(sdCtaArrow);
    gsap.to(sdCtaArrow, {
      x: 36, opacity: 0, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        gsap.fromTo(sdCtaArrow,
          { x: -36, opacity: 0 },
          { x: 0,   opacity: 1, duration: 0.22, ease: "power2.out" }
        );
      },
    });
  };
  sdCta.addEventListener("mouseenter", animateArrow);
  sdCta.addEventListener("mouseleave", animateArrow);
}

// ─── window.load ─────────────────────────────────────────────────────────────
window.addEventListener("load", () => {

  // ─── SplitText ─────────────────────────────────────────────────────────
  const headlineEl = document.querySelector(".headline");
  if (headlineEl) {
    const split = new SplitText(headlineEl, { type: "chars", charsClass: "char" });
    gsap.set(".char", { transformOrigin: "50% 60%" });
    split.chars.forEach((char, i) => {
      char.addEventListener("mouseenter", () => {
        gsap.to(char, { scale: 1.1, duration: 0.25, ease: "power2.out" });
        if (split.chars[i - 1]) gsap.to(split.chars[i - 1], { scale: 1.05, duration: 0.25, ease: "power2.out" });
        if (split.chars[i + 1]) gsap.to(split.chars[i + 1], { scale: 1.05, duration: 0.25, ease: "power2.out" });
      });
      char.addEventListener("mouseleave", () => {
        gsap.to(split.chars, { scale: 1, duration: 0.25, ease: "power2.out" });
      });
    });
  }

  // ─── Hero Badge ────────────────────────────────────────────────────────
  const heroBadgeRing = document.querySelector(".hero-badge-ring");
  if (heroBadgeRing) gsap.to(heroBadgeRing, { rotation: 360, duration: 20, ease: "none", repeat: -1 });

  document.querySelectorAll(".badge-ring").forEach(ring => {
    gsap.to(ring, { rotation: 360, duration: 20, ease: "none", repeat: -1 });
  });

  const heroBadge = document.querySelector(".hero-badge");
  if (heroBadge) {
    heroBadge.addEventListener("click", () => {
      const locationEl = document.getElementById("location");
      if (locationEl) {
        navScrolling = true;
        lenis.scrollTo(locationEl, {
          duration: 1.4,
          easing: (t) => 1 - Math.pow(1 - t, 4),
          onComplete: () => { navScrolling = false; },
        });
      }
    });
  }

  // ─── Hero Scroll-Line ──────────────────────────────────────────────────
  const scrollLineInner = document.querySelector(".hero-scroll-line-inner");
  const introEl         = document.querySelector(".intro");
  if (scrollLineInner && introEl) {
    gsap.to(scrollLineInner, {
      scaleY: 0, transformOrigin: "top center",
      scrollTrigger: { trigger: introEl, start: "top top", end: "bottom top", scrub: true },
    });
  }

  // ─── Page Counter — Track-Animation ────────────────────────────────────
  const sections   = [
    { id: "intro",     index: 0 },
    { id: "spotlight", index: 1 },
    { id: "location",  index: 2 },
    { id: "contact",   index: 3 },
    { id: "footer",    index: 4 },
  ];
  const labelItems   = document.querySelectorAll(".page-label-item");
  const pageLabel    = document.getElementById("pageLabel");
  let currentSection = 0;

  if (labelItems.length) {
    function switchLabel(newIndex) {
      if (newIndex === currentSection) return;
      const prevIndex = currentSection;
      currentSection  = newIndex;

      const prevItem = labelItems[prevIndex];
      const nextItem = labelItems[newIndex];

      // Show/hide filter based on whether we're in spotlight (index 1)
      if (spotFilter) {
        if (newIndex === 1) {
          gsap.set(spotFilter, { pointerEvents: "auto" });
          gsap.to(spotFilter, { opacity: 1, duration: 0.4, ease: "power2.out" });
        } else {
          gsap.to(spotFilter, { opacity: 0, duration: 0.25, ease: "power2.in",
            onComplete() { gsap.set(spotFilter, { pointerEvents: "none" }); } });
        }
      }

      gsap.set(nextItem, { display: "flex", y: "100%", opacity: 1 });
      gsap.to(prevItem, {
        y: "-100%", opacity: 0, duration: 0.42, ease: "power3.in",
        onComplete: () => gsap.set(prevItem, { display: "none", y: 0 }),
      });
      gsap.to(nextItem, { y: 0, duration: 0.42, ease: "power3.out" });
    }

    gsap.set(labelItems,    { display: "none", opacity: 0, y: 0 });
    gsap.set(labelItems[0], { display: "flex", opacity: 1, y: 0 });

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sec = sections.find(s => s.id === entry.target.id);
          if (sec) switchLabel(sec.index);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) sectionObserver.observe(el);
    });
  }

  // ─── Desktop nav: progress fill + active state ──────────────────────────
  {
    const navEntries = [
      { sectionId: "intro",     linkIdx: 0 },
      { sectionId: "spotlight", linkIdx: 1 },
      { sectionId: "location",  linkIdx: 2 },
      { sectionId: "contact",   linkIdx: 3 },
    ];
    const allNavLinks = document.querySelectorAll("#siteHeader .site-nav-link");

    // build lookup: link element → its .sn-bar-fill child
    const fills = Array.from(allNavLinks).map(l => l.querySelector(".sn-bar-fill"));

    function tickNavProgress() {
      const sy = lenis.scroll;

      navEntries.forEach(({ sectionId, linkIdx }, i) => {
        const section = document.getElementById(sectionId);
        const nextId  = navEntries[i + 1]?.sectionId ?? null;
        const nextSec = nextId ? document.getElementById(nextId) : null;
        if (!section) return;

        const top     = section.offsetTop;
        const nextTop = nextSec ? nextSec.offsetTop : document.body.scrollHeight;
        const range   = nextTop - top;

        let pct;
        if (sy < top) {
          pct = 0;                                               // not yet reached
        } else if (sy >= nextTop) {
          pct = 100;                                             // already passed
        } else {
          pct = Math.min(100, Math.max(0, (sy - top) / range * 100)); // in progress
        }

        if (fills[linkIdx]) fills[linkIdx].style.width = pct + "%";
        allNavLinks[linkIdx]?.classList.toggle("sn-active", sy >= top && sy < nextTop);
      });
    }

    // initialise on load
    allNavLinks[0]?.classList.add("sn-active");

    lenis.on("scroll", tickNavProgress);
  }

  // ─── Desktop nav: smooth scroll ─────────────────────────────────────────
  document.querySelectorAll("#siteHeader a[href^='#']").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const href   = link.getAttribute("href");
      const target = document.querySelector(href);
      if (target) {
        navScrolling = true;
        // For the pinned spotlight section use spST.start directly — element-based
        // scrollTo gives wrong results when navigating from below the pin range.
        const dest = (href === "#spotlight" && spST) ? spST.start : target;
        lenis.scrollTo(dest, {
          duration: 1.2,
          easing: t => 1 - Math.pow(1 - t, 4),
          onComplete: () => { navScrolling = false; },
        });
      }
    });
  });

  // ─── Spotlight ─────────────────────────────────────────────────────────
  const spotlightSection = document.querySelector(".spotlight");

  if (spotlightSection) {
    const projectIndex           = spotlightSection.querySelector(".project-index h2");
    projectImgs                  = spotlightSection.querySelectorAll(".project-img");
    const projectImagesContainer = spotlightSection.querySelector(".project-images");
    const projectNameItems       = spotlightSection.querySelectorAll(".project-name-item");
    const connector              = spotlightSection.querySelector(".project-connector");
    const totalProjectCount      = projectNameItems.length;

    if (!projectIndex || !projectImagesContainer || totalProjectCount === 0) {
      console.warn("Spotlight: Pflicht-Elemente fehlen");
    } else {

      const VH  = window.innerHeight;
      const mid = VH / 2;

      spImagesContainer = projectImagesContainer;
      const imgsH  = projectImagesContainer.offsetHeight;
      moveDistImages = VH - imgsH;

      const firstImg     = projectImgs[0];
      const firstDivider = spotlightSection.querySelector(".project-divider");
      const imgH         = firstImg     ? firstImg.offsetHeight     : VH * 0.197;
      const divH         = firstDivider ? firstDivider.offsetHeight : VH * 0.10;
      const halfSpan     = (imgH + 2 * divH) / 2;
      const ITEM_GAP     = Math.max(VH * 0.025, imgH * 0.18);

      const SLOTS = {
        TOP_1:  mid - halfSpan - ITEM_GAP,
        TOP_2:  mid - halfSpan,
        CENTER: mid,
        BOT_1:  mid + halfSpan,
        BOT_2:  mid + halfSpan + ITEM_GAP,
        EXIT:   -100,
        PARK:   VH + 100,
      };

      const SLOT_OPACITY = {
        TOP_1: 0.32, TOP_2: 0.45, CENTER: 1,
        BOT_1: 0.45, BOT_2: 0.32, EXIT: 0, PARK: 0,
      };
      const SLOT_COLOR = {
        TOP_1:  "rgba(255,255,255,0.32)", TOP_2:  "rgba(255,255,255,0.45)",
        CENTER: "rgba(255,255,255,0.95)",
        BOT_1:  "rgba(255,255,255,0.45)", BOT_2:  "rgba(255,255,255,0.32)",
        EXIT:   "rgba(255,255,255,0)",    PARK:   "rgba(255,255,255,0)",
      };

      function getSlot(i, N) {
        const d = i - N;
        if (d === -2) return "TOP_1";
        if (d === -1) return "TOP_2";
        if (d ===  0) return "CENTER";
        if (d === +1) return "BOT_1";
        if (d === +2) return "BOT_2";
        if (d  <  -2) return "EXIT";
        return "PARK";
      }

      gsap.set(projectNameItems, { top: SLOTS.PARK, opacity: 0, yPercent: -50 });
      gsap.set(projectIndex,     { opacity: 0 });
      if (connector) gsap.set(connector, { display: "none", opacity: 0 });

      // ─── Divider-Titel ───────────────────────────────────────────────────
      const projectTitles = Array.from(projectNameItems).map(item => {
        const p = item.querySelector("p");
        return p ? p.textContent.trim() : "";
      });

      const projectDividers = spotlightSection.querySelectorAll(".project-divider");
      const dividerTitleEls = [];

      projectDividers.forEach((div, di) => {
        const wrapper = document.createElement("div");
        wrapper.className = "divider-title-wrapper";
        const titleEl = document.createElement("span");
        titleEl.className = "divider-title-text";
        titleEl.textContent = projectTitles[di] || "";
        wrapper.appendChild(titleEl);
        const numSpan = div.querySelector(".project-divider-num");
        div.insertBefore(wrapper, numSpan ? numSpan.nextSibling : null);
        dividerTitleEls.push(titleEl);
        gsap.set(titleEl, { clipPath: "inset(0 0 100% 0)", opacity: 0 });
      });

      let lastDividerN = -99;

      function updateDividerTitles(N, scrollDir) {
        if (N === lastDividerN) return;
        const prevN  = lastDividerN;
        lastDividerN = N;

        dividerTitleEls.forEach((titleEl, di) => {
          const isActive  = (di === N);
          const wasActive = (di === prevN);

          if (isActive && !wasActive) {
            gsap.killTweensOf(titleEl);
            gsap.fromTo(titleEl,
              { clipPath: scrollDir > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0% 0)", opacity: 0, y: scrollDir > 0 ? 6 : -6 },
              { clipPath: "inset(0 0 0% 0)", opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
            );
          } else if (!isActive && wasActive) {
            gsap.killTweensOf(titleEl);
            gsap.to(titleEl, {
              clipPath: scrollDir > 0 ? "inset(100% 0 0% 0)" : "inset(0 0 100% 0)",
              opacity: 0, y: scrollDir > 0 ? -6 : 6,
              duration: 0.25, ease: "power2.in",
            });
          }
        });
      }

      let lastValidN   = 0;
      let lastDisplayN = -99;

      function applySlots(N) {
        const displayN = (N >= 0 && N < totalProjectCount) ? N : lastValidN;
        if (N >= 0 && N < totalProjectCount) lastValidN = N;
        const changed  = (displayN !== lastDisplayN);
        lastDisplayN   = displayN;

        projectNameItems.forEach((item, i) => {
          const slot     = getSlot(i, displayN);
          const dest     = SLOTS[slot];
          const alpha    = SLOT_OPACITY[slot];
          const color    = SLOT_COLOR[slot];
          const numColor = slot === "CENTER" ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.15)";

          gsap.killTweensOf(item);
          if (changed) {
            gsap.to(item, { top: dest, opacity: alpha, yPercent: -50, duration: 0.22, ease: "power4.inOut" });
          } else {
            gsap.set(item, { top: dest, opacity: alpha, yPercent: -50 });
          }

          const textEl = item.querySelector("p");
          const numEl  = item.querySelector(".proj-num");
          if (textEl) {
            gsap.killTweensOf(textEl);
            if (changed) gsap.to(textEl, { color, duration: 0.22, ease: "power4.inOut" });
            else         gsap.set(textEl, { color });
          }
          if (numEl) {
            gsap.killTweensOf(numEl);
            if (changed) gsap.to(numEl, { color: numColor, duration: 0.22, ease: "power4.inOut" });
            else         gsap.set(numEl, { color: numColor });
          }
        });
      }

      // ─── ScrollTrigger ───────────────────────────────────────────────────
      spST = ScrollTrigger.create({
        trigger: spotlightSection,
        start: "top top",
        end: `+=${VH * 5}px`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          if (detailOpen) return;

          const progress  = self.progress;
          const scrollDir = self.direction;

          gsap.set(projectImagesContainer, { y: progress * moveDistImages });

          const dateOpacity = Math.min(1, progress / 0.04) * Math.min(1, (1 - progress) / 0.02);
          gsap.set(projectIndex, { opacity: dateOpacity });

          let N = 0;
          for (let i = totalProjectCount - 1; i >= 0; i--) {
            const r = projectImgs[i].getBoundingClientRect();
            const city = projectImgs[i].dataset.city;
            const filtered = activeFilterCity && city !== activeFilterCity;
            if (!filtered && r.top <= mid) { N = i; break; }
          }

          projectImgs.forEach((img) => {
            const r = img.getBoundingClientRect();
            const city = img.dataset.city;
            const filtered = activeFilterCity && city !== activeFilterCity;
            if (filtered) {
              gsap.set(img, { pointerEvents: "none" });
            } else {
              gsap.set(img, { opacity: (r.top <= mid && r.bottom >= mid) ? 1 : 0.35, pointerEvents: "auto" });
            }
          });

          applySlots(N);
          const stableN = (N >= 0 && N < totalProjectCount) ? N : lastValidN;
          projectIndex.textContent = `${String(stableN + 1).padStart(2, "0")}.01.26`;
          updateDividerTitles(N, scrollDir);

          if (connector) {
            const activeImg = Array.from(projectImgs).find(img => {
              const r = img.getBoundingClientRect();
              return r.top <= mid && r.bottom >= mid;
            });
            const cItem = projectNameItems[Math.max(0, Math.min(N, totalProjectCount - 1))];

            if (activeImg && cItem && N >= 0 && N < totalProjectCount) {
              const imgR  = activeImg.getBoundingClientRect();
              const itemR = cItem.getBoundingClientRect();
              const lineX = imgR.right + 10;
              const lineW = Math.max(0, itemR.left - lineX - 10);
              gsap.set(connector, {
                display: "flex", left: lineX, top: SLOTS.CENTER,
                width: lineW, opacity: dateOpacity > 0.15 ? 0.5 : 0,
              });
            } else {
              gsap.set(connector, { opacity: 0 });
            }
          }
        },
      });

      ScrollTrigger.refresh();

      // ─── Click on any image → snap if needed, then open detail ─────────
      projectImgs.forEach((imgEl, i) => {
        imgEl.style.cursor = "pointer";
        imgEl.addEventListener("click", () => {
          if (detailOpen || spotIsSnapping) return;
          const r = imgEl.getBoundingClientRect();
          const imgCenter = r.top + r.height / 2;
          const dist = Math.abs(imgCenter - mid);

          if (dist < imgH * 0.45) {
            // Already centered — open immediately
            openDetail(i);
          } else {
            // Off-center — snap to it, then open detail
            const screenDelta  = imgCenter - mid;
            const scrollAdjust = -screenDelta * (VH * 5) / moveDistImages;
            spotIsSnapping = true;
            const snapFailsafe = setTimeout(() => { spotIsSnapping = false; }, 1000);
            lenis.scrollTo(lenis.scroll + scrollAdjust, {
              duration: 0.52,
              easing: t => 1 - Math.pow(1 - t, 4),
              onComplete: () => {
                clearTimeout(snapFailsafe);
                spotIsSnapping = false;
                openDetail(i);
              },
            });
          }
        });
      });

      // ─── Spotlight Snap ──────────────────────────────────────────────────
      lenis.on("scroll", () => {
        hideSnapHint();

        if (!spST || spST.progress <= 0.005 || spST.progress >= 0.998) return;
        if (spotIsSnapping || detailOpen || navScrolling) return;

        clearTimeout(spotSnapTimer);
        spotSnapTimer = setTimeout(() => {
          if (detailOpen) return;
          if (!spST || spST.progress <= 0.005 || spST.progress >= 0.998) return;

          let bestI = 0, bestDist = Infinity;
          projectImgs.forEach((img, i) => {
            if (activeFilterCity && img.dataset.city !== activeFilterCity) return;
            const r      = img.getBoundingClientRect();
            const center = r.top + r.height / 2;
            const dist   = Math.abs(center - mid);
            if (dist < bestDist) { bestDist = dist; bestI = i; }
          });

          const r             = projectImgs[bestI].getBoundingClientRect();
          const currentCenter = r.top + r.height / 2;
          const screenDelta   = currentCenter - mid;

          if (Math.abs(screenDelta) < 3) {
            showSnapHint();
            return;
          }

          spotIsSnapping = true;

          // Failsafe: reset spotIsSnapping after max duration + buffer
          const snapFailsafe = setTimeout(() => { spotIsSnapping = false; }, 1000);

          const scrollAdjust = -screenDelta * (VH * 5) / moveDistImages;
          lenis.scrollTo(lenis.scroll + scrollAdjust, {
            duration: 0.62,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            onComplete: () => {
              clearTimeout(snapFailsafe);
              spotIsSnapping = false;
              showSnapHint();
            },
          });
        }, 90);
      });
    }
  }

  // ─── Spotlight Filter ────────────────────────────────────────────────────
  {
    const filterBtns = document.querySelectorAll(".sf-btn");

    // Visually regroup visible items via y-translation so container height
    // (and therefore scroll speed) never changes.
    function applyFilterOffsets() {
      if (!projectImgs) return;
      let cumY = 0;
      projectImgs.forEach(img => {
        const divider    = img.nextElementSibling?.classList.contains("project-divider")
          ? img.nextElementSibling : null;
        const isFiltered = activeFilterCity && img.dataset.city !== activeFilterCity;
        // offsetHeight ignores transforms → always the natural DOM height
        const imgH = img.offsetHeight;
        const divH = divider ? divider.offsetHeight : 0;

        if (isFiltered) {
          // Slide behind previously-visible items and fade out
          gsap.to(img,    { y: -cumY, opacity: 0, pointerEvents: "none", duration: 0.45, ease: "power2.inOut" });
          if (divider) gsap.to(divider, { y: -cumY, opacity: 0, duration: 0.45, ease: "power2.inOut" });
          cumY += imgH + divH;
        } else {
          // Close the gap left by filtered items above
          gsap.to(img,    { y: -cumY, pointerEvents: "auto", duration: 0.45, ease: "power2.inOut" });
          if (divider) gsap.to(divider, { y: -cumY, duration: 0.45, ease: "power2.inOut" });
          // Opacity is intentionally left to onUpdate (active/inactive logic)
        }
      });
    }

    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const rawCity = btn.dataset.city;
        const city    = rawCity === "all" ? null : rawCity;

        activeFilterCity = (city === null || activeFilterCity === city) ? null : city;

        filterBtns.forEach(b => {
          const bCity = b.dataset.city === "all" ? null : b.dataset.city;
          b.classList.toggle("sf-active", bCity === activeFilterCity);
        });

        applyFilterOffsets();

        document.querySelectorAll(".project-name-item").forEach(item => {
          const hide = activeFilterCity && item.dataset.city !== activeFilterCity;
          gsap.to(item, { opacity: hide ? 0 : 1, duration: 0.3, ease: "power2.inOut" });
        });

        if (spST) spST.update();
      });
    });
  }

  // ─── Location Floor Plan ────────────────────────────────────────────────
  {
    const LOC_DATA = {
      _default:   { name: "DOCK50 · Gesamtanlage", area: 1200, height: 8.4, cap: 850  },
      foyer:      { name: "Foyer & Eingang",        area: 180,  height: 4.2, cap: 150  },
      bar:        { name: "Bar & Lounge",            area: 85,   height: 3.8, cap: 70   },
      garderobe:  { name: "Garderobe",               area: 85,   height: 3.4, cap: null },
      haupthalle: { name: "Haupthalle",              area: 580,  height: 6.2, cap: 480  },
      buehne:     { name: "Bühne",                   area: 195,  height: 8.4, cap: null },
      backstage:  { name: "Backstage",               area: 120,  height: 3.6, cap: 40   },
      technik:    { name: "Technik",                 area: 45,   height: 3.2, cap: null },
      vip:        { name: "VIP Lounge",              area: 80,   height: 3.8, cap: 60   },
    };

    const nameEl    = document.getElementById("locRoomName");
    const areaEl    = document.getElementById("locStatArea");
    const heightEl  = document.getElementById("locStatHeight");
    const capEl     = document.getElementById("locStatCap");
    const capUnitEl = document.getElementById("locCapUnit");

    function locCountUp(el, target, duration) {
      if (target === null) { el.textContent = "—"; return; }
      const isFloat = !Number.isInteger(target);
      const startTime = performance.now();
      const key = el._locRafKey = (el._locRafKey || 0) + 1;
      function tick(now) {
        if (el._locRafKey !== key) return;
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = target * eased;
        el.textContent = isFloat
          ? val.toFixed(1).replace(".", ",")
          : Math.round(val).toLocaleString("de-DE");
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function setLocData(key, animate = true) {
      const d = LOC_DATA[key];
      if (!d || !nameEl) return;
      nameEl.textContent = d.name;
      const dur = animate ? 650 : 0;
      locCountUp(areaEl,   d.area,   dur);
      locCountUp(heightEl, d.height, dur);
      if (d.cap === null) {
        if (capEl)     { capEl._locRafKey = (capEl._locRafKey || 0) + 1; capEl.textContent = "—"; }
        if (capUnitEl) capUnitEl.textContent = "";
      } else {
        locCountUp(capEl, d.cap, dur);
        if (capUnitEl) capUnitEl.textContent = "Gäste";
      }
    }

    // ── Hover: update data panel ─────────────────────────────────────────
    document.querySelectorAll(".loc-room-group").forEach(g => {
      const room = g.dataset.room;
      g.addEventListener("mouseenter", () => {
        if (!LOC_DATA[room]) return;
        setLocData(room, true);
      });
      g.addEventListener("mouseleave", () => {
        setLocData("_default", true);
      });
    });

    // ── Count-up when section first scrolls into view
    const locSection = document.getElementById("location");
    if (locSection) {
      let locSeen = false;
      const locObs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !locSeen) {
          locSeen = true;
          setLocData("_default", true);
          locObs.disconnect();
        }
      }, { threshold: 0.35 });
      locObs.observe(locSection);
    }
  }

  // ─── Rooms Section ────────────────────────────────────────────────────
  {
    const rsSection = document.querySelector(".rooms-section");
    const rsRight   = document.querySelector(".rs-right");
    const rsTitles  = document.querySelectorAll(".rs-title");
    const rsCards   = document.querySelectorAll(".rs-card");

    if (rsSection && rsRight && rsTitles.length) {
      let rsActive = null;

      function rsActivate(key) {
        if (key === rsActive) return;
        const prev = rsActive;
        rsActive = key;
        rsTitles.forEach(t => t.classList.toggle("rs-active", t.dataset.room === key));
        rsCards.forEach(card => {
          if (card.dataset.room === key) {
            gsap.set(card, { visibility: "inherit", pointerEvents: "auto" });
            gsap.to(card, { opacity: 1, duration: 0.45, ease: "power2.inOut", overwrite: true });
          } else if (card.dataset.room === prev) {
            gsap.to(card, {
              opacity: 0, duration: 0.3, ease: "power2.inOut", overwrite: true,
              onComplete() { gsap.set(card, { visibility: "hidden", pointerEvents: "none" }); },
            });
          }
        });
      }

      // Initial state
      rsCards.forEach((c, i) => gsap.set(c, i === 0
        ? { opacity: 1, visibility: "inherit", pointerEvents: "auto" }
        : { opacity: 0, visibility: "hidden", pointerEvents: "none" }
      ));
      rsActive = rsTitles[0].dataset.room;
      rsTitles[0].classList.add("rs-active");

      // Find which title center is closest to viewport center
      function checkActive() {
        const mid = window.innerHeight / 2;
        let closest = null, minDist = Infinity;
        rsTitles.forEach(t => {
          const r = t.getBoundingClientRect();
          const dist = Math.abs((r.top + r.height / 2) - mid);
          if (dist < minDist) { minDist = dist; closest = t; }
        });
        if (closest) rsActivate(closest.dataset.room);
      }

      // Pin section + translate right panel upward
      gsap.to(rsRight, {
        y: () => -(rsRight.offsetHeight - window.innerHeight),
        ease: "none",
        scrollTrigger: {
          trigger: rsSection,
          start: "top top",
          end: () => "+=" + (rsRight.offsetHeight - window.innerHeight),
          scrub: true,
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: checkActive,
        },
      });
    }
  }

  // ─── Section Snap (alle außer Spotlight) ───────────────────────────────
  const snapSections = Array.from(document.querySelectorAll(".snap-section:not(.spotlight):not(.location)"));
  let snapTimer  = null;
  let isSnapping = false;

  lenis.on("scroll", () => {
    if (isSnapping || spotIsSnapping || detailOpen) return;
    if (spST && spST.isActive) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (spotIsSnapping || detailOpen) return;
      if (spST && spST.isActive) return;
      const threshold = window.innerHeight * 0.25;
      let snapTarget = null, minDist = Infinity;
      snapSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const dist = Math.abs(rect.top);
        if (dist < threshold && dist < minDist) { minDist = dist; snapTarget = section; }
      });
      if (snapTarget && minDist > 2) {
        isSnapping = true;
        lenis.scrollTo(snapTarget, {
          duration: 0.8, easing: (t) => 1 - Math.pow(1 - t, 4),
          onComplete: () => { isSnapping = false; },
        });
      }
    }, 120);
  });

  // ─── Navbar (overlay – tablet / mobile) ────────────────────────────────
  const menuBtn = document.getElementById("menu04");
  const navbar  = document.getElementById("Navbar");

  if (menuBtn && navbar) {
    const navItems = document.querySelectorAll(".navH");
    const navTexts = document.querySelectorAll(".nav-item-text");
    const navNums  = document.querySelectorAll(".nav-item-num");
    const navLines = document.querySelectorAll(".nav-line");

    gsap.set(navLines, { scaleX: 0 });
    gsap.set(navTexts, { y: 60, opacity: 0 });
    gsap.set(navNums,  { opacity: 0 });

    function openNav() {
      navbar.classList.add("nav-open");
      menuBtn.classList.add("active");
      lenis.stop();
      if (pageLabel) gsap.to(pageLabel, { opacity: 0, duration: 0.2 });
      gsap.to(navTexts, { y: 0, opacity: 1, duration: 0.65, ease: "power3.out", stagger: 0.08, delay: 0.25 });
      gsap.to(navNums,  { opacity: 1, duration: 0.5, stagger: 0.08, delay: 0.35 });
    }

    function closeNav() {
      gsap.to(navTexts, { y: -40, opacity: 0, duration: 0.3, ease: "power2.in", stagger: 0.04 });
      gsap.to(navNums,  { opacity: 0, duration: 0.2 });
      document.querySelectorAll(".navImgWrapper").forEach(w => gsap.to(w, { opacity: 0, duration: 0.2 }));
      if (pageLabel) gsap.to(pageLabel, { opacity: 1, duration: 0.35, delay: 0.25 });
      setTimeout(() => {
        navbar.classList.remove("nav-open");
        menuBtn.classList.remove("active");
        lenis.start();
      }, 200);
    }

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navbar.classList.contains("nav-open") ? closeNav() : openNav();
    });

    navItems.forEach((item) => {
      const clip = item.querySelector(".navImgWrapper");
      const line = item.querySelector(".nav-line");
      if (!clip) return;
      const rots = [3, -2, 1.5];
      const idx  = Array.from(navItems).indexOf(item);
      gsap.set(clip, { rotation: rots[idx] || 2, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.85 });
      item.addEventListener("mouseenter", () => {
        gsap.to(clip, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" });
        if (line) gsap.to(line, { scaleX: 1, duration: 0.45, ease: "power3.out" });
      });
      item.addEventListener("mouseleave", () => {
        gsap.to(clip, { opacity: 0, scale: 0.85, duration: 0.35, ease: "power3.in" });
        if (line) gsap.to(line, { scaleX: 0, duration: 0.3, ease: "power2.in" });
      });
      item.addEventListener("mousemove", (e) => {
        gsap.to(clip, { x: e.clientX, y: e.clientY, duration: 0.55, ease: "power2.out" });
      });
    });

    const clockEl = document.getElementById("navClock");
    if (clockEl) {
      const tick = () => { clockEl.textContent = new Date().toLocaleTimeString("de-DE"); };
      tick(); setInterval(tick, 1000);
    }

    // Overlay nav link clicks
    document.querySelectorAll("#Navbar .nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href   = link.getAttribute("href");
        const target = document.querySelector(href);
        if (!target) return;
        closeNav();
        setTimeout(() => {
          navScrolling = true;
          const dest = (href === "#spotlight" && spST) ? spST.start : target;
          lenis.scrollTo(dest, {
            duration: 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            onComplete: () => { navScrolling = false; },
          });
        }, 650);
      });
    });
  }

  // ─── Custom Cursor (nur mit Maus) ──────────────────────────────────────
  const hasHover = window.matchMedia("(hover: hover)").matches;
  if (hasHover) {
    const cursor = document.createElement("div");
    cursor.id = "cursor";

    // Label for "DETAILS" inside the cursor circle (project images)
    const cursorLabel = document.createElement("span");
    cursorLabel.id = "cursorLabel";
    cursorLabel.textContent = "DETAILS";
    cursor.appendChild(cursorLabel);
    document.body.appendChild(cursor);

    // Start label invisible and pre-scaled inverse of the hover scale (8)
    gsap.set(cursorLabel, { scale: 0.125, opacity: 0 });

    window.addEventListener("mousemove", (e) => {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
    });

    // Generic interactive elements — normal scale-up
    document.querySelectorAll("a, button, .navH, .hero-badge").forEach((el) => {
      el.addEventListener("mouseenter", () => gsap.to(cursor, { scale: 3.5, duration: 0.3, ease: "power2.out" }));
      el.addEventListener("mouseleave", () => gsap.to(cursor, { scale: 1,   duration: 0.3, ease: "power2.out" }));
    });

    // Project images — large circle with "DETAILS" label
    document.querySelectorAll(".project-img").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("cursor-detail");
        gsap.killTweensOf(cursorLabel);
        gsap.to(cursor,      { scale: 8,   duration: 0.4, ease: "power2.out" });
        gsap.to(cursorLabel, { opacity: 1, duration: 0.2, delay: 0.18, ease: "power2.out" });
      });
      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("cursor-detail");
        gsap.killTweensOf(cursorLabel); // kill queued delayed opacity:1 before fading out
        gsap.to(cursorLabel, { opacity: 0, duration: 0.12, ease: "power2.in" });
        gsap.to(cursor,      { scale: 1,   duration: 0.3,  ease: "power2.out" });
      });
    });
  }

  // ─── Contact tabs ───────────────────────────────────────────────────────
  {
    const ctTabs = document.querySelectorAll(".ct-tab");

    ctTabs.forEach(tab => {
      tab.querySelector(".ct-tab-head").addEventListener("click", () => {
        ctTabs.forEach(t => t.classList.remove("ct-active"));
        tab.classList.add("ct-active");
      });
    });

    document.querySelectorAll(".ct-form").forEach(form => {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const entries = Array.from(new FormData(form).entries());
        const body = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
        const subject = form.dataset.subject || "Anfrage DOCK50";
        window.location.href =
          `mailto:info@dock50.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });
    });
  }

}); // end window.load
