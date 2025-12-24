const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { cmd } = require('../command');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Default auto-response data files
const defaultData = {
    'autovoice.json': {},
    'autosticker.json': {},
    'autoreply.json': {}
};

// Initialize data files if they don't exist
Object.keys(defaultData).forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData[file], null, 2));
    }
});

// Helper function to load JSON data with error handling
function loadJSONData(filename) {
    try {
        const filePath = path.join(dataDir, filename);
        if (!fs.existsSync(filePath)) {
            return {};
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) {
            return {};
        }
        
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return {};
    }
}

// Auto Voice Responder
cmd({
    on: "body",
    desc: "Auto voice responses",
    dontAddCommandList: true,
    filename: __filename
}, async (robin, mek, m, { from, body, isOwner, sender }) => {
    try {
        // Skip if auto voice is disabled
        if (config.AUTO_VOICE !== 'true' && config.AUTO_VOICE !== true) {
            return;
        }

        // Skip bot messages and owner if configured
        if (isOwner && config.SKIP_OWNER === 'true') {
            return;
        }

        const data = loadJSONData('autovoice.json');
        
        // Check for exact match
        const normalizedBody = body.toLowerCase().trim();
        
        for (const trigger in data) {
            const normalizedTrigger = trigger.toLowerCase().trim();
            
            // Exact match
            if (normalizedBody === normalizedTrigger) {
                const audioUrl = data[trigger];
                
                if (audioUrl && audioUrl.startsWith('http')) {
                    await robin.sendPresenceUpdate('recording', from);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    await robin.sendMessage(from, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mpeg',
                        ptt: true
                    }, { quoted: mek });
                    
                    console.log(`Auto voice sent for: "${body}"`);
                }
                return;
            }
        }
        
    } catch (error) {
        console.error('Auto voice error:', error);
    }
});

// Auto Sticker Responder
cmd({
    on: "body",
    desc: "Auto sticker responses",
    dontAddCommandList: true,
    filename: __filename
}, async (robin, mek, m, { from, body, isOwner }) => {
    try {
        // Skip if auto sticker is disabled
        if (config.AUTO_STICKER !== 'true' && config.AUTO_STICKER !== true) {
            return;
        }

        // Skip bot messages and owner if configured
        if (isOwner && config.SKIP_OWNER === 'true') {
            return;
        }

        const data = loadJSONData('autosticker.json');
        
        // Check for exact match
        const normalizedBody = body.toLowerCase().trim();
        
        for (const trigger in data) {
            const normalizedTrigger = trigger.toLowerCase().trim();
            
            // Exact match
            if (normalizedBody === normalizedTrigger) {
                const stickerUrl = data[trigger];
                
                if (stickerUrl && stickerUrl.startsWith('http')) {
                    await robin.sendMessage(from, {
                        sticker: { url: stickerUrl }
                    }, { quoted: mek });
                    
                    console.log(`Auto sticker sent for: "${body}"`);
                }
                return;
            }
        }
        
    } catch (error) {
        console.error('Auto sticker error:', error);
    }
});

// Auto Text Reply
cmd({
    on: "body",
    desc: "Auto text responses",
    dontAddCommandList: true,
    filename: __filename
}, async (robin, mek, m, { from, body, isOwner, reply }) => {
    try {
        // Skip if auto reply is disabled
        if (config.AUTO_REPLY !== 'true' && config.AUTO_REPLY !== true) {
            return;
        }

        // Skip bot messages and owner if configured
        if (isOwner && config.SKIP_OWNER === 'true') {
            return;
        }

        const data = loadJSONData('autoreply.json');
        
        // Check for exact match
        const normalizedBody = body.toLowerCase().trim();
        
        for (const trigger in data) {
            const normalizedTrigger = trigger.toLowerCase().trim();
            
            // Exact match
            if (normalizedBody === normalizedTrigger) {
                const response = data[trigger];
                
                if (response && typeof response === 'string') {
                    await reply(response);
                    console.log(`Auto reply sent for: "${body}"`);
                }
                return;
            }
        }
        
    } catch (error) {
        console.error('Auto reply error:', error);
    }
});

// Command to manage auto-responses
cmd({
    pattern: "autoresponse",
    alias: ["autores", "ar"],
    react: "🤖",
    desc: "Manage auto-responses",
    category: "owner",
    filename: __filename,
    usage: ".autoresponse [add/remove/list] [type] [trigger] [response]"
}, async (robin, mek, m, { q, isOwner, reply }) => {
    try {
        if (!isOwner) {
            return reply("❌ Only owner can manage auto-responses!");
        }

        const args = q.split(' ');
        const action = args[0]?.toLowerCase();
        const type = args[1]?.toLowerCase();
        const trigger = args.slice(2, -1).join(' ');
        const response = args[args.length - 1];

        if (!action || !['add', 'remove', 'list', 'help'].includes(action)) {
            return reply(
                `📋 *Auto-Response Management*\n\n` +
                `Usage:\n` +
                `${config.PREFIX}autoresponse add [type] [trigger] [response/url]\n` +
                `${config.PREFIX}autoresponse remove [type] [trigger]\n` +
                `${config.PREFIX}autoresponse list [type]\n\n` +
                `Types: voice, sticker, reply\n` +
                `Examples:\n` +
                `${config.PREFIX}autoresponse add voice hello https://example.com/hello.mp3\n` +
                `${config.PREFIX}autoresponse add reply hi Hello there!\n` +
                `${config.PREFIX}autoresponse add sticker lol https://example.com/funny.webp`
            );
        }

        if (action === 'list') {
            const type = args[1] || 'all';
            
            if (type === 'all') {
                let listText = `📋 *All Auto-Responses*\n\n`;
                
                ['autovoice', 'autosticker', 'autoreply'].forEach(fileType => {
                    const data = loadJSONData(`${fileType}.json`);
                    const count = Object.keys(data).length;
                    listText += `*${fileType.toUpperCase()}*: ${count} responses\n`;
                });
                
                return reply(listText);
            }
            
            const filename = `auto${type}.json`;
            if (!['voice', 'sticker', 'reply'].includes(type)) {
                return reply("❌ Invalid type! Use: voice, sticker, or reply");
            }
            
            const data = loadJSONData(filename);
            
            if (Object.keys(data).length === 0) {
                return reply(`📭 No auto-${type} responses configured.`);
            }
            
            let listText = `📋 *Auto-${type.toUpperCase()} Responses*\n\n`;
            Object.entries(data).forEach(([key, value], index) => {
                listText += `${index + 1}. *Trigger:* "${key}"\n`;
                listText += `   *Response:* ${value.length > 50 ? value.substring(0, 50) + '...' : value}\n\n`;
            });
            
            return reply(listText);
        }

        if (action === 'add') {
            if (!type || !trigger || !response) {
                return reply("❌ Missing parameters! Use: .autoresponse add [type] [trigger] [response]");
            }

            const filename = `auto${type}.json`;
            if (!['voice', 'sticker', 'reply'].includes(type)) {
                return reply("❌ Invalid type! Use: voice, sticker, or reply");
            }

            const data = loadJSONData(filename);
            
            // Check if trigger already exists
            if (data[trigger]) {
                return reply(`⚠️ Trigger "${trigger}" already exists. Use remove first.`);
            }
            
            // Validate response based on type
            if (type === 'voice' || type === 'sticker') {
                if (!response.startsWith('http')) {
                    return reply(`❌ ${type} response must be a valid URL starting with http/https`);
                }
            }
            
            // Add new response
            data[trigger] = response;
            fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
            
            return reply(`✅ Auto-${type} response added!\nTrigger: "${trigger}"`);
        }

        if (action === 'remove') {
            if (!type || !trigger) {
                return reply("❌ Missing parameters! Use: .autoresponse remove [type] [trigger]");
            }

            const filename = `auto${type}.json`;
            if (!['voice', 'sticker', 'reply'].includes(type)) {
                return reply("❌ Invalid type! Use: voice, sticker, or reply");
            }

            const data = loadJSONData(filename);
            
            if (!data[trigger]) {
                return reply(`❌ Trigger "${trigger}" not found in auto-${type} responses.`);
            }
            
            // Remove response
            delete data[trigger];
            fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
            
            return reply(`✅ Auto-${type} response removed!\nTrigger: "${trigger}"`);
        }

    } catch (error) {
        console.error('Auto-response management error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});

// Import/Export auto-responses
cmd({
    pattern: "autobackup",
    alias: ["aresbackup"],
    desc: "Backup or restore auto-responses",
    category: "owner",
    filename: __filename,
    usage: ".autobackup [save/load]"
}, async (robin, mek, m, { q, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("❌ Owner only!");
        
        const action = q?.toLowerCase();
        
        if (action === 'save' || action === 'backup') {
            // Create backup
            const backup = {};
            
            ['autovoice', 'autosticker', 'autoreply'].forEach(type => {
                backup[type] = loadJSONData(`${type}.json`);
            });
            
            const backupFile = path.join(dataDir, 'autoresponse_backup.json');
            fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
            
            return reply(`✅ Auto-response backup saved!\nLocation: ${backupFile}`);
        }
        
        if (action === 'load' || action === 'restore') {
            const backupFile = path.join(dataDir, 'autoresponse_backup.json');
            
            if (!fs.existsSync(backupFile)) {
                return reply("❌ No backup file found!");
            }
            
            const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            
            Object.entries(backup).forEach(([type, data]) => {
                fs.writeFileSync(path.join(dataDir, `${type}.json`), JSON.stringify(data, null, 2));
            });
            
            return reply("✅ Auto-responses restored from backup!");
        }
        
        reply(`Usage: ${config.PREFIX}autobackup save/load`);
        
    } catch (error) {
        console.error('Auto-backup error:', error);
        reply("❌ Backup error!");
    }
});
