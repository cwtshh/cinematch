CREATE TABLE "user_movie_rating" (
	"user_id" text NOT NULL,
	"movie_id" uuid NOT NULL,
	"rating" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_movie_rating_user_id_movie_id_pk" PRIMARY KEY("user_id","movie_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_completed_initial_movie_rating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_movie_rating" ADD CONSTRAINT "user_movie_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_movie_rating" ADD CONSTRAINT "user_movie_rating_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_movie_rating_user_id_idx" ON "user_movie_rating" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_movie_rating_movie_id_idx" ON "user_movie_rating" USING btree ("movie_id");