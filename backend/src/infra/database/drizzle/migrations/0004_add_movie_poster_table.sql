CREATE TABLE "movie_poster_map" (
	"movie_id" uuid PRIMARY KEY NOT NULL,
	"source_movie_id" integer NOT NULL,
	"tmdb_id" integer NOT NULL,
	"poster_path" text,
	"backdrop_path" text,
	"matched_title" text,
	"matched_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movie_poster_map" ADD CONSTRAINT "movie_poster_map_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "movie_poster_map_tmdb_id_key" ON "movie_poster_map" USING btree ("tmdb_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movie_poster_map_source_movie_id_key" ON "movie_poster_map" USING btree ("source_movie_id");--> statement-breakpoint
CREATE INDEX "movie_poster_map_matched_title_idx" ON "movie_poster_map" USING btree ("matched_title");