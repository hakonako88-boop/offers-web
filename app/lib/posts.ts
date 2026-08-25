import rawPosts from "../../data/posts.json";

export type PublishedPost = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl?: string;
  publishedAt: string;
  publishedLabel: string;
};

type StoredPost = {
  id?: string;
  message_id?: number;
  title?: string;
  body?: string;
  image?: string;
  url?: string;
  date?: number;
};

function safeExternalUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function clean(value?: string, maximum = 5000) {
  return String(value || "").replace(/\r\n/gu, "\n").trim().slice(0, maximum);
}

export const publishedPosts: PublishedPost[] = (rawPosts as StoredPost[])
  .flatMap((post) => {
    const id = clean(post.id || String(post.message_id || ""), 100);
    const title = clean(post.title, 180);
    const body = clean(post.body, 5000);
    const imageUrl = clean(post.image, 500);
    const timestamp = Number(post.date) * 1000;
    if (!id || title.length < 5 || !body || !imageUrl || !Number.isFinite(timestamp)) return [];
    const date = new Date(timestamp);
    return [{
      id,
      title,
      body,
      imageUrl,
      linkUrl: safeExternalUrl(post.url) || undefined,
      publishedAt: date.toISOString(),
      publishedLabel: date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
    }];
  })
  .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

export function postHref(id: string) {
  return `/publicacion/${encodeURIComponent(id)}/`;
}

export function getPostById(id: string) {
  return publishedPosts.find((post) => post.id === id);
}
