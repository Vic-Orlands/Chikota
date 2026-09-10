CREATE TABLE "bookmarks_to_tags" (
	"bookmarkId" text NOT NULL,
	"tagId" text NOT NULL,
	CONSTRAINT "bookmarks_to_tags_bookmarkId_tagId_pk" PRIMARY KEY("bookmarkId","tagId")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp,
	CONSTRAINT "widget_access_token_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "isPinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "isRead" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "widgetEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "openedAt" timestamp;--> statement-breakpoint
ALTER TABLE "bookmarks_to_tags" ADD CONSTRAINT "bookmarks_to_tags_bookmarkId_bookmarks_id_fk" FOREIGN KEY ("bookmarkId") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks_to_tags" ADD CONSTRAINT "bookmarks_to_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_access_token" ADD CONSTRAINT "widget_access_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;