const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "alive",
    alias: ["ping", "bot", "online", "check"],
    react: "🤖",
    desc: "Check if bot is online",
    category: "main",
    filename: __filename,
    usage: ".alive"
},
async (robin, mek, m, { from, pushname, reply, sender, isOwner }) => {
    try {
        // Get bot uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const uptimeString = days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds}s` :
                            hours > 0 ? `${hours}h ${minutes}m ${seconds}s` :
                            `${minutes}m ${seconds}s`;

        // Get memory usage
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024;
        const memoryUsage = `${usedMemory.toFixed(2)}MB / ${totalMemory.toFixed(2)}MB`;

        // Get bot info
        const botNumber = robin.user.id.split(':')[0];
        const version = require('../package.json').version || '1.0.0';

        // Create alive message
        let aliveMessage = config.ALIVE_MSG || "Iam Alive Now!! ★𝐃𝐓𝐙 𝐍𝐎𝐕𝐀 𝐗 𝐌𝐃★ 🤭💗 ආහ් පැටියෝ කොහොමද ?🌝!\n\n🥶ＤＴＺ ＴＥＡＭ🥶";
        
        // Add system info to message
        aliveMessage += `\n\n📊 *System Status*\n`;
        aliveMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        aliveMessage += `🤖 *Bot Name:* ＤＴＺ ＮＯＶＡ Ｘ ＭＤ\n`;
        aliveMessage += `📞 *Bot Number:* ${botNumber}\n`;
        aliveMessage += `⏱️ *Uptime:* ${uptimeString}\n`;
        aliveMessage += `💾 *Memory:* ${memoryUsage}\n`;
        aliveMessage += `📁 *Prefix:* ${config.PREFIX}\n`;
        aliveMessage += `👤 *User:* ${pushname || 'Unknown'}\n`;
        aliveMessage += `🎭 *Mode:* ${config.MODE}\n`;
        aliveMessage += `📦 *Version:* ${version}\n`;
        aliveMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        aliveMessage += `💡 *Use ${config.PREFIX}menu to see all commands*\n`;
        aliveMessage += `📞 *Owner:* ${config.OWNER_NUM}\n\n`;
        aliveMessage += `🥶 *ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ* 🥶`;

        // Send typing indicator
        await robin.sendPresenceUpdate('composing', from);
        
        // Send welcome audio (optional)
        try {
            await robin.sendMessage(from, {
                audio: { 
                    url: "https://github.com/alpha-x-team-ofc/DARK-NOVA-XMD-v1/raw/refs/heads/main/audio/Welcome%20to...mp3"
                },
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (audioError) {
            console.log("Audio not sent:", audioError.message);
        }

        // Send sticker (optional)
        try {
            await robin.sendMessage(from, {
                sticker: { 
                    url: config.ALIVE_IMG || "https://files.catbox.moe/fpyw9m.png"
                }
            }, { quoted: mek });
            
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (stickerError) {
            console.log("Sticker not sent:", stickerError.message);
        }

        // Send main alive message with image
        await robin.sendMessage(from, {
            image: {
                url: config.ALIVE_IMG || "https://files.catbox.moe/fpyw9m.png"
            },
            caption: aliveMessage
        }, { quoted: mek });

        // Send presence update to show online status
        await robin.sendPresenceUpdate('available', from);

    } catch (error) {
        console.error("Alive command error:", error);
        
        // Fallback simple message if everything fails
        try {
            await reply(`🤖 *ＤＴＺ ＮＯＶＡ Ｘ ＭＤ is ALIVE!*\n\nI'm online and ready to help!\n\n🥶ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ🥶`);
        } catch (fallbackError) {
            console.log("Fallback also failed:", fallbackError);
        }
    }
});

// Simple ping command to check response time
cmd({
    pattern: "ping",
    alias: ["speed", "latency"],
    react: "⚡",
    desc: "Check bot response speed",
    category: "main",
    filename: __filename,
    usage: ".ping"
},
async (robin, mek, m, { reply }) => {
    try {
        const start = Date.now();
        const sentMsg = await reply("🏓 Pinging...");
        const end = Date.now();
        const latency = end - start;
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        await reply(`🏓 *PONG!*\n\n` +
                   `⚡ *Speed:* ${latency}ms\n` +
                   `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                   `💾 *Memory:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n` +
                   `🤖 *Status:* Online ✅\n\n` +
                   `🥶ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ🥶`);
                   
    } catch (error) {
        console.error("Ping error:", error);
        reply("❌ Error checking ping");
    }
});

// Bot information command
cmd({
    pattern: "botinfo",
    alias: ["info", "about", "owner"],
    react: "📋",
    desc: "Get bot information",
    category: "main",
    filename: __filename,
    usage: ".botinfo"
},
async (robin, mek, m, { reply }) => {
    try {
        const packageJson = require('../package.json');
        
        let infoText = `🤖 *ＤＴＺ ＮＯＶＡ Ｘ ＭＤ Information*\n\n`;
        infoText += `━━━━━━━━━━━━━━━━━━━━\n`;
        infoText += `📝 *Name:* ${packageJson.name || 'DTZ-NOVA-X-MD'}\n`;
        infoText += `📦 *Version:* ${packageJson.version || '1.0.0'}\n`;
        infoText += `📖 *Description:* ${packageJson.description || 'WhatsApp Bot'}\n`;
        infoText += `📌 *Prefix:* ${config.PREFIX}\n`;
        infoText += `👑 *Owner:* ${config.OWNER_NUM}\n`;
        infoText += `🎭 *Mode:* ${config.MODE}\n`;
        infoText += `📁 *Total Commands:* ${commands.length}\n`;
        
        // Get uptime
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        infoText += `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n`;
        
        // Platform info
        infoText += `🖥️ *Platform:* ${process.platform}\n`;
        infoText += `📚 *Node.js:* ${process.version}\n`;
        
        infoText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        infoText += `💡 *Features:*\n`;
        infoText += `• AI Chat (Gemini)\n`;
        infoText += `• Media Downloader\n`;
        infoText += `• Sticker Creator\n`;
        infoText += `• Group Management\n`;
        infoText += `• And many more...\n\n`;
        infoText += `Use ${config.PREFIX}menu to see all commands\n\n`;
        infoText += `🥶 *ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ* 🥶`;
        
        await reply(infoText);
        
    } catch (error) {
        console.error("Botinfo error:", error);
        reply(`🤖 *ＤＴＺ ＮＯＶＡ Ｘ ＭＤ*\n\n` +
              `Owner: ${config.OWNER_NUM}\n` +
              `Prefix: ${config.PREFIX}\n` +
              `Made by ＤＴＺ ＴＥＡＭ`);
    }
});

// System status command
cmd({
    pattern: "system",
    alias: ["stats", "status", "performance"],
    react: "📊",
    desc: "Check system performance",
    category: "main",
    filename: __filename,
    usage: ".system"
},
async (robin, mek, m, { reply }) => {
    try {
        const os = require('os');
        
        // Uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        // Memory
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024;
        const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);
        
        // System memory
        const totalSysMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeSysMem = os.freemem() / 1024 / 1024 / 1024;
        const usedSysMem = totalSysMem - freeSysMem;
        
        // CPU
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        
        // Platform
        const platform = `${os.platform()} ${os.arch()}`;
        const release = os.release();
        
        let statusText = `📊 *System Status*\n\n`;
        statusText += `━━━━━━━━━━━━━━━━━━━━\n`;
        statusText += `🤖 *Bot Information*\n`;
        statusText += `━━━━━━━━━━━━━━━━━━━━\n`;
        statusText += `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s\n`;
        statusText += `💾 *Memory Usage:* ${memoryPercent}% (${usedMemory.toFixed(2)}MB)\n`;
        statusText += `📁 *Commands Loaded:* ${commands.length}\n`;
        statusText += `📌 *Prefix:* ${config.PREFIX}\n\n`;
        
        statusText += `🖥️ *System Information*\n`;
        statusText += `━━━━━━━━━━━━━━━━━━━━\n`;
        statusText += `💻 *Platform:* ${platform}\n`;
        statusText += `📀 *OS Version:* ${release}\n`;
        statusText += `🧠 *CPU:* ${cpuModel}\n`;
        statusText += `🔢 *Cores:* ${cpuCores}\n`;
        statusText += `💾 *Total RAM:* ${totalSysMem.toFixed(2)} GB\n`;
        statusText += `📊 *Used RAM:* ${usedSysMem.toFixed(2)} GB\n`;
        statusText += `🆓 *Free RAM:* ${freeSysMem.toFixed(2)} GB\n`;
        statusText += `📡 *Node.js:* ${process.version}\n\n`;
        
        statusText += `📈 *Performance*\n`;
        statusText += `━━━━━━━━━━━━━━━━━━━━\n`;
        statusText += `✅ *Status:* Optimal\n`;
        statusText += `⚡ *Response:* Good\n`;
        statusText += `🔧 *Mode:* ${config.MODE}\n\n`;
        
        statusText += `🥶ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ🥶`;
        
        await reply(statusText);
        
    } catch (error) {
        console.error("System command error:", error);
        reply("❌ Error fetching system status");
    }
});
