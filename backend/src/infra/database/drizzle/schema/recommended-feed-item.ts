import {
  pgEnum,
  pgTable,
  real,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { recommendedFeed } from "./recommended-feed";
import { movie } from "./movie";

export const recommendedFeedItemStatusEnum = pgEnum(
  "recommended_feed_item_status",
  ["pending", "rated", "dismissed"],
);

export const recommendedFeedItem = pgTable(
  "recommended_feed_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => recommendedFeed.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    status: recommendedFeedItemStatusEnum("status")
      .notNull()
      .default("pending"),
    userRating: real("user_rating"),
    ratedAt: timestamp("rated_at", { withTimezone: true }),
  },
  (table) => ({
    feedRankUnique: uniqueIndex("recommended_feed_item_feed_rank_unique").on(
      table.feedId,
      table.rank,
    ),
    feedMovieUnique: uniqueIndex("recommended_feed_item_feed_movie_unique").on(
      table.feedId,
      table.movieId,
    ),
  }),
);
