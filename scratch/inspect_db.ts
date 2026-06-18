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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing URL or service key in env:', env);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
  console.log('Inspecting Supabase Database at:', supabaseUrl);
  
  // Test profiles table columns
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying profiles:', error);
  } else {
    console.log('Profiles table exists. Sample row:', data);
  }

  // List auth users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error listing auth users:', usersError);
  } else {
    console.log(`Auth users count: ${usersData.users.length}`);
    console.log('Auth users details:');
    usersData.users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.created_at}`);
    });
  }
}

inspect();
