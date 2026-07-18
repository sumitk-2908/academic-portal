import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local if present
dotenv.config({ path: '.env.local' });

async function globalSetup() {
  console.log('Running global setup to seed test users...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found. Skipping user seeding.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testUsers = [
    { email: 'testuser@example.com', password: 'password123', role: 'student' },
    { email: 'admin@example.com', password: 'adminpass123', role: 'admin' },
  ];

  for (const user of testUsers) {
    // Attempt to sign up the user. 
    // Note: If using the anon key, this requires email confirmation to be disabled in Supabase,
    // or we'd need the service_role_key to bypass confirmation.
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          role: user.role, // Custom user metadata
          full_name: `Test ${user.role}`,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.status === 422) {
        console.log(`✅ User ${user.email} already exists.`);
      } else {
        console.error(`❌ Failed to seed user ${user.email}:`, error.message);
      }
    } else {
      console.log(`✅ Successfully seeded user: ${user.email}`);
    }
  }

  console.log('Global setup complete.');
}

export default globalSetup;
