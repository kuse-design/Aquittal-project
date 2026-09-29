CREATE TYPE "public"."status" AS ENUM('new', 'contacted', 'confirmed', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stockStatus" AS ENUM('in_stock', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "orderItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer,
	"productTitle" varchar(180) NOT NULL,
	"variantLabel" varchar(255) DEFAULT 'Standard' NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"lineTotal" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" varchar(40) NOT NULL,
	"customerName" varchar(180) NOT NULL,
	"customerEmail" varchar(320),
	"customerPhone" varchar(50) NOT NULL,
	"customerNote" text,
	"status" "status" DEFAULT 'new' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"currencyCode" varchar(3) NOT NULL,
	"createdAt" bigint NOT NULL,
	"updatedAt" bigint NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE "productImages" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"url" text NOT NULL,
	"storageKey" varchar(512) NOT NULL,
	"altText" varchar(255),
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(180) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"category" varchar(100),
	"price" numeric(10, 2) NOT NULL,
	"promoPrice" numeric(10, 2),
	"currencyCode" varchar(3) DEFAULT 'USD' NOT NULL,
	"stockStatus" "stockStatus" DEFAULT 'in_stock' NOT NULL,
	"isPublished" integer DEFAULT 1 NOT NULL,
	"sizesJson" text NOT NULL,
	"colorsJson" text NOT NULL,
	"createdAt" bigint NOT NULL,
	"updatedAt" bigint NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(128) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"passwordHash" varchar(255),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "orderItems_orderId_idx" ON "orderItems" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "orders_createdAt_idx" ON "orders" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "productImages_productId_idx" ON "productImages" USING btree ("productId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_openId_unique" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");