import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node make-admin.mjs your-email@example.com");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const result = await client.query(
  `UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, email, role;`,
  [email]
);

if (result.rowCount === 0) {
  console.log(`No user found with email: ${email}`);
} else {
  console.log("Updated:", result.rows[0]);
}

await client.end();
