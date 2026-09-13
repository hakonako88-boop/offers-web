import rawPosts from "../../data/posts.json";

export type PublishedPost = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  imageUrls: string[];
  offerIds: string[];
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
  images?: string[];
  offer_ids?: string[];
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
    const imageUrls = [...new Set([imageUrl, ...(Array.isArray(post.images) ? post.images.map((image) => clean(image, 500)) : [])].filter(Boolean))].slice(0, 5);
    const timestamp = Number(post.date) * 1000;
    if (!id || title.length < 5 || !body || !imageUrl || !Number.isFinite(timestamp)) return [];
    const date = new Date(timestamp);
    return [{
      id,
      title,
      body,
      imageUrl,
      imageUrls,
      offerIds: Array.isArray(post.offer_ids) ? post.offer_ids.map((id) => clean(id, 150)).filter(Boolean).slice(0, 8) : [],
      linkUrl: safeExternalUrl(post.url) || undefined,
      publishedAt: date.toISOString(),
      publishedLabel: date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
    }];
  })
  .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

export function postHref(id: string) {
  return `/publicacion/${encodeURIComponent(id)}/`;
}

/** Daily machine-generated recaps and legacy numeric posts stay available to
 * visitors, but are not separate search landing pages. Campaigns, coupons and
 * manually named editorial posts remain indexable. */
export function postIsIndexable(post: Pick<PublishedPost, "id">) {
  return !/^resumen-diario-/iu.test(post.id) && !/^post-\d+$/iu.test(post.id);
}

export function getPostById(id: string) {
  return publishedPosts.find((post) => post.id === id);
}
