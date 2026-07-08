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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const oldLink = 'https://calendar.app.google/4udqNiirkQWn6Pnt5';
        const newLink = 'https://calendar.app.google/Zg1o5bgrSsUdPgtS8';
        if (envContent.includes(oldLink)) {
            envContent = envContent.replace(newLink, oldLink);
            envContent = envContent.split(oldLink).join(newLink);
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('✅ Successfully updated .env with the new booking link!');
        }
        else {
            console.log('⚠️ Old booking link not found in .env. Let\'s check if we can add/modify MEETING_BOOKING_LINK manually...');
            let updated = false;
            const lines = envContent.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('MEETING_BOOKING_LINK=')) {
                    lines[i] = `MEETING_BOOKING_LINK="${newLink}"`;
                    updated = true;
                }
            }
            if (updated) {
                fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
                console.log('✅ Successfully replaced MEETING_BOOKING_LINK in .env!');
            }
            else {
                console.log('❌ Could not locate MEETING_BOOKING_LINK in .env');
            }
        }
    }
    else {
        console.log('❌ .env file does not exist');
    }
}
catch (e) {
    console.error('❌ Error updating .env:', e.message);
}
//# sourceMappingURL=update-env.js.map