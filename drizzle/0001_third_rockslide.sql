ALTER TABLE `expenses` ADD `personal` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `expenses_personal_date_idx` ON `expenses` (`personal`,`date`);