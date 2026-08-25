CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`price` real NOT NULL,
	`checked_at` text NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`availability` text DEFAULT 'unknown' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_price_history_product_checked` ON `price_history` (`product_id`,`checked_at`);--> statement-breakpoint
CREATE INDEX `idx_price_history_store_checked` ON `price_history` (`store_id`,`checked_at`);