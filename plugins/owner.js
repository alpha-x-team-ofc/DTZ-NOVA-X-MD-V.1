const { cmd } = require('../command');

cmd({
    pattern: "block",
    react: "⚠️",
    alias: ["ban"],
    desc: "Block a user instantly.",
    category: "owner",
    filename: __filename,
    usage: "Reply to a user's message with .block"
},
async (robin, mek, m, { quoted, reply, isOwner, sender }) => {
    try {
        // Check if the user is the bot owner
        if (!isOwner) return reply("⚠️ Only the owner can use this command!");

        // Check if the command is used on a quoted message
        if (!quoted) return reply("⚠️ Please reply to the user's message to block them!");

        // Extract the target user from the quoted message
        const target = quoted.sender || quoted.participant;

        // Block the target user
        await robin.updateBlockStatus(target, 'block');

        // Confirm success
        return reply(`✅ Successfully blocked: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Block Error:", e);
        return reply(`❌ Failed to block the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "unblock",
    react: "✅",
    alias: ["unban"],
    desc: "Unblock a user.",
    category: "owner",
    filename: __filename,
    usage: "Reply to a user's message with .unblock"
},
async (robin, mek, m, { quoted, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("⚠️ Only the owner can use this command!");
        if (!quoted) return reply("⚠️ Please reply to the user's message to unblock them!");

        const target = quoted.sender || quoted.participant;
        await robin.updateBlockStatus(target, 'unblock');
        
        return reply(`✅ Successfully unblocked: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Unblock Error:", e);
        return reply(`❌ Failed to unblock the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "kick",
    alias: ["remove", "ban"],
    react: "👢",
    desc: "Remove a mentioned user from the group.",
    category: "group",
    filename: __filename,
    usage: "Reply to a user's message with .kick"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply, quoted }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user issuing the command is an admin
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        // Ensure a user is mentioned
        if (!quoted) return reply("⚠️ Please reply to the user's message you want to kick!");

        // Get the target user to remove
        const target = quoted.sender || quoted.participant;
        
        if (!target) return reply("⚠️ Could not identify the user to kick!");

        // Ensure the target is not another admin (unless bot owner)
        const groupMetadata = await robin.groupMetadata(from);
        const participants = groupMetadata.participants;
        const targetParticipant = participants.find(p => p.id === target);
        
        if (targetParticipant && (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin')) {
            return reply("⚠️ I cannot remove another admin from the group!");
        }

        // Kick the target user
        await robin.groupParticipantsUpdate(from, [target], "remove");

        // Confirm the action
        return reply(`✅ Successfully removed: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Kick Error:", e);
        reply(`❌ Failed to remove the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "left",
    alias: ["leave", "exit"],
    react: "👋",
    desc: "Leave the current group.",
    category: "owner",
    filename: __filename,
    usage: ".left"
},
async (robin, mek, m, { from, isGroup, isOwner, reply }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user is the bot owner
        if (!isOwner) return reply("⚠️ Only the owner can use this command!");

        // Send a goodbye message
        await reply("👋 Goodbye everyone! Leaving the group...");
        
        // Wait a moment before leaving
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Leave the group
        await robin.groupLeave(from);

    } catch (e) {
        console.error("Leave Error:", e);
        reply(`❌ Failed to leave the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "mute",
    alias: ["silence", "lock"],
    react: "🔇",
    desc: "Set group chat to admin-only messages.",
    category: "group",
    filename: __filename,
    usage: ".mute"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user is an admin
        if (!isAdmins) return reply("⚠️ This command is only for group admins!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        // Set the group to admin-only
        await robin.groupSettingUpdate(from, 'announcement');

        // Confirm the action
        return reply("🔇 Group has been muted. Only admins can send messages now!");
    } catch (e) {
        console.error("Mute Error:", e);
        reply(`❌ Failed to mute the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "unmute",
    alias: ["unlock"],
    react: "🔊",
    desc: "Allow everyone to send messages in the group.",
    category: "group",
    filename: __filename,
    usage: ".unmute"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user is an admin
        if (!isAdmins) return reply("⚠️ This command is only for group admins!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        // Set the group to everyone can message
        await robin.groupSettingUpdate(from, 'not_announcement');

        // Confirm the action
        return reply("🔊 Group has been unmuted. Everyone can send messages now!");
    } catch (e) {
        console.error("Unmute Error:", e);
        reply(`❌ Failed to unmute the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "add",
    alias: ["invite"],
    react: "➕",
    desc: "Add a user to the group.",
    category: "group",
    filename: __filename,
    usage: ".add [phone number] or reply to user's message"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply, args, quoted }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user issuing the command is an admin
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        let target;
        
        // If replying to a message, get that user
        if (quoted) {
            target = quoted.sender || quoted.participant;
        } 
        // If phone number is provided as argument
        else if (args[0]) {
            // Parse the phone number and ensure it's in the correct format
            target = args[0].replace(/[^0-9]/g, ''); // Remove non-numeric characters
            if (!target.startsWith('+')) target = target; // Remove leading + if present
            target = target + '@s.whatsapp.net';
        } 
        else {
            return reply("⚠️ Please provide a phone number or reply to a user's message!");
        }

        // Validate the target format
        if (!target.includes('@s.whatsapp.net')) {
            target = target + '@s.whatsapp.net';
        }

        // Check if user is already in the group
        const groupMetadata = await robin.groupMetadata(from);
        const participants = groupMetadata.participants.map(p => p.id);
        
        if (participants.includes(target)) {
            return reply("⚠️ This user is already in the group!");
        }

        // Add the user to the group
        await robin.groupParticipantsUpdate(from, [target], "add");

        // Confirm success
        return reply(`✅ Successfully added: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Add Error:", e);
        reply(`❌ Failed to add the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "demote",
    alias: ["member"],
    react: "⬇️",
    desc: "Remove admin privileges from a mentioned user.",
    category: "group",
    filename: __filename,
    usage: "Reply to an admin's message with .demote"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply, quoted }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user issuing the command is an admin
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        // Ensure a user is mentioned
        if (!quoted) return reply("⚠️ Please reply to the user's message you want to demote!");

        // Get the target user to demote
        const target = quoted.sender || quoted.participant;
        
        if (!target) return reply("⚠️ Could not identify the user!");

        // Check if trying to demote self
        const sender = mek.key.fromMe ? robin.user.id : mek.key.participant || mek.key.remoteJid;
        if (target === sender) {
            return reply("⚠️ You cannot demote yourself!");
        }

        // Check if target is an admin
        const groupMetadata = await robin.groupMetadata(from);
        const targetParticipant = groupMetadata.participants.find(p => p.id === target);
        
        if (!targetParticipant) {
            return reply("⚠️ User not found in the group!");
        }
        
        if (targetParticipant.admin !== 'admin' && targetParticipant.admin !== 'superadmin') {
            return reply("⚠️ The mentioned user is not an admin!");
        }

        // Demote the target user
        await robin.groupParticipantsUpdate(from, [target], "demote");

        // Confirm the action
        return reply(`⬇️ Successfully demoted: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Demote Error:", e);
        reply(`❌ Failed to demote the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "promote",
    alias: ["admin", "makeadmin"],
    react: "⬆️",
    desc: "Grant admin privileges to a mentioned user.",
    category: "group",
    filename: __filename,
    usage: "Reply to a user's message with .promote"
},
async (robin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply, quoted }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");

        // Check if the user issuing the command is an admin
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");

        // Check if the bot is an admin
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        // Ensure a user is mentioned
        if (!quoted) return reply("⚠️ Please reply to the user's message you want to promote!");

        // Get the target user to promote
        const target = quoted.sender || quoted.participant;
        
        if (!target) return reply("⚠️ Could not identify the user!");

        // Check if target is already an admin
        const groupMetadata = await robin.groupMetadata(from);
        const targetParticipant = groupMetadata.participants.find(p => p.id === target);
        
        if (!targetParticipant) {
            return reply("⚠️ User not found in the group!");
        }
        
        if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
            return reply("⚠️ The mentioned user is already an admin!");
        }

        // Promote the target user to admin
        await robin.groupParticipantsUpdate(from, [target], "promote");

        // Confirm the action
        return reply(`⬆️ Successfully promoted @${target.split('@')[0]} to admin!`);
    } catch (e) {
        console.error("Promote Error:", e);
        reply(`❌ Failed to promote the user. Error: ${e.message}`);
    }
});

// Additional useful command
cmd({
    pattern: "tagall",
    alias: ["mention", "everyone"],
    react: "🏷️",
    desc: "Mention all group members.",
    category: "group",
    filename: __filename,
    usage: ".tagall [message]"
},
async (robin, mek, m, { from, isGroup, isAdmins, reply, args }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ Only admins can use this command!");

        const groupMetadata = await robin.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let message = args.length > 0 ? args.join(' ') : "Attention everyone!";
        let mentions = [];
        let text = `🏷️ ${message}\n\n`;
        
        participants.forEach(participant => {
            mentions.push(participant.id);
            text += `@${participant.id.split('@')[0]} `;
        });

        await robin.sendMessage(from, {
            text: text.trim(),
            mentions: mentions
        }, { quoted: mek });
        
    } catch (e) {
        console.error("Tagall Error:", e);
        reply(`❌ Failed to tag all members. Error: ${e.message}`);
    }
});
