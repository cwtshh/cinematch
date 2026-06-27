CREATE TYPE "public"."recommended_feed_item_status" AS ENUM('pending', 'rated', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."recommended_feed_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "recommended_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "recommended_feed_status" DEFAULT 'active' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "recommended_feed_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"status" "recommended_feed_item_status" DEFAULT 'pending' NOT NULL,
	"user_rating" real,
	"rated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "recommended_feed" ADD CONSTRAINT "recommended_feed_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommended_feed_item" ADD CONSTRAINT "recommended_feed_item_feed_id_recommended_feed_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."recommended_feed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommended_feed_item" ADD CONSTRAINT "recommended_feed_item_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_feed_user_status_unique" ON "recommended_feed" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_feed_item_feed_rank_unique" ON "recommended_feed_item" USING btree ("feed_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_feed_item_feed_movie_unique" ON "recommended_feed_item" USING btree ("feed_id","movie_id");