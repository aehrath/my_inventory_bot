CREATE TABLE `app_metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`schema_version` integer NOT NULL,
	`state_version` integer NOT NULL,
	`updated_at` text NOT NULL,
	`migrated_at` text
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`external_key` text NOT NULL,
	`normalized_external_key` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`state` text NOT NULL,
	`postal_code` text NOT NULL,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_external_key_idx` ON `customers` (`normalized_external_key`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_location_idx` ON `customers` (`state`,`postal_code`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`external_key` text NOT NULL,
	`normalized_external_key` text NOT NULL,
	`purchase_source` text NOT NULL,
	`vendor` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_external_key_idx` ON `expenses` (`normalized_external_key`);--> statement-breakpoint
CREATE INDEX `expenses_purchase_source_idx` ON `expenses` (`purchase_source`);--> statement-breakpoint
CREATE INDEX `expenses_category_date_idx` ON `expenses` (`category`,`date`);--> statement-breakpoint
CREATE INDEX `expenses_vendor_idx` ON `expenses` (`vendor`);--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`source_key` text,
	`customer_id` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `movements_product_idx` ON `movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `movements_type_date_idx` ON `movements` (`type`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `movements_source_key_idx` ON `movements` (`source_key`);--> statement-breakpoint
CREATE INDEX `movements_customer_idx` ON `movements` (`customer_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`vendor` text NOT NULL,
	`category` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_cost` real NOT NULL,
	`sale_price` real NOT NULL,
	`reorder_point` real NOT NULL,
	`sales_tax_paid` integer NOT NULL,
	`created_at` text NOT NULL,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_vendor_idx` ON `products` (`vendor`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);