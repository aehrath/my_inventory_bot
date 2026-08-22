CREATE TABLE `data_commits` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`format_version` integer NOT NULL,
	`application_state_version` integer NOT NULL,
	`content_hash` text NOT NULL,
	`snapshot_key` text NOT NULL,
	`snapshot_bytes` integer NOT NULL,
	`record_count` integer NOT NULL,
	`field_count` integer NOT NULL,
	`changed_field_count` integer NOT NULL,
	`remote_status` text DEFAULT 'not_pushed' NOT NULL,
	`remote_repository` text,
	`remote_branch` text,
	`remote_path` text,
	`remote_commit_sha` text,
	`remote_url` text,
	`remote_error` text
);
--> statement-breakpoint
CREATE INDEX `data_commits_created_at_idx` ON `data_commits` (`created_at`);--> statement-breakpoint
CREATE INDEX `data_commits_parent_idx` ON `data_commits` (`parent_id`);--> statement-breakpoint
CREATE INDEX `data_commits_content_hash_idx` ON `data_commits` (`content_hash`);