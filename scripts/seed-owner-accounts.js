#!/usr/bin/env node
// Seed owner and reserved operator accounts for ABC-IO v5.0.0.
// Run after the database is up, e.g.:
//   node scripts/seed-owner-accounts.js
//
// IMPORTANT: This script prints temporary passwords to stdout. Rotate them
// immediately after deployment. Do not commit this output.

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/abc_io';
const SALT_ROUNDS = 12;

function generatePassword(length = 24) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

async function ensureAccount(pool, { email, accountName, slug, tier, role, status }) {
  const password = generatePassword();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const accountResult = await pool.query(
    `INSERT INTO accounts (name, slug, tier, status, billing_email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       billing_email = EXCLUDED.billing_email,
       updated_at = now()
     RETURNING id`,
    [accountName, slug, tier, 'active', email]
  );
  const accountId = accountResult.rows[0].id;

  const userResult = await pool.query(
    `INSERT INTO users (account_id, email, password_hash, first_name, last_name, role, email_verified, status)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7)
     ON CONFLICT (email) DO UPDATE SET
       account_id = EXCLUDED.account_id,
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       email_verified = true,
       status = EXCLUDED.status,
       updated_at = now()
     RETURNING id`,
    [accountId, email, hash, accountName.split(' ')[0] || 'User', 'Account', role, status]
  );

  // Ensure family preferences row exists
  await pool.query(
    `INSERT INTO family_preferences (account_id) VALUES ($1)
     ON CONFLICT (account_id) DO NOTHING`,
    [accountId]
  );

  // Provision the free Global Sensory Interface Communications product
  await pool.query(
    `INSERT INTO account_products (account_id, product_id, status, current_period_start, current_period_end)
     SELECT $1, p.id, 'active', now(), now() + interval '100 years'
     FROM products p WHERE p.slug = 'global-sensory-interface-communications'
     ON CONFLICT (account_id, product_id) DO UPDATE SET status = 'active', updated_at = now()`,
    [accountId]
  );

  return { userId: userResult.rows[0].id, accountId, password };
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const owner = await ensureAccount(pool, {
      email: 'cporreca@abc-io.com',
      accountName: 'Owner Account',
      slug: 'owner-abc-io',
      tier: 'free',
      role: 'owner',
      status: 'active'
    });

    const operator = await ensureAccount(pool, {
      email: 'cplexmath@abc-io.com',
      accountName: 'System Operator',
      slug: 'system-operator',
      tier: 'enterprise',
      role: 'owner',
      status: 'deactivated'
    });

    console.log('\n========================================');
    console.log('ABC-IO Owner/Operator Accounts Seeded');
    console.log('========================================');
    console.log(`Owner Login:    cporreca@abc-io.com`);
    console.log(`Owner Password: ${owner.password}`);
    console.log(`Owner User ID:  ${owner.userId}`);
    console.log(`Owner Acct ID:  ${owner.accountId}`);
    console.log('');
    console.log(`Operator Login:    cplexmath@abc-io.com`);
    console.log(`Operator Password: ${operator.password}`);
    console.log(`Operator User ID:  ${operator.userId}`);
    console.log(`Operator Acct ID:  ${operator.accountId}`);
    console.log('Status: deactivated (reserved system operator)');
    console.log('========================================');
    console.log('WARNING: These temporary passwords were printed to stdout.');
    console.log('Rotate them immediately and never store them in Git.');
    console.log('========================================\n');
  } catch (err) {
    console.error('Failed to seed accounts:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
