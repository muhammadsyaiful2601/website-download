/* Website download Peminjaman Barang PNP
 * Sumber data: GitHub Releases API (otomatis mengikuti versi terbaru).
 */

const OWNER = "muhammadsyaiful2601";
const REPO = "peminjaman-releases";
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`;
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=20`;
const FALLBACK_URL = "assets/releases.json";

const $ = (sel) => document.querySelector(sel);

/* ================= Utilitas ================= */

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString("id-ID") : "0";
}

function isInstaller(asset) {
  return /\.(exe|msi|msix|appimage|dmg|pkg|deb)$/i.test(asset.name);
}

function isMetadata(asset) {
  return /\.(yml|yaml)$/i.test(asset.name);
}

/* Markdown sederhana untuk changelog GitHub. */
function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of (md || "").split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^[-*+]\s+(.*)$/);

    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    closeList();
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 3);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (line.trim()) {
      out.push(`<p>${inline(line.trim())}</p>`);
    }
  }
  closeList();
  return out.join("") || "<p>Tidak ada catatan perubahan untuk versi ini.</p>";
}

/* ================= Data rilis ================= */

async function loadReleases() {
  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = (Array.isArray(data) ? data : []).filter((r) => !r.draft && r.tag_name);
    if (!list.length) throw new Error("Tidak ada rilis");
    return list;
  } catch (err) {
    try {
      const res = await fetch(FALLBACK_URL, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.releases) && data.releases.length) return data.releases;
      }
    } catch (_) {}
    return [];
  }
}

function renderHero(release) {
  if (!release) return;
  const installer = release.assets.find(isInstaller);
  const totalDownloads = release.assets.reduce((sum, a) => sum + (a.download_count || 0), 0);
  const version = release.tag_name || release.name || "";

  const badge = $("#version-badge");
  badge.textContent = `Versi ${version}`;
  badge.title = `Dirilis ${formatDate(release.published_at)} • ${release.html_url}`;

  const btn = $("#download-btn");
  if (installer) {
    installerUrl = installer.browser_download_url;
    const filename = installer.name;
    btn.href = installer.browser_download_url;
    btn.setAttribute("download", filename);
    btn.dataset.state = "ready";
    $("#download-btn-text").textContent = `Unduh untuk Windows (${version})`;
    $("#win-btn").href = installer.browser_download_url;
    $("#win-btn").setAttribute("download", filename);
    $("#win-btn").dataset.state = "ready";
    $("#win-desc").textContent = `Windows 10/11 • 64-bit • ${version} • ${formatSize(installer.size)}`;
    $("#meta-size").textContent = formatSize(installer.size);
  } else {
    btn.href = release.html_url;
    btn.dataset.state = "ready";
    $("#download-btn-text").textContent = `Buka Rilis ${version}`;
  }

  const metadata = release.assets.find(isMetadata);
  if (metadata) {
    $("#yml-btn").href = metadata.browser_download_url;
    $("#yml-btn").dataset.state = "ready";
  } else {
    $("#yml-btn").remove();
  }

  $("#release-btn").href = release.html_url;
  $("#all-btn").href = RELEASES_URL;
  $("#footer-release").href = RELEASES_URL;
  $("#footer-repo").href = `https://github.com/${OWNER}/${REPO}`;
  $("#meta-date").textContent = formatDate(release.published_at);
  $("#meta-count").textContent = formatNumber(totalDownloads);
  $("#os-note").textContent =
    "Installer untuk Windows 10/11 (64-bit) • butuh ruang kosong minimal 1 GB • SHA-256 tersedia di halaman GitHub Rilis.";
}

function renderReleases(list) {
  const container = $("#releases");
  if (!list.length) {
    container.innerHTML = '<p class="empty">Belum ada rilis tersedia.</p>';
    return;
  }

  container.innerHTML = list
    .map((release, index) => {
      const version = release.tag_name || release.name || "-";
      const assets = (release.assets || []).filter((a) => !/\.(yml|yaml)$/i.test(a.name));
      const totalDownloads = (release.assets || []).reduce(
        (sum, a) => sum + (a.download_count || 0),
        0
      );

      const tags = [];
      if (index === 0) tags.push('<span class="tag tag-latest">Terbaru</span>');
      if (release.prerelease) tags.push('<span class="tag tag-pre">Prerelease</span>');

      const assetPills = assets
        .map(
          (a) => `<a class="asset-pill" href="${a.browser_download_url}" target="_blank" rel="noopener" download>
              ${a.name} <span class="asset-size">${formatSize(a.size)} • ${formatNumber(a.download_count)}x</span>
            </a>`
        )
        .join("");

      return `<article class="release">
          <div class="release-head">
            <span class="release-version">${version}</span>
            ${tags.join(" ")}
            <span class="tag-date">Dirilis ${formatDate(release.published_at)} • ${formatNumber(totalDownloads)}x diunduh</span>
          </div>
          <div class="changelog">${renderMarkdown(release.body)}</div>
          ${assetPills ? `<div class="release-assets">${assetPills}</div>` : ""}
          <div class="release-assets">
            <a class="asset-pill" href="${release.html_url}" target="_blank" rel="noopener">Lihat di GitHub →</a>
          </div>
        </article>`;
    })
    .join("");
}

/* ================= Galeri: marquee berjalan terus + lightbox ================= */

const MARQUEE_SPEED = 0.55; // piksel per frame

function initGallery() {
  const track = $("#gallery-track");
  const group = $("#gallery-group");
  const lightbox = $("#lightbox");
  const originals = Array.from(group.querySelectorAll(".shot"));
  let clone = null;
  let groupWidth = 0;
  let running = true;
  let frame = null;

  /* Foto asli diberi ID agar clone bisa dipetakan kembali. */
  originals.forEach((el, i) => {
    el.dataset.key = String(i);
  });

  function buildClone() {
    if (clone) clone.remove();
    clone = group.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll(".shot").forEach((el, i) => {
      el.dataset.key = String(i);
      el.setAttribute("tabindex", "-1");
    });
    track.appendChild(clone);
    groupWidth = group.scrollWidth;
    track.scrollLeft = 0;
  }

  function visibleShots() {
    return originals.filter((el) => !el.hidden);
  }

  function applyFilter(filter) {
    [...group.querySelectorAll(".shot"), ...(clone ? clone.querySelectorAll(".shot") : [])].forEach(
      (el) => {
        el.hidden = filter !== "all" && el.dataset.category !== filter;
      }
    );
    groupWidth = group.scrollWidth;
    track.scrollLeft = 0;
  }

  /* Satu item_original + clone-nya diputar terus (right to left, tanpa jeda). */
  function loop() {
    if (running && groupWidth > 0) {
      track.scrollLeft += MARQUEE_SPEED;
      if (track.scrollLeft >= groupWidth) track.scrollLeft -= groupWidth;
    }
    frame = window.requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
  }
  function resume() {
    if (lightbox.hidden) running = true;
  }

  track.addEventListener("mouseenter", pause);
  track.addEventListener("mouseleave", resume);
  track.addEventListener("touchstart", pause, { passive: true });
  track.addEventListener("touchend", () => window.setTimeout(resume, 2200));
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : resume()));

  $("#gallery-filters").addEventListener("click", (event) => {
    const pill = event.target.closest(".pill");
    if (!pill) return;
    $("#gallery-filters")
      .querySelectorAll(".pill")
      .forEach((p) => p.classList.toggle("is-active", p === pill));
    applyFilter(pill.dataset.filter);
  });

  function stepBy(direction) {
    const step = (originals[0] ? originals[0].offsetWidth + 24 : 280) * direction;
    track.scrollTo({ left: track.scrollLeft + step, behavior: "smooth" });
    window.setTimeout(() => {
      if (groupWidth > 0 && track.scrollLeft >= groupWidth) track.scrollLeft -= groupWidth;
      if (groupWidth > 0 && track.scrollLeft < 0) track.scrollLeft += groupWidth;
    }, 500);
  }

  $("#gallery-next").addEventListener("click", () => stepBy(1));
  $("#gallery-prev").addEventListener("click", () => stepBy(-1));

  /* Lightbox */
  let lightboxIndex = 0;

  function showLightbox(keyIndex) {
    const items = visibleShots();
    if (!items.length) return;
    lightboxIndex = (keyIndex + items.length) % items.length;
    const item = items[lightboxIndex];
    const img = item.querySelector("img");
    $("#lightbox-img").src = img.src;
    $("#lightbox-img").alt = img.alt;
    $("#lightbox-caption").textContent = item.querySelector("figcaption").textContent;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    pause();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    resume();
  }

  track.addEventListener("click", (event) => {
    const item = event.target.closest(".shot");
    if (!item || item.hidden) return;
    const key = Number(item.dataset.key);
    showLightbox(visibleShots().findIndex((el) => Number(el.dataset.key) === key));
  });

  $("#lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  $("#lightbox-next").addEventListener("click", () => showLightbox(lightboxIndex + 1));
  $("#lightbox-prev").addEventListener("click", () => showLightbox(lightboxIndex - 1));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") showLightbox(lightboxIndex + 1);
    if (event.key === "ArrowLeft") showLightbox(lightboxIndex - 1);
  });

  /* Bangun ulang setelah font/gambar siap agar lebar grup akurat. */
  buildClone();
  window.addEventListener("resize", () => {
    groupWidth = group.scrollWidth;
  });
  window.addEventListener("load", () => {
    groupWidth = group.scrollWidth;
    track.scrollLeft = 0;
  });
  loop();
}

/* ================= Gambar & navbar ================= */

function attachImageFallbacks() {
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    const fallback = img.dataset.fallback;
    delete img.dataset.fallback;
    img.addEventListener(
      "error",
      () => {
        if (img.src.endsWith(fallback.split("/").pop())) return;
        img.src = fallback;
      },
      { once: true }
    );
  });
}

function initNav() {
  const toggle = $("#nav-toggle");
  const nav = $("#main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initScrollAnimations() {
  const targets = document.querySelectorAll(
    ".section, .hero-visual, .download-main, .download-side, .license-card"
  );
  targets.forEach((el) => el.classList.add("reveal"));

  /* Stagger: kartu fitur muncul satu per satu. */
  document.querySelectorAll(".features .feature, .steps-grid li").forEach((el, i) => {
    el.classList.add("reveal");
    el.style.setProperty("--stagger", `${(i % 9) * 70}ms`);
  });

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

/* ================= Efek riak air dari titik klik ================= */
function initRippleEffect() {
  const layer = $("#ripple-layer");
  if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      if (event.target.closest(".ripple-layer")) return;

      /* Dua cincin: yang utama dan satu riak susulan yang lebih lembut. */
      const rings = [
        { size: 24, soft: false, delay: 0 },
        { size: 16, soft: true, delay: 120 },
      ];

      rings.forEach(({ size, soft, delay }) => {
        const ring = document.createElement("span");
        ring.className = "ripple" + (soft ? " is-soft" : "");
        ring.style.width = `${size}px`;
        ring.style.height = `${size}px`;
        ring.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
        ring.style.left = `${event.clientX}px`;
        ring.style.top = `${event.clientY}px`;
        ring.style.animationDelay = `${delay}ms`;
        layer.appendChild(ring);
        ring.addEventListener("animationend", () => ring.remove());
      });

      window.setTimeout(() => {
        if (layer.childElementCount > 12) layer.innerHTML = "";
      }, 1500);
    },
    { passive: true }
  );
}

/* ================= Progress unduhan ================= */
let installerUrl = "";

function formatBytes(bytes) {
  return formatSize(bytes);
}

function setDownloadState({ percent, title, detail, indeterminate, done }) {
  const toast = $("#dl-toast");
  if (!toast) return;
  if (percent === null) toast.hidden = true;
  else toast.hidden = false;

  toast.classList.toggle("is-indeterminate", !!indeterminate);
  toast.classList.toggle("is-done", !!done);
  $("#dl-toast-title").textContent = title || "";
  $("#dl-toast-detail").textContent = detail || "";
  $("#dl-toast-pct").textContent =
    percent === null ? "" : done ? "Selesai" : `${Math.round(percent)}%`;
  $("#dl-toast-fill").style.width = percent === null ? "0%" : `${Math.min(100, percent)}%`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function startDownload(url, filename) {
  setDownloadState({ percent: 0, title: "Menyiapkan unduhan…", detail: filename, indeterminate: true });

  let stream;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error("stream tidak tersedia");
    stream = res;
  } catch (_) {
    /* CORS tidak diizinkan oleh GitHub — biarkan browser mengunduh secara native. */
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadState({
      percent: 100,
      title: "Unduhan dimulai",
      detail: "File masuk ke folder unduhan browser Anda.",
      done: true,
    });
    window.setTimeout(() => setDownloadState({ percent: null }), 6000);
    return;
  }

  const total = Number(stream.headers.get("content-length")) || 0;
  const reader = stream.body.getReader();
  const chunks = [];
  let received = 0;
  const started = performance.now();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const percent = total ? (received / total) * 100 : 0;
      const elapsed = (performance.now() - started) / 1000;
      const speed = elapsed > 0 ? received / elapsed : 0;
      setDownloadState({
        percent: total ? percent : 0,
        indeterminate: !total,
        title: total ? "Mengunduh installer…" : "Mengunduh installer…",
        detail: total
          ? `${formatBytes(received)} dari ${formatBytes(total)} • ${formatBytes(speed)}/detik`
          : `${formatBytes(received)} terunduh`,
      });
    }
  } catch (_) {
    setDownloadState({ percent: null });
    return;
  }

  saveBlob(new Blob(chunks, { type: "application/octet-stream" }), filename);
  setDownloadState({
    percent: 100,
    title: "Unduhan selesai",
    detail: `${filename} • ${formatBytes(received)}`,
    done: true,
  });
  window.setTimeout(() => setDownloadState({ percent: null }), 6000);
}

function initDownloadProgress() {
  $("#dl-toast-close").addEventListener("click", () => setDownloadState({ percent: null }));

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("#download-btn, #win-btn");
    if (!trigger || !installerUrl) return;
    event.preventDefault();
    startDownload(installerUrl, trigger.getAttribute("download") || installerUrl.split("/").pop());
  });
}

/* Menandai menu navbar sesuai bagian yang sedang dibaca. */
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll("#main-nav a[href^='#']"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((link) =>
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`)
    );
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
  setActive(sections[0].id);
}

async function init() {
  $("#year").textContent = new Date().getFullYear();
  attachImageFallbacks();
  initGallery();
  initNav();
  initScrollAnimations();
  initScrollSpy();
  initRippleEffect();
  initDownloadProgress();

  const list = await loadReleases();
  renderHero(list[0]);
  renderReleases(list);
}

document.addEventListener("DOMContentLoaded", init);