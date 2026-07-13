/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFilePath = path.join(__dirname, '../supabase_setup.sql');

const config = {
  host: process.env.SUPABASE_DB_HOST || 'db.hjvnmnehhbbgncrxueje.supabase.co',
  port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
  user: process.env.SUPABASE_DB_USER || 'postgres',
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

if (!config.password) {
  console.error('[FATAL ERROR] SUPABASE_DB_PASSWORD is missing in your environment/dotenv configuration.');
  process.exit(1);
}

async function runMigrations() {
  console.log('[DATABASE] Connecting to Supabase PostgreSQL...');
  const client = new pg.Client(config);
  
  try {
    await client.connect();
    console.log('[DATABASE] Connected successfully!');

    // Read the SQL script
    console.log('[DATABASE] Reading migration script: supabase_setup.sql...');
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');

    // Run the migration SQL queries
    console.log('[DATABASE] Running SQL migrations...');
    await client.query(sql);
    console.log('[DATABASE] SQL Migrations completed successfully!');

    // Handle existing admin@valportal.com user
    console.log('[DATABASE] Checking if admin@valportal.com user exists in auth.users...');
    const authRes = await client.query("SELECT id FROM auth.users WHERE email = 'admin@valportal.com'");
    
    if (authRes.rows.length > 0) {
      const adminUserId = authRes.rows[0].id;
      console.log(`[DATABASE] Found existing admin user with ID: ${adminUserId}`);
      
      // Upsert into public.profiles table
      await client.query(`
        INSERT INTO public.profiles (id, username, email, role, status) 
        VALUES ($1, 'ADMIN', 'admin@valportal.com', 'ADMIN', 'ACTIVE')
        ON CONFLICT (id) 
        DO UPDATE SET role = 'ADMIN', status = 'ACTIVE'
      `, [adminUserId]);
      
      console.log('[DATABASE] Admin user profile row initialized successfully!');
    } else {
      console.log('[DATABASE] Admin user not found in auth.users. Registering now via Supabase Auth API...');
      
      // Use service role client to create the user directly (bypassing confirmation)
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hjvnmnehhbbgncrxueje.supabase.co';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in .env file.');
      }
      
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD is missing in your environment configuration.');
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: 'admin@valportal.com',
        password: adminPassword,
        email_confirm: true,
        user_metadata: { username: 'ADMIN' }
      });

      if (error) {
        throw error;
      }

      console.log('[AUTH] Admin user account created successfully via admin client!');
      
      // Upsert profile row just in case
      await client.query(`
        INSERT INTO public.profiles (id, username, email, role, status) 
        VALUES ($1, 'ADMIN', 'admin@valportal.com', 'ADMIN', 'ACTIVE')
        ON CONFLICT (id) 
        DO UPDATE SET role = 'ADMIN', status = 'ACTIVE'
      `, [data.user.id]);
      
      console.log('[DATABASE] Admin profile row created!');
    }

    console.log('\n======================================================');
    console.log('[COMPLETE] DATABASE AND ADMIN ACCOUNT SYNCED SUCCESSFULLY!');
    console.log('You can now log in at http://localhost:3000');
    console.log('Email: admin@valportal.com');
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'Check your ADMIN_PASSWORD env variable'}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('[FATAL ERROR] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
