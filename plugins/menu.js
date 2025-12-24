const { cmd, commands } = require("../command");
const config = require('../config');

cmd(
  {
    pattern: "menu",
    alias: ["help", "cmd", "commands"], // Fixed typo: "alise" to "alias"
    react: "📋",
    desc: "Get command list",
    category: "main",
    filename: __filename,
  },
  async (robin, mek, m, { from, pushname, reply, isGroup }) => {
    try {
      // Group commands for group chat only
      const groupCommands = ["kick", "add", "promote", "demote", "mute", "unmute", "tagall", "left"];
      const ownerCommands = ["block", "unblock", "restart", "update", "leave"];
      
      // Organize commands by category
      const categories = {};
      
      commands.forEach(cmd => {
        if (cmd.dontAddCommandList) return;
        
        const category = cmd.category || 'misc';
        
        if (!categories[category]) {
          categories[category] = [];
        }
        
        // Check if command should be shown
        let showCommand = true;
        
        // Hide group commands in private chat
        if (!isGroup && groupCommands.includes(cmd.pattern)) {
          showCommand = false;
        }
        
        // Hide owner commands in menu (optional - you can show them too)
        if (ownerCommands.includes(cmd.pattern)) {
          showCommand = false; // Hide owner commands, or keep if you want to show
        }
        
        if (showCommand) {
          categories[category].push({
            pattern: cmd.pattern,
            desc: cmd.desc || 'No description',
            alias: cmd.alias || []
          });
        }
      });

      // Create the menu message
      let menuMessage = `👋 *Hello ${pushname || 'User'}!* 🎉\n\n`;
      menuMessage += `🤖 *Bot Name:* ＤＴＺ ＮＯＶＡ Ｘ ＭＤ\n`;
      menuMessage += `📌 *Prefix:* ${config.PREFIX}\n`;
      menuMessage += `🔢 *Total Commands:* ${commands.length}\n`;
      menuMessage += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`;
      menuMessage += `═══════════════════\n\n`;

      // Add commands by category
      Object.keys(categories).forEach(category => {
        if (categories[category].length > 0) {
          menuMessage += `┏━━❮ *${category.toUpperCase()}* ❯━━\n`;
          
          categories[category].forEach(cmd => {
            const aliases = cmd.alias.length > 0 ? ` (${cmd.alias.join(', ')})` : '';
            menuMessage += `┃ ➤ ${config.PREFIX}${cmd.pattern}${aliases}\n`;
            menuMessage += `┃   ↳ ${cmd.desc}\n`;
          });
          
          menuMessage += `┗━━━━━━━━━━━━━━━━━\n\n`;
        }
      });

      // Add usage instructions
      menuMessage += `═══════════════════\n`;
      menuMessage += `📖 *Usage Examples:*\n`;
      menuMessage += `• ${config.PREFIX}ai hello\n`;
      menuMessage += `• ${config.PREFIX}song baby\n`;
      menuMessage += `• ${config.PREFIX}sticker (reply to image)\n\n`;
      
      // Add footer
      menuMessage += `═══════════════════\n`;
      menuMessage += `⚡ *Need Help?* Contact Owner: ${config.OWNER_NUM}\n`;
      menuMessage += `🏷️ *Mode:* ${config.MODE}\n`;
      menuMessage += `🎭 *Version:* 2.0\n\n`;
      menuMessage += `🥶 *ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ* 🥶\n`;
      menuMessage += `> ＤＴＺ ＮＯＶＡ Ｘ ＭＤ`;

      // Send as image with caption
      await robin.sendMessage(
        from,
        {
          image: { 
            url: config.ALIVE_IMG || "https://files.catbox.moe/fpyw9m.png"
          },
          caption: menuMessage
        },
        { quoted: mek }
      );

    } catch (error) {
      console.error("Menu command error:", error);
      // Fallback to text menu if image fails
      try {
        await reply("📋 *Command List*\n\n" + 
          "*Main:* .alive .menu .ai .system .owner\n" +
          "*Download:* .song .video .fb .movie\n" +
          "*Group:* .kick .add .promote .demote\n" +
          "*Convert:* .sticker .img .tr .tts\n" +
          "*Search:* .google .ytsearch\n\n" +
          "Type: .help [command] for more info"
        );
      } catch (e) {
        reply("❌ Error loading menu. Please try again.");
      }
    }
  }
);

// Optional: Add help command for specific command info
cmd(
  {
    pattern: "help",
    alias: ["info", "cmdinfo"],
    react: "❓",
    desc: "Get help for a specific command",
    category: "main",
    filename: __filename,
    usage: ".help [command]"
  },
  async (robin, mek, m, { q, reply }) => {
    try {
      if (!q) {
        return reply(`❌ Please specify a command.\nExample: ${config.PREFIX}help sticker`);
      }

      const cmdName = q.toLowerCase().trim();
      const command = commands.find(cmd => 
        cmd.pattern === cmdName || 
        (cmd.alias && cmd.alias.includes(cmdName))
      );

      if (!command) {
        return reply(`❌ Command "${q}" not found.\nUse ${config.PREFIX}menu to see all commands.`);
      }

      let helpText = `📖 *Command Help:* ${config.PREFIX}${command.pattern}\n\n`;
      helpText += `📝 *Description:* ${command.desc || 'No description'}\n`;
      
      if (command.alias && command.alias.length > 0) {
        helpText += `🔤 *Aliases:* ${command.alias.join(', ')}\n`;
      }
      
      if (command.category) {
        helpText += `📁 *Category:* ${command.category}\n`;
      }
      
      if (command.usage) {
        helpText += `💡 *Usage:* ${command.usage}\n`;
      } else {
        helpText += `💡 *Usage:* ${config.PREFIX}${command.pattern} [parameters]\n`;
      }
      
      helpText += `\nExample: ${config.PREFIX}${command.pattern} example`;
      
      await reply(helpText);

    } catch (error) {
      console.error("Help command error:", error);
      reply("❌ Error fetching command help.");
    }
  }
);

// Optional: Simple menu for quick view
cmd(
  {
    pattern: "list",
    alias: ["cmds", "shortmenu"],
    react: "📜",
    desc: "Quick command list",
    category: "main",
    filename: __filename
  },
  async (robin, mek, m, { reply, isGroup }) => {
    try {
      let cmdList = "📜 *Quick Command List*\n\n";
      
      // Filter and organize commands
      const mainCmds = commands.filter(cmd => 
        !cmd.dontAddCommandList && 
        cmd.category === 'main'
      ).slice(0, 10);
      
      const dlCmds = commands.filter(cmd => 
        !cmd.dontAddCommandList && 
        cmd.category === 'download'
      ).slice(0, 5);
      
      cmdList += "*Main:*\n";
      mainCmds.forEach(cmd => {
        cmdList += `• ${config.PREFIX}${cmd.pattern}\n`;
      });
      
      cmdList += "\n*Download:*\n";
      dlCmds.forEach(cmd => {
        cmdList += `• ${config.PREFIX}${cmd.pattern}\n`;
      });
      
      if (isGroup) {
        const groupCmds = commands.filter(cmd => 
          !cmd.dontAddCommandList && 
          cmd.category === 'group'
        ).slice(0, 5);
        
        cmdList += "\n*Group:*\n";
        groupCmds.forEach(cmd => {
          cmdList += `• ${config.PREFIX}${cmd.pattern}\n`;
        });
      }
      
      cmdList += `\nUse ${config.PREFIX}menu for full list`;
      
      await reply(cmdList);
      
    } catch (error) {
      reply("📜 *Available Commands:*\n.alive .menu .ai .song .video .sticker .img .tts .owner");
    }
  }
);
