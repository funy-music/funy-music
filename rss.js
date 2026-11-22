const RSS_CHANNEL_ID = "UC92LxNLfzOkY7Zi2_WTOvlQ";

const RSS_PROVIDERS = [
  {
    name: "allorigins-raw",
    getUrl: (feedUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
    extractXml: async (res) => await res.text()
  },
  {
    name: "allorigins-json",
    getUrl: (feedUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
    extractXml: async (res) => {
      const data = await res.json();
      return typeof data?.contents === "string" ? data.contents : "";
    }
  },
  {
    name: "corsproxy-io",
    getUrl: (feedUrl) => `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
    extractXml: async (res) => await res.text()
  }
];

function extractYtIdFromHref(href) {
  if (!href) return "";
  const match = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}

function parseYoutubeRssXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid XML structure");
  }

  const entries = Array.from(doc.querySelectorAll("entry"));

  return entries
    .map((entry) => {
      const title = entry.querySelector("title")?.textContent?.trim() || "";
      const videoId =
        entry.getElementsByTagName("yt:videoId")[0]?.textContent?.trim() ||
        entry.querySelector("videoId")?.textContent?.trim() ||
        "";
      const linkHref = entry.querySelector("link")?.getAttribute("href") || "";
      const published = entry.querySelector("published")?.textContent?.trim() || "";
      const ytId = videoId || extractYtIdFromHref(linkHref);

      return {
        ytId,
        title,
        url: ytId ? `https://www.youtube.com/watch?v=${ytId}` : linkHref,
        thumbUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "",
        published,
        source: "rss"
      };
    })
    .filter((item) => Boolean(item.ytId));
}

async function fetchRssXmlWithFallback(feedUrl) {
  let lastError = null;

  for (const provider of RSS_PROVIDERS) {
    try {
      const endpoint = provider.getUrl(feedUrl);
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`${provider.name} HTTP ${res.status}`);
      }
      const xmlText = await provider.extractXml(res);
      if (xmlText && (xmlText.includes("<entry") || xmlText.includes("<feed"))) {
        return xmlText;
      }
      throw new Error(`${provider.name} returned non-feed content`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All RSS providers failed");
}

async function loadChannelRss(channelId = RSS_CHANNEL_ID) {
  if (!channelId) return [];
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const xmlText = await fetchRssXmlWithFallback(feedUrl);
  return parseYoutubeRssXml(xmlText);
}

window.FunyRss = {
  channelId: RSS_CHANNEL_ID,
  loadChannelRss,
  parseYoutubeRssXml
};