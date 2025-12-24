const { cmd } = require("../command");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const axios = require("axios");
const fs = require('fs-extra');
const path = require('path');

cmd(
  {
    pattern: "video",
    alias: ["ytvideo", "ytv", "download"],
    react: "🎥",
    desc: "Download YouTube videos",
    category: "download",
    filename: __filename,
    usage: ".video [youtube_url or search term]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ Please provide a YouTube URL or search term!\nExample: .video baby shark");
      }

      // Show searching message
      const searchingMsg = await reply("🔍 Searching for video...");

      let videoUrl;
      let videoInfo;

      // Check if input is a YouTube URL
      if (q.includes('youtube.com') || q.includes('youtu.be')) {
        videoUrl = q;
        
        // Validate YouTube URL
        if (!ytdl.validateURL(videoUrl)) {
          return reply("❌ Invalid YouTube URL!");
        }
        
        try {
          videoInfo = await ytdl.getInfo(videoUrl);
        } catch (error) {
          return reply("❌ Could not fetch video information. The video might be private or unavailable.");
        }
      } else {
        // Search for video
        try {
          const searchResults = await yts(q);
          if (!searchResults.videos || searchResults.videos.length === 0) {
            return reply("❌ No videos found for your search!");
          }
          
          // Get first result
          const videoData = searchResults.videos[0];
          videoUrl = videoData.url;
          videoInfo = await ytdl.getInfo(videoUrl);
        } catch (error) {
          console.error("Search error:", error);
          return reply("❌ Error searching for video. Please try again.");
        }
      }

      // Get video details
      const videoDetails = videoInfo.videoDetails;
      
      // Create video info message
      let desc = `🎥 *YouTube Video Downloader*\n\n`;
      desc += `📝 *Title:* ${videoDetails.title}\n`;
      desc += `⏱️ *Duration:* ${videoDetails.lengthSeconds} seconds\n`;
      desc += `👁️ *Views:* ${videoDetails.viewCount}\n`;
      desc += `👤 *Channel:* ${videoDetails.author.name}\n`;
      desc += `📅 *Uploaded:* ${videoDetails.uploadDate || 'Unknown'}\n`;
      desc += `🔗 *URL:* ${videoUrl}\n\n`;
      
      // Get available formats
      const formats = videoInfo.formats
        .filter(f => f.hasVideo && f.hasAudio)
        .sort((a, b) => (b.qualityLabel || '').localeCompare(a.qualityLabel || ''));
      
      if (formats.length > 0) {
        desc += `📊 *Available Qualities:*\n`;
        formats.slice(0, 5).forEach((format, index) => {
          const quality = format.qualityLabel || 'Unknown';
          const size = format.contentLength ? ` (${(format.contentLength / (1024 * 1024)).toFixed(2)} MB)` : '';
          desc += `${index + 1}. ${quality}${size}\n`;
        });
      }
      
      desc += `\n⏳ *Downloading best quality...*`;

      // Send video info with thumbnail
      await robin.sendMessage(
        from,
        {
          image: { url: videoDetails.thumbnails[0].url },
          caption: desc
        },
        { quoted: mek }
      );

      // Download video (choose best quality with audio)
      const bestFormat = ytdl.chooseFormat(videoInfo.formats, { 
        quality: 'highest',
        filter: 'audioandvideo'
      });

      if (!bestFormat) {
        return reply("❌ No downloadable video format found!");
      }

      await reply(`⬇️ Downloading: ${videoDetails.title}\n📦 Quality: ${bestFormat.qualityLabel || 'Unknown'}`);

      // Create temporary file
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `${videoDetails.title.replace(/[^\w\s]/gi, '')}.mp4`;
      const filePath = path.join(tempDir, fileName);

      // Download using ytdl-core
      const stream = ytdl(videoUrl, {
        quality: bestFormat.itag,
        filter: 'audioandvideo'
      });

      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);

      // Wait for download to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      // Check file size
      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      if (stats.size < 1024) {
        fs.unlinkSync(filePath);
        return reply("❌ Downloaded file is too small or corrupted.");
      }

      // Check WhatsApp file size limit (64MB for videos)
      if (stats.size > 64 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        return reply("❌ Video is too large (over 64MB). WhatsApp cannot send it.");
      }

      // Send the video
      await reply(`✅ Download complete! (${fileSizeMB} MB)\n📤 Uploading to WhatsApp...`);

      await robin.sendMessage(
        from,
        {
          video: fs.readFileSync(filePath),
          caption: `🎥 *${videoDetails.title}*\n📊 Quality: ${bestFormat.qualityLabel || 'Unknown'}\n💾 Size: ${fileSizeMB} MB\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ`
        },
        { quoted: mek }
      );

      // Clean up
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error("Video download error:", error);
      
      if (error.message.includes('Private video') || error.message.includes('unavailable')) {
        reply("❌ This video is private, age-restricted, or unavailable.");
      } else if (error.message.includes('rate limit')) {
        reply("🚫 YouTube rate limit exceeded. Please try again later.");
      } else {
        reply(`❌ Error: ${error.message || "Failed to download video"}`);
      }
    }
  }
);

// Alternative: YouTube audio downloader
cmd(
  {
    pattern: "song",
    alias: ["ytmusic", "music", "mp3"],
    react: "🎵",
    desc: "Download YouTube audio as MP3",
    category: "download",
    filename: __filename,
    usage: ".song [song name or youtube url]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ Please provide a song name or YouTube URL!\nExample: .song despacito");
      }

      await reply("🔍 Searching for song...");

      let videoUrl;
      let videoInfo;

      // Check if input is a YouTube URL
      if (q.includes('youtube.com') || q.includes('youtu.be')) {
        videoUrl = q;
        if (!ytdl.validateURL(videoUrl)) {
          return reply("❌ Invalid YouTube URL!");
        }
        videoInfo = await ytdl.getInfo(videoUrl);
      } else {
        // Search for song
        const searchResults = await yts(q);
        if (!searchResults.videos || searchResults.videos.length === 0) {
          return reply("❌ No songs found!");
        }
        
        const videoData = searchResults.videos[0];
        videoUrl = videoData.url;
        videoInfo = await ytdl.getInfo(videoUrl);
      }

      const videoDetails = videoInfo.videoDetails;
      
      // Show song info
      await robin.sendMessage(
        from,
        {
          image: { url: videoDetails.thumbnails[0].url },
          caption: `🎵 *Song Downloader*\n\n📀 *Title:* ${videoDetails.title}\n🎤 *Artist:* ${videoDetails.author.name}\n⏱️ *Duration:* ${videoDetails.lengthSeconds} seconds\n\n⬇️ Downloading audio...`
        },
        { quoted: mek }
      );

      // Create temporary file
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `${videoDetails.title.replace(/[^\w\s]/gi, '')}.mp3`;
      const filePath = path.join(tempDir, fileName);

      // Download audio only
      const stream = ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });

      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      // Check file size
      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      if (stats.size < 1024) {
        fs.unlinkSync(filePath);
        return reply("❌ Downloaded file is corrupted.");
      }

      // Send audio
      await robin.sendMessage(
        from,
        {
          audio: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          fileName: fileName
        },
        { quoted: mek }
      );

      // Clean up
      fs.unlinkSync(filePath);

      await reply(`✅ Song downloaded successfully! (${fileSizeMB} MB)\n\nＭＡＤＥ ＢＹ ＤＴＺ ＴＥＡＭ`);

    } catch (error) {
      console.error("Song download error:", error);
      reply(`❌ Error: ${error.message || "Failed to download song"}`);
    }
  }
);

// YouTube search command
cmd(
  {
    pattern: "yts",
    alias: ["ytsearch", "searchvideo"],
    react: "🔍",
    desc: "Search YouTube videos",
    category: "download",
    filename: __filename,
    usage: ".yts [search term]"
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Please provide a search term!");

      await reply("🔍 Searching YouTube...");

      const searchResults = await yts(q);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return reply("❌ No videos found!");
      }

      let resultsText = `📺 *YouTube Search Results*\n\n`;
      resultsText += `🔍 *Search:* ${q}\n`;
      resultsText += `📊 *Found:* ${searchResults.videos.length} videos\n\n`;

      // Show top 5 results
      searchResults.videos.slice(0, 5).forEach((video, index) => {
        resultsText += `*${index + 1}. ${video.title}*\n`;
        resultsText += `   👤 ${video.author.name}\n`;
        resultsText += `   ⏱️ ${video.timestamp}\n`;
        resultsText += `   👁️ ${video.views}\n`;
        resultsText += `   🔗 ${video.url}\n\n`;
      });

      resultsText += `Use \`.video [number]\` or \`.video [url]\` to download.\n`;
      resultsText += `Example: \`.video 1\` or \`.video ${searchResults.videos[0].url}\``;

      await reply(resultsText);

    } catch (error) {
      console.error("YouTube search error:", error);
      reply("❌ Error searching YouTube.");
    }
  }
);
