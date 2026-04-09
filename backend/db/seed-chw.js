'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CHW_ACCOUNTS = [
  { email: 'chw.demo1@cara.health', password: 'cara2026!', name: 'Amara Diallo' },
  { email: 'chw.demo2@cara.health', password: 'cara2026!', name: 'Kwame Asante' },
  { email: 'supervisor@cara.health', password: 'cara2026!', name: 'Dr. Supervisor' },
];

async function seedCHWs() {
  console.log('Seeding CHW accounts...');
  for (const chw of CHW_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: chw.email,
      password: chw.password,
      email_confirm: true,
      user_metadata: { display_name: chw.name, role: 'chw' },
    });
    if (error) {
      console.error(`\u274C ${chw.email}: ${error.message}`);
    } else {
      console.log(`\u2705 ${chw.email} \u2192 ${data.user.id}`);
      const admin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      await admin.from('chw_profiles').upsert({
        id: data.user.id,
        display_name: chw.name,
      });
    }
  }
  console.log('Done.');
}

seedCHWs().catch(console.error);
