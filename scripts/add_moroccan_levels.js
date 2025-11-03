const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'found' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'found' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addMoroccanMiddleSchoolLevels() {
  try {
    console.log('Adding unique constraint on study_levels.name...');

    // First, add unique constraint if it doesn't exist
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'study_levels'
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%name%'
          ) THEN
            ALTER TABLE study_levels ADD CONSTRAINT study_levels_name_unique UNIQUE (name);
            RAISE NOTICE 'Added unique constraint on study_levels.name';
          END IF;
        END $$;
      `
    });

    if (constraintError) {
      console.error('Error adding constraint:', constraintError);
      return;
    }

    console.log('Inserting Moroccan middle school levels...');

    // Insert the middle school levels
    const { data, error: insertError } = await supabase
      .from('study_levels')
      .upsert([
        {
          name: '7ème Année - السنة السابعة',
          description: '7ème année - 1ère année collège / السنة الأولى إعدادي',
          order_index: 1
        },
        {
          name: '8ème Année - السنة الثامنة',
          description: '8ème année - 2ème année collège / السنة الثانية إعدادي',
          order_index: 2
        },
        {
          name: '9ème Année - السنة التاسعة',
          description: '9ème année - 3ème année collège / السنة الثالثة إعدادي',
          order_index: 3
        }
      ], { onConflict: 'name' });

    if (insertError) {
      console.error('Error inserting data:', insertError);
      return;
    }

    console.log('Successfully added Moroccan middle school levels!');

    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('study_levels')
      .select('name, description, order_index')
      .order('order_index');

    if (verifyError) {
      console.error('Error verifying data:', verifyError);
      return;
    }

    console.log('Current study levels:');
    console.table(verifyData);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addMoroccanMiddleSchoolLevels();