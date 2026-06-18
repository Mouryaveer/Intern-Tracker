import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixProfiles() {
  console.log('Fixing profiles in Supabase...');

  const usersToSetup = [
    {
      id: 'b47518c8-9670-4ca4-9be3-b72d095ece75',
      email: 'mouryasreesailam@gmail.com',
      name: 'Mouryaveer',
      role: 'admin',
      password: 'admin123',
      must_reset_password: false,
    },
    {
      id: '76aad2cd-568f-4f26-94c5-12eba31192f5',
      email: 'hanush@turn2law.in',
      name: 'Hanush Singh R',
      role: 'admin',
      password: 'admin123',
      must_reset_password: false,
    },
    {
      id: 'f825980b-a589-4be7-884e-59019a874d79',
      email: 'priya@turn2law.in',
      name: 'Priya Sharma',
      role: 'lead',
      password: 'lead123',
      must_reset_password: false,
    },
    {
      id: '94aa705a-8145-47ab-b2db-c77c5cb9873c',
      email: 'kavya@turn2law.in',
      name: 'Kavya Iyer',
      role: 'intern',
      password: 'temp123',
      must_reset_password: true,
    }
  ];

  for (const u of usersToSetup) {
    // 1. Reset password
    const { error: passError } = await supabase.auth.admin.updateUserById(u.id, {
      password: u.password,
    });

    if (passError) {
      console.error(`Error resetting password for ${u.email}:`, passError.message);
    } else {
      console.log(`Password reset successfully for ${u.email}`);
    }

    // 2. Insert profile using existing columns only (no avatar_url)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: 'active',
      must_reset_password: u.must_reset_password,
    }, { onConflict: 'id' });

    if (profileError) {
      console.error(`Error inserting profile for ${u.email}:`, profileError.message);
    } else {
      console.log(`Profile inserted successfully for ${u.email}`);
    }
  }
}

fixProfiles();
