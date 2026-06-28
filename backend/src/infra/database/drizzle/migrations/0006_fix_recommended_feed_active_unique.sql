DROP INDEX "recommended_feed_user_status_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_feed_user_active_unique" ON "recommended_feed" USING btree ("user_id") WHERE "recommended_feed"."status" = 'active';
