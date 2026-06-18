CREATE TABLE "user_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"era" text NOT NULL,
	"popularity" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preference_genre" (
	"user_id" text NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "user_preference_genre_user_id_genre_id_pk" PRIMARY KEY("user_id","genre_id")
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference_genre" ADD CONSTRAINT "user_preference_genre_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference_genre" ADD CONSTRAINT "user_preference_genre_genre_id_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_preference_genre_user_id_idx" ON "user_preference_genre" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_preference_genre_genre_id_idx" ON "user_preference_genre" USING btree ("genre_id");