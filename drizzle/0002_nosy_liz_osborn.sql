CREATE TABLE `price_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`target_price` real NOT NULL,
	`channel` text NOT NULL,
	`destination_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text,
	`last_notified_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_price_alerts_product_status` ON `price_alerts` (`product_id`,`status`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`image_url` text,
	`editor_recommended` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `idx_products_editor_recommended` ON `products` (`editor_recommended`);