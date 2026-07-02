DROP INDEX "recommended_feed_user_status_unique";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "movie" ADD COLUMN "release_date" date;--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_feed_user_active_unique" ON "recommended_feed" USING btree ("user_id") WHERE "recommended_feed"."status" = 'active';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");