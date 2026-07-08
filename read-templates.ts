import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually (matching check-db.ts robust parser)
let dbUrl = '';
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const equalsIdx = trimmedLine.indexOf('=');
      if (equalsIdx !== -1) {
        const key = trimmedLine.slice(0, equalsIdx).trim();
        let value = trimmedLine.slice(equalsIdx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (key === 'DATABASE_URL') {
          dbUrl = value;
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not parse .env file:', e);
}

if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL not found in .env');
  process.exit(1);
}

// Swapping pooler connection to direct PostgreSQL port (5432)
const directDbUrl = dbUrl
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '')
  .replace('&pgbouncer=true', '');

const pool = new Pool({ connectionString: directDbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('🔎 Searching database Settings for Calendly links in email templates...');
  const settingsList = await prisma.settings.findMany();
  settingsList.forEach((s) => {
    if (s.emailTemplate && s.emailTemplate.toLowerCase().includes('calendly')) {
      console.log(`⚠️ Found in Settings ID ${s.id} emailTemplate:\n"${s.emailTemplate}"`);
    }
  });

  console.log('🔎 Searching database Leads for Calendly links in drafted email bodies...');
  const leadsList = await prisma.lead.findMany({
    where: {
      OR: [
        { emailBody: { contains: 'calendly', mode: 'insensitive' } },
        { emailSubject: { contains: 'calendly', mode: 'insensitive' } }
      ]
    }
  });

  leadsList.forEach((l) => {
    console.log(`⚠️ Found in Lead ID ${l.id} (Company: ${l.companyName}, Email: ${l.email}):\nSubject: "${l.emailSubject}"\nBody: "${l.emailBody}"\n---`);
  });

  console.log('✅ Search complete!');
}

run()
  .catch((err) => {
    console.error('❌ Query failed:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
