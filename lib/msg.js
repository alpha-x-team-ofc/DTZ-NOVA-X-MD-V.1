const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const { getRandom } = require('./functions');

/**
 * Download media message with improved error handling and file management
 */
const downloadMediaMessage = async (message, type, filename = null) => {
    try {
        if (!message) {
            console.error('downloadMediaMessage: No message provided');
            return null;
        }

        // Handle viewOnce messages
        if (message.type === 'viewOnceMessage') {
            message.type = message.msg?.type || 'imageMessage';
        }

        // Determine media type if not provided
        if (!type) {
            if (message.type === 'imageMessage') type = 'image';
            else if (message.type === 'videoMessage') type = 'video';
            else if (message.type === 'audioMessage') type = 'audio';
            else if (message.type === 'documentMessage') type = 'document';
            else if (message.type === 'stickerMessage') type = 'sticker';
            else {
                console.error('downloadMediaMessage: Unknown message type:', message.type);
                return null;
            }
        }

        // Get the actual message content
        const msgContent = message.msg || message;
        
        // Generate filename if not provided
        if (!filename) {
            const ext = getExtensionForType(type);
            filename = `${getRandom(ext)}`;
        }

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, filename);

        try {
            // Download content
            const stream = await downloadContentFromMessage(msgContent, type);
            
            // Write to file
            const writeStream = fs.createWriteStream(filePath);
            
            for await (const chunk of stream) {
                writeStream.write(chunk);
            }
            
            writeStream.end();
            
            // Wait for write to complete
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // Verify file was written
            if (!fs.existsSync(filePath)) {
                throw new Error('File not created');
            }

            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                fs.unlinkSync(filePath);
                throw new Error('Empty file downloaded');
            }

            console.log(`Media downloaded: ${filePath} (${stats.size} bytes)`);
            return filePath;

        } catch (downloadError) {
            console.error('Download stream error:', downloadError.message);
            
            // Try alternative download method
            try {
                return await downloadMediaMessageAlternative(message, type, filename);
            } catch (altError) {
                console.error('Alternative download also failed:', altError.message);
                return null;
            }
        }

    } catch (error) {
        console.error('downloadMediaMessage error:', error.message);
        return null;
    }
};

/**
 * Helper function to get file extension for type
 */
const getExtensionForType = (type) => {
    const extensions = {
        'image': '.jpg',
        'video': '.mp4',
        'audio': '.mp3',
        'document': '.bin',
        'sticker': '.webp',
        'imageMessage': '.jpg',
        'videoMessage': '.mp4',
        'audioMessage': '.mp3',
        'stickerMessage': '.webp'
    };
    
    return extensions[type] || '.bin';
};

/**
 * Alternative download method for fallback
 */
const downloadMediaMessageAlternative = async (message, type, filename) => {
    try {
        // This is a simplified alternative method
        const msgContent = message.msg || message;
        const stream = await downloadContentFromMessage(msgContent, type);
        
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        
        const tempDir = path.join(__dirname, '../temp');
        const filePath = path.join(tempDir, filename);
        
        fs.writeFileSync(filePath, buffer);
        
        return filePath;
    } catch (error) {
        throw error;
    }
};

/**
 * Download media and return buffer instead of file path
 */
const downloadMediaMessageToBuffer = async (message, type) => {
    try {
        const msgContent = message.msg || message;
        const stream = await downloadContentFromMessage(msgContent, type);
        
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('downloadMediaMessageToBuffer error:', error);
        return null;
    }
};

/**
 * Enhanced message processor with better handling
 */
function sms(robin, m) {
    try {
        if (!m || !m.message) {
            console.error('sms: Invalid message object');
            return m;
        }

        // Get message type and content
        m.type = getContentType(m.message);
        m.msg = m.message[m.type];
        
        if (!m.msg) {
            console.error('sms: No message content found');
            m.body = '';
            return m;
        }

        // Extract mentions
        const contextInfo = m.msg.contextInfo || {};
        
        // Quoted message participant
        const quotedMention = contextInfo.participant || '';
        
        // Array of mentioned users
        let tagMention = contextInfo.mentionedJid || [];
        if (!Array.isArray(tagMention)) {
            tagMention = [tagMention].filter(Boolean);
        }
        
        // Combine all mentions
        const mentions = [...tagMention];
        if (quotedMention) mentions.push(quotedMention);
        
        // Remove duplicates and undefined/null values
        m.mentionUser = [...new Set(mentions.filter(x => x && x.includes('@')))];

        // Extract message body/text
        m.body = extractMessageBody(m);

        // Process quoted messages
        processQuotedMessage(robin, m);

        // Additional metadata
        m.timestamp = m.messageTimestamp || Date.now();
        m.isGroup = m.key.remoteJid?.endsWith('@g.us') || false;
        m.sender = m.key.fromMe ? robin.user.id : (m.key.participant || m.key.remoteJid);
        m.fromMe = m.key.fromMe || false;
        
        // Extract phone number from sender JID
        if (m.sender) {
            m.senderNumber = m.sender.split('@')[0];
        }

        // Check if message is from owner
        if (robin.user && m.senderNumber) {
            const botNumber = robin.user.id.split(':')[0];
            m.isOwner = m.senderNumber === botNumber;
        }

        return m;

    } catch (error) {
        console.error('sms function error:', error);
        
        // Return minimal valid message object
        m.body = '';
        m.type = 'error';
        m.msg = null;
        m.mentionUser = [];
        m.quoted = null;
        
        return m;
    }
}

/**
 * Extract message body from different message types
 */
function extractMessageBody(m) {
    if (!m.msg) return '';
    
    switch (m.type) {
        case 'conversation':
            return m.msg || '';
            
        case 'extendedTextMessage':
            return m.msg.text || '';
            
        case 'imageMessage':
            return m.msg.caption || '';
            
        case 'videoMessage':
            return m.msg.caption || '';
            
        case 'documentMessage':
            return m.msg.caption || m.msg.fileName || '';
            
        case 'audioMessage':
            return m.msg.caption || '';
            
        case 'stickerMessage':
            return m.msg.caption || '';
            
        case 'templateButtonReplyMessage':
            return m.msg.selectedId || '';
            
        case 'buttonsResponseMessage':
            return m.msg.selectedButtonId || '';
            
        case 'listResponseMessage':
            return m.msg.singleSelectReply?.selectedRowId || 
                   m.msg.title || '';
            
        case 'interactiveResponseMessage':
            return m.msg.nativeFlowResponseMessage?.paramsJson || '';
            
        default:
            // Try to extract text from unknown message types
            if (typeof m.msg === 'string') return m.msg;
            if (m.msg.text) return m.msg.text;
            if (m.msg.caption) return m.msg.caption;
            if (m.msg.body) return m.msg.body;
            return '';
    }
}

/**
 * Process quoted message
 */
function processQuotedMessage(robin, m) {
    try {
        const contextInfo = m.msg.contextInfo;
        
        if (!contextInfo || !contextInfo.quotedMessage) {
            m.quoted = null;
            return;
        }

        m.quoted = {
            message: contextInfo.quotedMessage,
            id: contextInfo.stanzaId,
            sender: contextInfo.participant,
            fromMe: false,
            type: null,
            msg: null,
            mentionUser: []
        };

        // Get quoted message type and content
        m.quoted.type = getContentType(m.quoted.message);
        m.quoted.msg = m.quoted.message[m.quoted.type];

        // Handle viewOnce messages
        if (m.quoted.type === 'viewOnceMessage') {
            const viewOnceContent = m.quoted.message.viewOnceMessage;
            m.quoted.msg = viewOnceContent.message[getContentType(viewOnceContent.message)];
            m.quoted.msg.type = getContentType(viewOnceContent.message);
        }

        // Check if quoted message is from bot
        if (m.quoted.sender && robin.user) {
            const quotedNumber = m.quoted.sender.split('@')[0];
            const botNumber = robin.user.id.split(':')[0];
            m.quoted.fromMe = quotedNumber === botNumber;
        }

        // Extract quoted message body
        m.quoted.body = extractMessageBody({
            type: m.quoted.type,
            msg: m.quoted.msg
        });

        // Process quoted mentions
        const quotedContext = m.quoted.msg?.contextInfo || {};
        const quotedTagMention = quotedContext.mentionedJid || [];
        const quotedMention = quotedContext.participant || '';
        
        let quotedMentions = Array.isArray(quotedTagMention) ? 
            quotedTagMention : [quotedTagMention].filter(Boolean);
        
        if (quotedMention) quotedMentions.push(quotedMention);
        m.quoted.mentionUser = [...new Set(quotedMentions.filter(x => x && x.includes('@')))];

    } catch (error) {
        console.error('processQuotedMessage error:', error);
        m.quoted = null;
    }
}

/**
 * Clean up temporary files
 */
const cleanupTempFiles = (maxAgeMinutes = 60) => {
    try {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) return;
        
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up: ${file}`);
                }
            } catch (error) {
                console.error(`Error cleaning up ${file}:`, error.message);
            }
        });
    } catch (error) {
        console.error('cleanupTempFiles error:', error);
    }
};

/**
 * Schedule regular cleanup (every hour)
 */
setInterval(() => {
    cleanupTempFiles();
}, 60 * 60 * 1000);

// Initial cleanup
setTimeout(() => {
    cleanupTempFiles();
}, 5000);

module.exports = {
    sms,
    downloadMediaMessage,
    downloadMediaMessageToBuffer,
    cleanupTempFiles,
    extractMessageBody,
    processQuotedMessage
};
