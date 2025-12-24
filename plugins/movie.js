const { cmd } = require('../command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

const API_KEY = config.MOVIE_API_KEY || "sky|9d3c4942490b636ca58c82c6da4a599039358cdc";

cmd({
    pattern: "movie",
    alias: ["moviedl", "film", "movies"],
    react: '🎬',
    category: "download",
    desc: "Search and download movies",
    filename: __filename,
    usage: ".movie [movie name]"
}, async (robin, mek, m, { from, q, reply }) => {
    try {
        if (!q || q.trim() === '') {
            return await reply('❌ Please provide a movie name!\nExample: `.movie deadpool`');
        }

        // Show searching message
        const searchingMsg = await reply(`🔍 Searching for *${q}*...`);

        // Search for movie
        const searchResponse = await axios.get(`https://api.skymansion.site/movies-dl/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`);
        
        if (!searchResponse.data || !searchResponse.data.SearchResult || !searchResponse.data.SearchResult.result || searchResponse.data.SearchResult.result.length === 0) {
            return await reply(`❌ No results found for: *${q}*`);
        }

        const movies = searchResponse.data.SearchResult.result;
        
        // Show movie options (first 5)
        let movieList = `🎬 *Search Results for "${q}"*\n\n`;
        movies.slice(0, 5).forEach((movie, index) => {
            movieList += `${index + 1}. *${movie.title}* (${movie.year})\n`;
        });
        movieList += `\nReply with number (1-${Math.min(5, movies.length)}) to download.`;
        
        await reply(movieList);

        // Listen for user selection
        const selectedIndex = await waitForUserSelection(robin, from, Math.min(5, movies.length));
        if (selectedIndex === -1) return;

        const selectedMovie = movies[selectedIndex];
        
        // Get download links
        await reply(`📥 Getting download links for *${selectedMovie.title}*...`);
        
        const downloadResponse = await axios.get(`https://api.skymansion.site/movies-dl/download?id=${selectedMovie.id}&api_key=${API_KEY}`);
        
        if (!downloadResponse.data || !downloadResponse.data.downloadLinks) {
            return await reply('❌ No download links available for this movie.');
        }

        // Get available qualities
        const links = downloadResponse.data.downloadLinks.result.links;
        const qualities = [];
        
        // Check drive links
        if (links.driveLinks && links.driveLinks.length > 0) {
            links.driveLinks.forEach(link => {
                qualities.push({ 
                    quality: link.quality, 
                    link: link.link,
                    type: 'drive' 
                });
            });
        }
        
        // Check other links
        if (links.files && links.files.length > 0) {
            links.files.forEach(file => {
                qualities.push({ 
                    quality: file.quality || 'Unknown', 
                    link: file.url,
                    type: 'direct' 
                });
            });
        }
        
        if (qualities.length === 0) {
            return await reply('❌ No downloadable links found.');
        }
        
        // Show quality options
        let qualityList = `📊 *Available Qualities for ${selectedMovie.title}*\n\n`;
        qualities.forEach((q, index) => {
            qualityList += `${index + 1}. ${q.quality} (${q.type})\n`;
        });
        qualityList += `\nReply with number (1-${qualities.length}) to download.`;
        
        await reply(qualityList);
        
        // Wait for quality selection
        const qualityIndex = await waitForUserSelection(robin, from, qualities.length);
        if (qualityIndex === -1) return;
        
        const selectedQuality = qualities[qualityIndex];
        
        // Download the movie
        await reply(`⬇️ Downloading ${selectedMovie.title} (${selectedQuality.quality})...\n⏳ This may take a while...`);
        
        // Create temporary file path
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const fileName = `${selectedMovie.title.replace(/[^\w\s]/gi, '')}-${selectedQuality.quality}.mp4`;
        const filePath = path.join(tempDir, fileName);
        
        try {
            // Download file
            const response = await axios({
                url: selectedQuality.link,
                method: 'GET',
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(filePath);
            await pipeline(response.data, writer);
            
            // Check file size
            const stats = fs.statSync(filePath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            if (stats.size < 1024) {
                fs.unlinkSync(filePath);
                return await reply('❌ Downloaded file is too small or corrupted.');
            }
            
            // Send the file
            await reply(`✅ Download complete! (${fileSizeMB} MB)\n📤 Uploading to WhatsApp...`);
            
            await robin.sendMessage(from, {
                document: fs.readFileSync(filePath),
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `🎬 *${selectedMovie.title}*\n📊 Quality: ${selectedQuality.quality}\n💾 Size: ${fileSizeMB} MB\n✅ Downloaded successfully!`
            }, { quoted: mek });
            
            // Clean up
            fs.unlinkSync(filePath);
            
        } catch (downloadError) {
            console.error('Download error:', downloadError);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await reply('❌ Failed to download the movie. The link might be expired or invalid.');
        }
        
    } catch (error) {
        console.error('Movie command error:', error);
        await reply('❌ Error: ' + (error.message || 'Something went wrong. Please try again.'));
    }
});

// Helper function to wait for user selection
async function waitForUserSelection(robin, from, maxNumber, timeout = 30000) {
    return new Promise((resolve) => {
        let timer = setTimeout(() => {
            resolve(-1);
        }, timeout);
        
        const listener = (message) => {
            if (message.key.remoteJid === from && message.message && message.message.conversation) {
                const text = message.message.conversation.trim();
                const number = parseInt(text);
                
                if (!isNaN(number) && number >= 1 && number <= maxNumber) {
                    clearTimeout(timer);
                    robin.ev.off('messages.upsert', listener);
                    resolve(number - 1);
                }
            }
        };
        
        robin.ev.on('messages.upsert', listener);
    });
}

// Alternative: Simple movie info command
cmd({
    pattern: "movieinfo",
    alias: ["minfo", "filminfo"],
    react: 'ℹ️',
    category: "download",
    desc: "Get movie information",
    filename: __filename,
    usage: ".movieinfo [movie name]"
}, async (robin, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ Please provide a movie name!');
        
        await reply(`🔍 Searching for *${q}*...`);
        
        const searchResponse = await axios.get(`https://api.skymansion.site/movies-dl/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`);
        
        if (!searchResponse.data || !searchResponse.data.SearchResult || !searchResponse.data.SearchResult.result || searchResponse.data.SearchResult.result.length === 0) {
            return await reply(`❌ No results found for: *${q}*`);
        }
        
        const movie = searchResponse.data.SearchResult.result[0];
        
        let info = `🎬 *${movie.title}* (${movie.year})\n\n`;
        info += `📁 ID: ${movie.id}\n`;
        info += `🎭 Type: ${movie.type || 'Movie'}\n`;
        
        if (movie.genre) info += `🏷️ Genre: ${movie.genre}\n`;
        if (movie.rating) info += `⭐ Rating: ${movie.rating}\n`;
        if (movie.duration) info += `⏱️ Duration: ${movie.duration}\n`;
        if (movie.plot) info += `\n📖 Plot: ${movie.plot.substring(0, 200)}...\n`;
        
        info += `\nUse \`.movie ${movie.title}\` to download.`;
        
        await reply(info);
        
    } catch (error) {
        console.error('Movie info error:', error);
        await reply('❌ Error fetching movie information.');
    }
});
