const { cmd } = require("../command");
const axios = require("axios");
const config = require('../config');

cmd(
  {
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    react: "📥",
    desc: "Download Facebook videos",
    category: "download",
    filename: __filename,
    usage: ".fb [facebook_video_url]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ Please provide a Facebook video URL!\nExample: .fb https://www.facebook.com/...");
      }

      // Validate Facebook URL
      const fbRegex = /(https?:\/\/)?(www\.|m\.)?(facebook|fb)\.(com|watch)\/.+/i;
      if (!fbRegex.test(q)) {
        return reply("❌ Invalid Facebook URL!\nPlease provide a valid Facebook video link.");
      }

      // Show processing message
      const processingMsg = await reply("📥 Processing Facebook video...");

      // Method 1: Try Facebook downloader API
      try {
        // Using a free Facebook downloader API
        const apiUrl = `https://fbdownloader.net/api/ajaxSearch`;
        
        const formData = new URLSearchParams();
        formData.append('q', q);
        
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.links && response.data.links.length > 0) {
          const videoLinks = response.data.links;
          
          let caption = `📥 *Facebook Video Download*\n\n`;
          caption += `✅ Video available in ${videoLinks.length} quality${videoLinks.length > 1 ? 'ies' : ''}\n\n`;
          
          // Send caption first
          await robin.sendMessage(
            from,
            { 
              image: { url: "https://files.catbox.moe/fpyw9m.png" },
              caption: caption
            },
            { quoted: mek }
          );
          
          // Send each video quality
          for (const link of videoLinks) {
            try {
              await robin.sendMessage(
                from,
                { 
                  video: { url: link.url },
                  caption: `📊 Quality: ${link.quality || 'Unknown'}`
                },
                { quoted: mek }
              );
              // Small delay between sends
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (videoError) {
              console.log("Failed to send video:", link.quality);
            }
          }
          
          return reply("✅ Download complete!\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ");
        }
      } catch (apiError) {
        console.log("API method failed, trying alternative...");
      }

      // Method 2: Alternative Facebook downloader
      try {
        // Using another Facebook download API
        const response = await axios.get(`https://api.fbdown.net/downloader?URL=${encodeURIComponent(q)}`);
        
        if (response.data && response.data.links && response.data.links.hd) {
          const hdUrl = response.data.links.hd;
          const sdUrl = response.data.links.sd;
          
          await reply("📥 Found HD quality! Sending video...");
          
          // Send HD video
          await robin.sendMessage(
            from,
            { 
              video: { url: hdUrl },
              caption: "📥 HD Video - ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
            },
            { quoted: mek }
          );
          
          // Send SD video if different
          if (sdUrl && sdUrl !== hdUrl) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await robin.sendMessage(
              from,
              { 
                video: { url: sdUrl },
                caption: "📥 SD Video - ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
              },
              { quoted: mek }
            );
          }
          
          return;
        }
      } catch (altError) {
        console.log("Alternative method failed");
      }

      // Method 3: Direct link method
      try {
        // Try to extract video ID and use direct methods
        const videoIdMatch = q.match(/(?:videos?|watch)(?:\/|\?v=)(\d+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          
          // Try various direct download methods
          const directUrls = [
            `https://www.facebook.com/video/redirect/?video_id=${videoId}`,
            `https://fb.watch/${videoId}/`,
          ];
          
          for (const url of directUrls) {
            try {
              await robin.sendMessage(
                from,
                { 
                  video: { url: url },
                  caption: "📥 Facebook Video - ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
                },
                { quoted: mek }
              );
              return reply("✅ Video sent!");
            } catch (directError) {
              continue;
            }
          }
        }
      } catch (directError) {
        console.log("Direct method failed");
      }

      // If all methods fail
      reply("❌ Failed to download video. Possible reasons:\n1. Video is private/restricted\n2. Link is invalid\n3. Facebook API is down\n\nTry downloading manually or use another link.");
      
    } catch (error) {
      console.error("Facebook download error:", error);
      reply(`❌ Error: ${error.message || "Failed to download video"}`);
    }
  }
);

// Alternative: Facebook Reels/Stories downloader
cmd(
  {
    pattern: "fbreels",
    alias: ["reels", "fbstory"],
    react: "🎬",
    desc: "Download Facebook Reels/Stories",
    category: "download",
    filename: __filename,
    usage: ".fbreels [reels_url]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Provide Facebook Reels URL!");
      
      // Facebook Reels usually have /reel/ in URL
      if (!q.includes('/reel/')) {
        return reply("❌ Please provide a Facebook Reels URL (should contain '/reel/')");
      }
      
      await reply("🎬 Downloading Facebook Reels...");
      
      // Use Instagram downloader API for Reels (they often work)
      const response = await axios.get(`https://api.snapsave.app/facebook?url=${encodeURIComponent(q)}`);
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const videoUrl = response.data.data[0].url;
        
        await robin.sendMessage(
          from,
          { 
            video: { url: videoUrl },
            caption: "🎬 Facebook Reels - ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ"
          },
          { quoted: mek }
        );
        
        return reply("✅ Reels downloaded successfully!");
      } else {
        reply("❌ Could not download Reels. Try the video downloader instead.");
      }
      
    } catch (error) {
      console.error("Reels error:", error);
      reply("❌ Failed to download Reels. Try with .fb command.");
    }
  }
);

// Facebook audio extractor (for videos with audio)
cmd(
  {
    pattern: "fbaudio",
    alias: ["fbsound", "fbmp3"],
    react: "🎵",
    desc: "Extract audio from Facebook video",
    category: "download",
    filename: __filename,
    usage: "Reply to downloaded FB video with .fbaudio"
  },
  async (robin, mek, m, { from, quoted, reply }) => {
    try {
      if (!mek.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {
        return reply("❌ Please reply to a Facebook video to extract audio!");
      }
      
      reply("⚠️ Audio extraction requires additional setup.\nCurrently not available. Use video download only.");
      
    } catch (error) {
      reply("❌ Audio extraction not available.");
    }
  }
);

// Facebook URL info (without download)
cmd(
  {
    pattern: "fbinfo",
    alias: ["fbdetail"],
    react: "ℹ️",
    desc: "Get Facebook video info without downloading",
    category: "download",
    filename: __filename,
    usage: ".fbinfo [facebook_url]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Provide Facebook URL!");
      
      await reply("ℹ️ Fetching video information...");
      
      // Try to get video info
      const response = await axios.get(`https://fbdownloader.net/api/ajaxSearch?q=${encodeURIComponent(q)}`);
      
      if (response.data) {
        let infoText = `📋 *Facebook Video Information*\n\n`;
        infoText += `🔗 URL: ${q}\n`;
        
        if (response.data.title) infoText += `📝 Title: ${response.data.title}\n`;
        if (response.data.duration) infoText += `⏱️ Duration: ${response.data.duration}\n`;
        if (response.data.thumbnail) infoText += `🖼️ Thumbnail: Available\n`;
        
        infoText += `\n💾 Available qualities: ${response.data.links?.length || 0}\n`;
        
        if (response.data.links) {
          response.data.links.forEach((link, index) => {
            infoText += `  ${index + 1}. ${link.quality || 'Unknown'}\n`;
          });
        }
        
        infoText += `\nUse \`.fb ${q}\` to download.`;
        
        // Send with thumbnail if available
        if (response.data.thumbnail) {
          await robin.sendMessage(
            from,
            {
              image: { url: response.data.thumbnail },
              caption: infoText
            },
            { quoted: mek }
          );
        } else {
          await reply(infoText);
        }
      } else {
        reply("❌ Could not fetch video information.");
      }
      
    } catch (error) {
      console.error("FB Info error:", error);
      reply("❌ Failed to get video information.");
    }
  }
);
