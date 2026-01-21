import { pgTable, text, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull()
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id)
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull()
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt")
});

export const bookmarks = pgTable("bookmarks", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("imageUrl"),
    categoryId: text("categoryId"),
    reminderAt: timestamp("reminderAt"),
    reminderEmail: text("reminderEmail"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const categories = pgTable("categories", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const tags = pgTable("tags", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const bookmarksToTags = pgTable("bookmarks_to_tags", {
    bookmarkId: text("bookmarkId").notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
    tagId: text("tagId").notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.bookmarkId, t.tagId] })
]);

export const bookmarksRelations = relations(bookmarks, ({ many }) => ({
    tags: many(bookmarksToTags)
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    bookmarks: many(bookmarksToTags)
}));

export const bookmarksToTagsRelations = relations(bookmarksToTags, ({ one }) => ({
    bookmark: one(bookmarks, {
        fields: [bookmarksToTags.bookmarkId],
        references: [bookmarks.id]
    }),
    tag: one(tags, {
        fields: [bookmarksToTags.tagId],
        references: [tags.id]
    })
}));
