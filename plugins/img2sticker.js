const { cmd } = require("../command");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const { downloadMediaMessage } = require("../lib/msg.js");

cmd(
  {
    pattern: "sticker",
    alias: ["s", "stick", "stiker"],
    desc: "Convert image/video to sticker",
    category: "convert",
    filename: __filename,
    usage: "Reply to an image/video with .sticker"
  },
  async (robin, mek, m, { from, quoted, reply }) => {
    try {
      // Check if there's a quoted message
      if (!mek.message.extendedTextMessage || 
          !mek.message.extendedTextMessage.contextInfo || 
          !mek.message.extendedTextMessage.contextInfo.quotedMessage) {
        return reply("❌ Please reply to an image or video to make a sticker!");
      }

      const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
      
      // Check if quoted message has image or video
      if (!quotedMsg.imageMessage && !quotedMsg.videoMessage) {
        return reply("❌ Please reply to an image or video only!");
      }

      // Show processing message
      const processingMsg = await reply("🔄 Processing your sticker...");

      // Download the media
      let mediaPath;
      if (quotedMsg.imageMessage) {
        mediaPath = await downloadMediaMessage(quotedMsg, "image", "sticker-input.jpg");
      } else if (quotedMsg.videoMessage) {
        mediaPath = await downloadMediaMessage(quotedMsg, "video", "sticker-input.mp4");
      }

      if (!mediaPath) {
        return reply("❌ Failed to download media. Please try again!");
      }

      // Create sticker
      const sticker = new Sticker(mediaPath, {
        pack: "ＤＴＺ ＮＯＶＡ Ｘ ＭＤ",
        author: "ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ",
        type: StickerTypes.FULL,
        quality: 50,
        categories: ['🤩', '🎉'],
        id: '12345',
        background: 'transparent'
      });

      // Generate sticker buffer
      const stickerBuffer = await sticker.toBuffer();

      // Send sticker
      await robin.sendMessage(
        from,
        { sticker: stickerBuffer },
        { quoted: mek }
      );

      // Clean up downloaded file
      try {
        const fs = require('fs');
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      } catch (cleanupError) {
        console.log("Cleanup error:", cleanupError);
      }

    } catch (error) {
      console.error("Sticker command error:", error);
      reply(`❌ Error: ${error.message || "Failed to create sticker"}`);
    }
  }
);

// Optional: Sticker with custom pack name
cmd(
  {
    pattern: "stickercustom",
    alias: ["sc", "csticker"],
    desc: "Create sticker with custom pack name",
    category: "convert",
    filename: __filename,
    usage: ".stickercustom [pack name] | [author name]"
  },
  async (robin, mek, m, { from, quoted, q, reply }) => {
    try {
      if (!mek.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return reply("❌ Reply to an image/video!");
      }

      const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
      
      if (!quotedMsg.imageMessage && !quotedMsg.videoMessage) {
        return reply("❌ Only images and videos can be converted!");
      }

      // Parse custom pack and author from query
      let packName = "ＤＴＺ ＮＯＶＡ Ｘ ＭＤ";
      let authorName = "ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ";
      
      if (q) {
        const parts = q.split('|').map(part => part.trim());
        if (parts[0]) packName = parts[0].substring(0, 30);
        if (parts[1]) authorName = parts[1].substring(0, 20);
      }

      // Download media
      const mediaPath = quotedMsg.imageMessage 
        ? await downloadMediaMessage(quotedMsg, "image", "custom-sticker.jpg")
        : await downloadMediaMessage(quotedMsg, "video", "custom-sticker.mp4");

      if (!mediaPath) {
        return reply("❌ Failed to download media!");
      }

      await reply("🎨 Creating custom sticker...");

      // Create sticker with custom options
      const sticker = new Sticker(mediaPath, {
        pack: packName,
        author: authorName,
        type: StickerTypes.FULL,
        quality: 70,
        background: 'transparent'
      });

      const stickerBuffer = await sticker.toBuffer();
      
      await robin.sendMessage(
        from,
        { sticker: stickerBuffer },
        { quoted: mek }
      );

      // Cleanup
      try {
        const fs = require('fs');
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      } catch (e) {}

    } catch (error) {
      console.error("Custom sticker error:", error);
      reply(`❌ Error: ${error.message}`);
    }
  }
);

// Optional: Animated sticker from video/gif
cmd(
  {
    pattern: "asticker",
    alias: ["animated", "gifsticker"],
    desc: "Create animated sticker from video/gif",
    category: "convert",
    filename: __filename,
    usage: "Reply to a video/gif with .asticker"
  },
  async (robin, mek, m, { from, quoted, reply }) => {
    try {
      if (!mek.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return reply("❌ Reply to a video or gif!");
      }

      const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
      
      if (!quotedMsg.videoMessage) {
        return reply("❌ Only videos can be converted to animated stickers!");
      }

      await reply("🎞️ Creating animated sticker...");

      const mediaPath = await downloadMediaMessage(quotedMsg, "video", "animated-sticker.mp4");
      
      if (!mediaPath) {
        return reply("❌ Failed to download video!");
      }

      // Create animated sticker
      const sticker = new Sticker(mediaPath, {
        pack: "ＤＴＺ ＮＯＶＡ Ｘ ＭＤ",
        author: "ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ",
        type: StickerTypes.FULL,
        quality: 50,
        animated: true
      });

      const stickerBuffer = await sticker.toBuffer();
      
      await robin.sendMessage(
        from,
        { sticker: stickerBuffer },
        { quoted: mek }
      );

      // Cleanup
      try {
        const fs = require('fs');
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      } catch (e) {}

    } catch (error) {
      console.error("Animated sticker error:", error);
      reply(`❌ Error: Video might be too long. Try a shorter video (max 7 seconds).`);
    }
  }
);

// Optional: Take sticker from URL
cmd(
  {
    pattern: "stickerurl",
    alias: ["urlsticker", "surl"],
    desc: "Create sticker from image URL",
    category: "convert",
    filename: __filename,
    usage: ".stickerurl [image_url]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ Please provide an image URL!\nExample: .stickerurl https://example.com/image.jpg");
      }

      // Validate URL
      if (!q.startsWith('http')) {
        return reply("❌ Please provide a valid URL starting with http or https");
      }

      await reply("🌐 Downloading image from URL...");

      const axios = require('axios');
      const fs = require('fs');
      const path = require('path');
      
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const imagePath = path.join(tempDir, `url-sticker-${Date.now()}.jpg`);
      
      // Download image
      const response = await axios({
        url: q,
        method: 'GET',
        responseType: 'stream'
      });
      
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Create sticker
      const sticker = new Sticker(imagePath, {
        pack: "ＤＴＺ ＮＯＶＡ Ｘ ＭＤ",
        author: "ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ",
        type: StickerTypes.FULL,
        quality: 50
      });

      const stickerBuffer = await sticker.toBuffer();
      
      await robin.sendMessage(
        from,
        { sticker: stickerBuffer },
        { quoted: mek }
      );

      // Cleanup
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

    } catch (error) {
      console.error("URL sticker error:", error);
      reply(`❌ Error: ${error.message || "Invalid URL or image format"}`);
    }
  }
);
