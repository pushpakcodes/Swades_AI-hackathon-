import { boolean, pgTable, timestamp, varchar, text } from "drizzle-orm/pg-core";

export const chunks = pgTable("chunks", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sessionId: varchar("session_id", { length: 255 }),
  speaker: varchar("speaker", { length: 255 }),
  transcription: text("transcription"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isAcknowledged: boolean("is_acknowledged").default(false).notNull(),
});
