CREATE TABLE `import_document_links` (
	`document_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`relation` text NOT NULL,
	`linked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_document_links_unique_idx` ON `import_document_links` (`document_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `import_document_links_entity_idx` ON `import_document_links` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `import_document_links_document_idx` ON `import_document_links` (`document_id`);--> statement-breakpoint
CREATE TABLE `import_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`original_name` text NOT NULL,
	`stored_name` text NOT NULL,
	`source_name` text NOT NULL,
	`import_kind` text NOT NULL,
	`imported_at` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`content_hash` text NOT NULL,
	`semantic_hash` text NOT NULL,
	`last_imported_at` text NOT NULL,
	`import_count` integer DEFAULT 1 NOT NULL,
	`storage_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_documents_stored_name_idx` ON `import_documents` (`stored_name`);--> statement-breakpoint
CREATE INDEX `import_documents_imported_at_idx` ON `import_documents` (`imported_at`);--> statement-breakpoint
CREATE INDEX `import_documents_source_name_idx` ON `import_documents` (`source_name`);--> statement-breakpoint
CREATE INDEX `import_documents_content_hash_idx` ON `import_documents` (`content_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `import_documents_semantic_hash_idx` ON `import_documents` (`semantic_hash`);