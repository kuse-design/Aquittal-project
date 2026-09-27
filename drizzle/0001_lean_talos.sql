CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productTitle` varchar(180) NOT NULL,
	`variantLabel` varchar(255) NOT NULL DEFAULT 'Standard',
	`unitPrice` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL,
	`lineTotal` decimal(10,2) NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(40) NOT NULL,
	`customerName` varchar(180) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(50) NOT NULL,
	`customerNote` text,
	`status` enum('new','contacted','confirmed','fulfilled','cancelled') NOT NULL DEFAULT 'new',
	`total` decimal(10,2) NOT NULL,
	`currencyCode` varchar(3) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `productImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`url` varchar(1024) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`altText` varchar(255),
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `productImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`description` text,
	`category` varchar(100),
	`price` decimal(10,2) NOT NULL,
	`promoPrice` decimal(10,2),
	`currencyCode` varchar(3) NOT NULL DEFAULT 'USD',
	`stockStatus` enum('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
	`isPublished` int NOT NULL DEFAULT 1,
	`sizesJson` text NOT NULL,
	`colorsJson` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
