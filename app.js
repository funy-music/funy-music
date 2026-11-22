const STORAGE_KEY = "funy_music_upcoming_state_v1";
const PAGE_TITLE = "Funy Music";

// Điền Bin ID và Key từ JSONBin vào đây để cập nhật mảng chính cho mọi máy cùng thấy
const JSONBIN_ID = "6b02571bffd5d16053d4e69b";
const JSONBIN_API_KEY = "$2a$10$8pTzgAiStqNARo5ZG6ilMOU2yTAnbBoX6s0RHhZvnwX9eQrC.uk1y";
const JSONBIN_URL = JSONBIN_ID ? `https://api.jsonbin.io/v3/b/${JSONBIN_ID}` : "";

const DEFAULT_UPCOMING = {
  songName: "New Track",
  status: "COMING SOON", // "COMING SOON" or "OUT NOW"
  trackUrl: "",
  tagline: "A new track is in the works — stay tuned on the channel.",
  logoUrl: "https://placehold.co/600x600/151b29/60a5fa?text=FUNY+MUSIC"
};

const YOUTUBE_CHANNEL_ID = "UC92LxNLfzOkY7Zi2_WTOvlQ";

const EXISTING_TRACKS = [
  {
    ytId: "oieqsajSq3Q",
    url: "https://www.youtube.com/watch?v=oieqsajSq3Q",
    title: "BitLis",
    thumbUrl: ""
  },
  {
    ytId: "QzUOS34dMzM",
    url: "https://www.youtube.com/watch?v=QzUOS34dMzM",
    title: "VILLAGER JUMPSTYLE",
    thumbUrl: ""
  },
  {
    ytId: "5sFentH0RY8",
    url: "https://www.youtube.com/watch?v=5sFentH0RY8",
    title: "RAYA VILLAGER",
    thumbUrl: ""
  },
  {
    ytId: "bQy9bJDJ5ao",
    url: "https://www.youtube.com/watch?v=bQy9bJDJ5ao",
    title: "PASSO BEM SOLTO VILLAGER",
    thumbUrl: ""
  }
];

function normalizeStatus(rawStatus) {
  if (rawStatus === "OUT NOW" || rawStatus === "ĐÃ RA MẮT") return "OUT NOW";
  return "COMING SOON";
}

function sanitizeHttpUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "";
  } catch {
    return "";
  }
}

function normalizeUpcomingPayload(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    songName: src.songName || DEFAULT_UPCOMING.songName,
    status: normalizeStatus(src.status),
    trackUrl: typeof src.trackUrl === "string" ? src.trackUrl : DEFAULT_UPCOMING.trackUrl,
    tagline: typeof src.tagline === "string" ? src.tagline : DEFAULT_UPCOMING.tagline,
    logoUrl: src.logoUrl || DEFAULT_UPCOMING.logoUrl
  };
}

function loadLocalUpcomingState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UPCOMING };
    return normalizeUpcomingPayload(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UPCOMING };
  }
}

function saveLocalUpcomingState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUpcomingPayload(state)));
  } catch {
    // Ignore storage restrictions
  }
}

async function fetchGlobalUpcoming() {
  if (!JSONBIN_URL || !JSONBIN_API_KEY) return null;
  try {
    const res = await fetch(`${JSONBIN_URL}/latest`, {
      headers: {
        "X-Access-Key": JSONBIN_API_KEY
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const record = json?.record;
    if (!record || typeof record !== "object") return null;
    return normalizeUpcomingPayload(record);
  } catch {
    return null;
  }
}

async function saveUpcomingState(state) {
  const cleanState = normalizeUpcomingPayload(state);
  saveLocalUpcomingState(cleanState);

  if (!JSONBIN_URL || !JSONBIN_API_KEY) return;
  try {
    const res = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": JSONBIN_API_KEY
      },
      body: JSON.stringify(cleanState)
    });
    if (!res.ok) {
      console.warn("Không lưu được lên JSONBin:", res.status);
    }
  } catch (err) {
    console.warn("Lỗi mạng khi lưu lên JSONBin:", err);
  }
}

let currentUpcoming = loadLocalUpcomingState();
let draftLogoUrl = currentUpcoming.logoUrl;

function extractDominantAccent(imgEl) {
  try {
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(imgEl, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);

    let bestColor = null;
    let bestScore = -1;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / (3 * 255);

      if (lum > 0.14 && lum < 0.92) {
        const score = sat * 2 + lum * 0.4;
        if (score > bestScore) {
          bestScore = score;
          bestColor = `rgb(${r}, ${g}, ${b})`;
        }
      }
    }

    if (bestColor) {
      document.documentElement.style.setProperty("--accent", bestColor);
    }
  } catch {
    // Keep default accent when canvas CORS is restricted
  }
}

function applyStageVisuals(container, data) {
  const safeUrl = String(data.logoUrl || "").replace(/"/g, "%22");
  container.style.setProperty("--stage-bg", safeUrl ? `url("${safeUrl}")` : "none");

  const stageImg = container.querySelector(".logo-box img");
  if (stageImg) {
    if (stageImg.complete && stageImg.naturalWidth) {
      extractDominantAccent(stageImg);
    }
    stageImg.addEventListener("load", () => extractDominantAccent(stageImg), { once: true });
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderUpcoming(data) {
  const container = document.getElementById("upcoming-stage");
  if (!container || !data) return;

  document.title = PAGE_TITLE;

  const statusText = normalizeStatus(data.status);
  const safeTrackUrl = statusText === "OUT NOW" ? sanitizeHttpUrl(data.trackUrl) : "";

  container.innerHTML = `
    <div class="stage-left">
      <h1 class="stage-title">
        ${escapeHtml(data.songName)} <span class="highlight">${statusText}</span>
      </h1>
      <p class="stage-sub">${escapeHtml(data.tagline)}</p>
      ${
        safeTrackUrl
          ? `
            <div class="stage-cta-row">
              <a class="stage-listen-btn" href="${escapeHtml(safeTrackUrl)}" target="_blank" rel="noopener noreferrer">
                Listen on YouTube →
              </a>
            </div>
          `
          : ""
      }
    </div>
    <div class="logo-box">
      <img src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(data.songName)} logo" />
    </div>
  `;

  applyStageVisuals(container, data);
}

function setActiveNav(key) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === key);
  });
}

function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const targetKey = el.dataset.nav;
      if (!targetKey) return;
      e.preventDefault();
      setActiveNav(targetKey);

      if (targetKey === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (targetKey === "tracks") {
        document.getElementById("tracks")?.scrollIntoView({ behavior: "smooth" });
      } else if (targetKey === "about") {
        document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  window.addEventListener(
    "scroll",
    () => {
      const aboutTop = document.getElementById("about")?.getBoundingClientRect().top ?? Infinity;
      const tracksTop = document.getElementById("tracks")?.getBoundingClientRect().top ?? Infinity;
      const threshold = window.innerHeight * 0.45;

      if (aboutTop <= threshold) {
        setActiveNav("about");
      } else if (tracksTop <= threshold) {
        setActiveNav("tracks");
      } else {
        setActiveNav("home");
      }
    },
    { passive: true }
  );
}

function syncTrackUrlFieldVisibility(statusValue) {
  const fieldEl = document.getElementById("track-url-field");
  if (!fieldEl) return;
  fieldEl.hidden = normalizeStatus(statusValue) !== "OUT NOW";
}

function openEditor() {
  const backdrop = document.getElementById("editor-backdrop");
  const nameInput = document.getElementById("input-song-name");
  const statusSelect = document.getElementById("input-status");
  const trackUrlInput = document.getElementById("input-track-url");
  const taglineInput = document.getElementById("input-tagline");
  const fileInput = document.getElementById("input-logo-file");
  const previewImg = document.getElementById("preview-logo");

  if (!backdrop) return;

  const normalizedStatus = normalizeStatus(currentUpcoming.status);
  draftLogoUrl = currentUpcoming.logoUrl;
  nameInput.value = currentUpcoming.songName;
  statusSelect.value = normalizedStatus;
  if (trackUrlInput) {
    trackUrlInput.value = currentUpcoming.trackUrl || "";
  }
  syncTrackUrlFieldVisibility(normalizedStatus);
  taglineInput.value = currentUpcoming.tagline;
  fileInput.value = "";
  previewImg.src = draftLogoUrl;

  backdrop.hidden = false;
  nameInput.focus();
}

function closeEditor() {
  const backdrop = document.getElementById("editor-backdrop");
  if (backdrop) backdrop.hidden = true;
}

function setupShortcutAndModal() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) {
      e.preventDefault();
      const backdrop = document.getElementById("editor-backdrop");
      if (backdrop && !backdrop.hidden) {
        closeEditor();
      } else {
        openEditor();
      }
    } else if (e.key === "Escape") {
      closeEditor();
    }
  });

  document.getElementById("input-status")?.addEventListener("change", (e) => {
    syncTrackUrlFieldVisibility(e.target.value);
  });

  document.getElementById("close-editor")?.addEventListener("click", closeEditor);
  document.getElementById("cancel-editor")?.addEventListener("click", closeEditor);

  document.getElementById("input-logo-file")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        draftLogoUrl = reader.result;
        const previewImg = document.getElementById("preview-logo");
        if (previewImg) previewImg.src = draftLogoUrl;
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("reset-logo-btn")?.addEventListener("click", () => {
    draftLogoUrl = DEFAULT_UPCOMING.logoUrl;
    const fileInput = document.getElementById("input-logo-file");
    const previewImg = document.getElementById("preview-logo");
    if (fileInput) fileInput.value = "";
    if (previewImg) previewImg.src = draftLogoUrl;
  });

  document.getElementById("editor-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const songName = document.getElementById("input-song-name").value.trim() || DEFAULT_UPCOMING.songName;
    const status = normalizeStatus(document.getElementById("input-status").value);
    const rawTrackUrl = document.getElementById("input-track-url")?.value.trim() || "";
    const tagline = document.getElementById("input-tagline").value.trim();

    currentUpcoming = {
      songName,
      status,
      trackUrl: rawTrackUrl,
      tagline,
      logoUrl: draftLogoUrl || DEFAULT_UPCOMING.logoUrl
    };

    renderUpcoming(currentUpcoming);
    closeEditor();
    await saveUpcomingState(currentUpcoming);
  });
}

function extractYoutubeId(input) {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match && match[1]) return match[1];
  }
  return "";
}

function getThumbUrl(track) {
  if (track.thumbUrl && track.thumbUrl.trim()) {
    return track.thumbUrl.trim();
  }
  return `https://img.youtube.com/vi/${track.ytId}/hqdefault.jpg`;
}

function getWatchUrl(track) {
  if (track.url && track.url.trim()) return track.url.trim();
  return `https://www.youtube.com/watch?v=${track.ytId}`;
}

function renderTracks(tracks) {
  const grid = document.getElementById("track-grid");
  if (!grid) return;

  if (!tracks.length) {
    grid.innerHTML = `<p class="card-title">No tracks available yet.</p>`;
    return;
  }

  grid.innerHTML = tracks
    .map((track) => {
      const safeTitle = escapeHtml(track.title);
      return `
        <article class="card">
          <div class="thumb">
            <img src="${getThumbUrl(track)}" alt="${safeTitle}" loading="lazy" />
          </div>
          <div class="card-body">
            <span class="card-badge ${track.isAuto ? "" : "existing"}">
              ${track.isAuto ? "Auto-synced from YouTube" : "On Channel"}
            </span>
            <h3 class="card-title">${safeTitle}</h3>
            <div class="card-foot">
              <a class="card-link" href="${getWatchUrl(track)}" target="_blank" rel="noopener noreferrer">
                Listen on YouTube →
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function setStatus(text) {
  const el = document.getElementById("sync-status");
  if (el) el.textContent = text;
}

async function fetchTitleViaOEmbed(ytId) {
  try {
    const watchUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`);
    const res = await fetch(`https://www.youtube.com/oembed?url=${watchUrl}&format=json`);
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data.title === "string" ? data.title.trim() : "";
  } catch {
    return "";
  }
}

async function init() {
  document.title = PAGE_TITLE;
  renderUpcoming(currentUpcoming);
  setupNavigation();
  setupShortcutAndModal();

  const globalData = await fetchGlobalUpcoming();
  if (globalData) {
    currentUpcoming = globalData;
    draftLogoUrl = currentUpcoming.logoUrl;
    saveLocalUpcomingState(currentUpcoming);
    renderUpcoming(currentUpcoming);
  }

  const baseTracks = EXISTING_TRACKS
    .map((t) => {
      const ytId = extractYoutubeId(t.url || t.ytId || "");
      return {
        ...t,
        ytId,
        url: t.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ""),
        title: (t.title || "").trim() || `Track ${ytId}`,
        isAuto: false
      };
    })
    .filter((t) => Boolean(t.ytId))
    .reverse();

  renderTracks(baseTracks);

  if (!YOUTUBE_CHANNEL_ID || !window.FunyRss?.loadChannelRss) {
    return;
  }

  try {
    setStatus("Syncing new tracks from YouTube...");
    const rssItems = await window.FunyRss.loadChannelRss(YOUTUBE_CHANNEL_ID);
    const existingIds = new Set(baseTracks.map((t) => t.ytId));
    const newItems = rssItems.filter((item) => item.ytId && !existingIds.has(item.ytId));

    const autoTracks = [];
    for (const item of newItems) {
      const title = item.title || (await fetchTitleViaOEmbed(item.ytId)) || `Track ${item.ytId}`;
      autoTracks.push({
        ytId: item.ytId,
        url: item.url || `https://www.youtube.com/watch?v=${item.ytId}`,
        title,
        thumbUrl: item.thumbUrl || "",
        isAuto: true
      });
    }

    const merged = [...autoTracks, ...baseTracks];
    renderTracks(merged);
    setStatus(
      autoTracks.length
        ? `Added ${autoTracks.length} new track(s) from YouTube`
        : "Up to date with YouTube"
    );
  } catch {
    setStatus("");
  }
}

init();
