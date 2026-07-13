/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hjvnmnehhbbgncrxueje.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GXUOJJGm133lK3Ys4b28uA_O4ghE-BA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerAdmin() {
  const email = 'admin@valportal.com';
  const password = process.env.ADMIN_PASSWORD;
  const username = 'ADMIN';

  if (!password) {
    console.error('[ERROR] ADMIN_PASSWORD is missing in your environment configuration.');
    process.exit(1);
  }

  console.log(`[AUTH] Registering admin user: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  });

  if (error) {
    console.error('[ERROR] Sign Up failed:', error.message);
    process.exit(1);
  }

  console.log('[SUCCESS] User created successfully!');
  console.log('User ID:', data.user?.id);
  console.log('Email:', data.user?.email);

  // Try creating profile record
  try {
    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: data.user.id,
        username,
        email,
        role: 'ADMIN'
      }
    ]);
    if (profileError) {
      console.warn('[WARNING] Profiles table insert failed (probably because the table does not exist yet):', profileError.message);
      console.log('Please copy-paste the SQL script into your Supabase SQL Editor first, then run this script again!');
    } else {
      console.log('[SUCCESS] Profile row created with ADMIN role!');
    }
  } catch (err) {
    console.warn('[WARNING] Profiles table insert failed:', err.message);
  }

  process.exit(0);
}

registerAdmin();
