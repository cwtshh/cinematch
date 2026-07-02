CREATE TABLE "user_watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"movie_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_watchlist_user_movie_unique" UNIQUE("user_id","movie_id")
);
--> statement-breakpoint
CREATE TABLE "user_dismissed_movie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"movie_id" uuid NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_dismissed_movie_unique" UNIQUE("user_id","movie_id")
);
--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dismissed_movie" ADD CONSTRAINT "user_dismissed_movie_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dismissed_movie" ADD CONSTRAINT "user_dismissed_movie_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE no action;
