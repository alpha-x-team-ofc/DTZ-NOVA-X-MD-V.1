const { cmd } = require("../command");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const fs = require('fs-extra');
const path = require('path');

cmd(
  {
    pattern: "song",
    alias: ["music", "mp3", "audio", "ytmusic"],
    react: "🎵",
    desc: "Download YouTube audio as MP3",
    category: "download",
    filename: __filename,
    usage: ".song [song name or youtube url]"
  },
  async (robin, mek, m, { from, q, reply, pushname }) => {
    try {
      if (!q) {
        return reply(`🎵 *Song Downloader*\n\nPlease provide a song name or YouTube URL!\nExample: ${config.PREFIX || '.'}song despacito\n\nOr search with: ${config.PREFIX || '.'}song baby shark`);
      }

      // Show searching message
      const searchingMsg = await reply("🔍 Searching for song...");

      let videoUrl;
      let videoInfo;
      let videoData;

      // Check if input is a YouTube URL
      const isYoutubeUrl = q.includes('youtube.com') || q.includes('youtu.be');
      
      if (isYoutubeUrl) {
        videoUrl = q;
        
        // Validate YouTube URL
        if (!ytdl.validateURL(videoUrl)) {
          return reply("❌ Invalid YouTube URL!\nPlease provide a valid YouTube link.");
        }
        
        try {
          videoInfo = await ytdl.getInfo(videoUrl);
        } catch (error) {
          return reply("❌ Could not fetch video information. The video might be:\n• Private\n• Age-restricted\n• Unavailable in your region\n• Removed");
        }
        
        videoData = {
          title: videoInfo.videoDetails.title,
          thumbnail: videoInfo.videoDetails.thumbnails[0]?.url,
          author: videoInfo.videoDetails.author,
          timestamp: videoInfo.videoDetails.lengthSeconds,
          views: videoInfo.videoDetails.viewCount,
          url: videoUrl
        };
      } else {
        // Search for song
        try {
          const searchResults = await yts(q);
          if (!searchResults.videos || searchResults.videos.length === 0) {
            return reply(`❌ No songs found for: *${q}*\n\nTry:\n1. Different keywords\n2. Artist name\n3. Full song title`);
          }
          
          // Get first result
          videoData = searchResults.videos[0];
          videoUrl = videoData.url;
          
          // Validate the found video
          if (!ytdl.validateURL(videoUrl)) {
            return reply("❌ Invalid video found. Please try another search.");
          }
          
          videoInfo = await ytdl.getInfo(videoUrl);
        } catch (error) {
          console.error("Search error:", error);
          return reply("❌ Error searching for song. Please try again.");
        }
      }

      const videoDetails = videoInfo.videoDetails;
      
      // Convert seconds to MM:SS format
      const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      };

      // Check duration limit (30 minutes = 1800 seconds)
      const durationInSeconds = parseInt(videoDetails.lengthSeconds);
      if (durationInSeconds > 1800) {
        return reply(`⏱️ *Duration Limit Exceeded!*\n\nSong duration: ${formatDuration(durationInSeconds)}\nLimit: 30:00\n\nPlease choose a shorter song.`);
      }

      // Create song info message
      let desc = `🎵 *ＳＯＮＧ  ＤＯＷＮＬＯＡＤＥＲ*\n\n`;
      desc += `📀 *Title:* ${videoDetails.title}\n`;
      desc += `🎤 *Artist:* ${videoDetails.author.name}\n`;
      desc += `⏱️ *Duration:* ${formatDuration(durationInSeconds)}\n`;
      desc += `👁️ *Views:* ${parseInt(videoDetails.viewCount).toLocaleString()}\n`;
      desc += `📅 *Uploaded:* ${videoDetails.uploadDate || 'Unknown'}\n`;
      desc += `🔗 *URL:* ${videoUrl}\n\n`;
      desc += `👋 *Requested by:* ${pushname || 'User'}\n`;
      desc += `⬇️ *Status:* Downloading audio...\n\n`;
      desc += `🥶ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ🥶`;

      // Send song info with thumbnail
      try {
        await robin.sendMessage(
          from,
          {
            image: { url: videoDetails.thumbnails[0]?.url || videoData.thumbnail },
            caption: desc
          },
          { quoted: mek }
        );
      } catch (thumbnailError) {
        console.log("Thumbnail error, sending text only:", thumbnailError.message);
        await reply(desc);
      }

      // Create temporary directory
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Clean filename
      const cleanFileName = (str) => {
        return str.replace(/[^\w\s-]/gi, '').trim().substring(0, 50);
      };
      
      const fileName = `${cleanFileName(videoDetails.title)}.mp3`;
      const filePath = path.join(tempDir, fileName);

      // Download audio using ytdl-core
      await reply("⬇️ Downloading audio... This may take a moment.");

      const stream = ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25 // 32MB buffer
      });

      const writeStream = fs.createWriteStream(filePath);
      
      // Track download progress
      let downloadedBytes = 0;
      stream.on('progress', (chunkLength, downloaded, total) => {
        downloadedBytes = downloaded;
        const percent = (downloaded / total * 100).toFixed(1);
        if (percent % 25 === 0) {
          // You could send progress updates here
        }
      });

      // Pipe stream to file
      stream.pipe(writeStream);

      // Wait for download to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      // Check if file was downloaded successfully
      if (!fs.existsSync(filePath)) {
        return reply("❌ Failed to create audio file.");
      }

      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      if (stats.size < 1024) {
        fs.unlinkSync(filePath);
        return reply("❌ Downloaded file is corrupted or empty.");
      }

      // Check file size limit (WhatsApp has 16MB limit for audio)
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        return reply(`❌ File too large (${fileSizeMB} MB).\nWhatsApp limit for audio is 16MB.\nTry a shorter song.`);
      }

      // Send the audio file
      await reply(`✅ Download complete! (${fileSizeMB} MB)\n📤 Uploading to WhatsApp...`);

      try {
        await robin.sendMessage(
          from,
          {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false // false for music, true for voice message
          },
          { quoted: mek }
        );
        
        await reply(`🎵 *${videoDetails.title}*\n✅ Successfully downloaded!\n💾 Size: ${fileSizeMB} MB\n\n🥶ＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ🥶`);
        
      } catch (sendError) {
        console.error("Send error:", sendError);
        
        // Try sending as document if audio fails
        try {
          await robin.sendMessage(
            from,
            {
              document: fs.readFileSync(filePath),
              mimetype: 'audio/mpeg',
              fileName: fileName,
              caption: `🎵 ${videoDetails.title}`
            },
            { quoted: mek }
          );
          
          await reply("✅ Sent as document!");
          
        } catch (docError) {
          await reply("❌ Failed to send audio. File might be too large.");
        }
      }

      // Clean up temporary file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.log("Cleanup error:", cleanupError);
      }

    } catch (error) {
      console.error("Song download error:", error);
      
      // Clean up on error
      try {
        const tempDir = path.join(__dirname, '../temp');
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          if (file.endsWith('.mp3') && Date.now() - fs.statSync(path.join(tempDir, file)).mtimeMs > 300000) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        });
      } catch (cleanupError) {}
      
      if (error.message.includes('Private video') || error.message.includes('unavailable')) {
        reply("❌ This video is private or unavailable.");
      } else if (error.message.includes('rate limit')) {
        reply("🚫 YouTube rate limit exceeded. Please wait a few minutes.");
      } else if (error.message.includes('copyright')) {
        reply("©️ This song is copyright protected and cannot be downloaded.");
      } else {
        reply(`❌ Error: ${error.message || "Failed to download song"}\n\nPlease try:\n1. Different song\n2. Shorter duration\n3. Later time`);
      }
    }
  }
);

// Alternative: Get song info without downloading
cmd(
  {
    pattern: "songinfo",
    alias: ["musicinfo", "songdetails"],
    react: "ℹ️",
    desc: "Get song information without downloading",
    category: "download",
    filename: __filename,
    usage: ".songinfo [song name or url]"
  },
  async (robin, mek, m, { from, q, reply, pushname }) => {
    try {
      if (!q) return reply("❌ Provide song name or URL!");
      
      await reply("🔍 Getting song information...");
      
      const searchResults = await yts(q);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return reply("❌ No songs found!");
      }
      
      const song = searchResults.videos[0];
      
      let info = `🎵 *Song Information*\n\n`;
      info += `📀 *Title:* ${song.title}\n`;
      info += `🎤 *Artist:* ${song.author.name}\n`;
      info += `⏱️ *Duration:* ${song.timestamp}\n`;
      info += `👁️ *Views:* ${song.views}\n`;
      info += `📅 *Uploaded:* ${song.ago}\n`;
      info += `🔗 *URL:* ${song.url}\n\n`;
      info += `📝 *Description:*\n${song.description.substring(0, 200)}${song.description.length > 200 ? '...' : ''}\n\n`;
      info += `Use \`.song ${song.url}\` to download.\n`;
      info += `Requested by: ${pushname || 'User'}`;
      
      await robin.sendMessage(
        from,
        {
          image: { url: song.thumbnail },
          caption: info
        },
        { quoted: mek }
      );
      
    } catch (error) {
      console.error("Song info error:", error);
      reply("❌ Error getting song information.");
    }
  }
);
