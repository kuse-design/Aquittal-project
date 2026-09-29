/**
 * Promotes an existing user to the admin role.
 *
 * The admin studio is gated on `users.role = 'admin'`, so the first owner
 * account has to be promoted by hand. Run this after registering:
 *
 *   pnpm db:make-admin you@example.com
 *
 * On Render, run it from the service's Shell tab (which has DATABASE_URL set).
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../../drizzle/schema";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: pnpm db:make-admin <email>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  const updated = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email!))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (updated.length === 0) {
    console.error(`No user found with email "${email}". Register at /register first.`);
    process.exit(1);
  }

  console.log(`Promoted ${updated[0].email} (id ${updated[0].id}) to ${updated[0].role}.`);
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
