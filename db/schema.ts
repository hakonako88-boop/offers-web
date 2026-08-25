import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  imageUrl: text("image_url"),
  editorRecommended: integer("editor_recommended", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_products_category").on(table.category), index("idx_products_editor_recommended").on(table.editorRecommended)]);

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  store: text("store").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  oldPrice: real("old_price").notNull(),
  coupon: text("coupon"),
  imageUrl: text("image_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  badge: text("badge"),
  verifiedAt: text("verified_at").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_deals_active_updated").on(table.active, table.updatedAt), index("idx_deals_category").on(table.category)]);

/** Append-only observations written after real checks. Missing periods are
 * left empty: no process backfills or estimates historical prices. */
export const priceHistory = sqliteTable("price_history", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  storeId: text("store_id").notNull(),
  price: real("price").notNull(),
  checkedAt: text("checked_at").notNull(),
  currency: text("currency").notNull().default("EUR"),
  availability: text("availability").notNull().default("unknown"),
}, (table) => [index("idx_price_history_product_checked").on(table.productId, table.checkedAt), index("idx_price_history_store_checked").on(table.storeId, table.checkedAt)]);

/** Prepared for a future verified notification service. No public UI writes
 * to this table until email/push ownership and delivery are implemented. */
export const priceAlerts = sqliteTable("price_alerts", {
  id: text("id").primaryKey(), productId: text("product_id").notNull(), targetPrice: real("target_price").notNull(),
  channel: text("channel").notNull(), destinationHash: text("destination_hash").notNull(), status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(), verifiedAt: text("verified_at"), lastNotifiedAt: text("last_notified_at"),
}, (table) => [index("idx_price_alerts_product_status").on(table.productId, table.status)]);
