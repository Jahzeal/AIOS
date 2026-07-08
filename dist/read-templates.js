"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let dbUrl = '';
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split(/\r?\n/)) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#'))
                continue;
            const equalsIdx = trimmedLine.indexOf('=');
            if (equalsIdx !== -1) {
                const key = trimmedLine.slice(0, equalsIdx).trim();
                let value = trimmedLine.slice(equalsIdx + 1).trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                if (key === 'DATABASE_URL') {
                    dbUrl = value;
                }
            }
        }
    }
}
catch (e) {
    console.warn('Could not parse .env file:', e);
}
if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
}
const directDbUrl = dbUrl
    .replace(':6543', ':5432')
    .replace('?pgbouncer=true', '')
    .replace('&pgbouncer=true', '');
const pool = new pg_1.Pool({ connectionString: directDbUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
//# sourceMappingURL=read-templates.js.map