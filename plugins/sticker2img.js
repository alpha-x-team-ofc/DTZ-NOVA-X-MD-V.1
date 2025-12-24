const { cmd, commands } = require("../command");
const fs = require("fs");
const { downloadMediaMessage } = require("../lib/msg.js");
const { exec } = require("child_process");
const util = require("util");
const path = require("path");

cmd(
  {
    pattern: "toimg",
    alias: ["img", "photo", "stickertoimg"],
    desc: "Convert a sticker to an image",
    category: "utility",
    filename: __filename,
    usage: "Reply to a sticker with .toimg"
  },
  async (robin, mek, m, options) => {
    const { from, reply, quoted } = options;
    
    try {
      // Check if quoted message exists and is a sticker
      if (!mek.message.extendedTextMessage || 
          !mek.message.extendedTextMessage.contextInfo || 
          !mek.message.extendedTextMessage.contextInfo.quotedMessage ||
          !mek.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage) {
        return reply("❌ Please reply to a sticker to convert it to an image.");
      }

      // Get the quoted sticker message
      const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
      
      // Download the sticker
      const mediaPath = await downloadMediaMessage(quotedMsg, "sticker", "sticker");
      
      if (!mediaPath || !fs.existsSync(mediaPath)) {
        return reply("❌ Failed to download the sticker.");
      }

      // Define output path
      const outputPath = mediaPath.replace(/\.webp$/, '.png');
      
      try {
        // Method 1: Using ffmpeg (Recommended if available)
        const execPromise = util.promisify(exec);
        
        // Convert webp to png using ffmpeg
        await execPromise(`ffmpeg -i "${mediaPath}" -vcodec png "${outputPath}" -y`);
        
        // Send the converted image
        await robin.sendMessage(
          from,
          {
            image: fs.readFileSync(outputPath),
            caption: "✅ Converted successfully!\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
          },
          { quoted: mek }
        );
        
        // Clean up temporary files
        fs.unlinkSync(mediaPath);
        fs.unlinkSync(outputPath);
        
      } catch (ffmpegError) {
        // Method 2: Using webp-converter if ffmpeg fails
        try {
          const webp = require('webp-converter');
          
          // Convert webp to png
          const result = await webp.dwebp(mediaPath, outputPath, "-o", "-quiet");
          
          if (result === 0) {
            await robin.sendMessage(
              from,
              {
                image: fs.readFileSync(outputPath),
                caption: "✅ Converted successfully!\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
              },
              { quoted: mek }
            );
          } else {
            throw new Error("WebP conversion failed");
          }
          
          // Clean up
          fs.unlinkSync(mediaPath);
          fs.unlinkSync(outputPath);
          
        } catch (webpError) {
          // Method 3: Simple rename (only works for static stickers)
          const newPath = mediaPath + '.png';
          fs.renameSync(mediaPath, newPath);
          
          await robin.sendMessage(
            from,
            {
              image: fs.readFileSync(newPath),
              caption: "✅ Converted (static sticker)!\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
            },
            { quoted: mek }
          );
          
          fs.unlinkSync(newPath);
        }
      }
      
    } catch (error) {
      console.error("Toimg error:", error);
      reply(`❌ Error: ${error.message || "Failed to convert sticker"}`);
    }
  }
);
