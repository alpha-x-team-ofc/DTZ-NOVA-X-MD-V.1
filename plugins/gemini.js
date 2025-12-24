const { cmd } = require('../command');
const axios = require("axios");
const config = require('../config');

// Use config value or provide default
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY || "AIzaSyDQ2bksLjOVRjM4jjjRNVaPAKqwltbtcDI";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

cmd({
  pattern: "gemini",
  alias: ["ai", "chatgpt", "gpt", "ask"],
  react: '🤖',
  desc: "Ask anything to Google Gemini AI",
  category: "ai",
  filename: __filename,
  usage: ".gemini [your question]"
}, async (robin, mek, m, { q, pushname, reply, from, senderNumber }) => {
  try {
    if (!q || q.trim() === '') {
      return reply(`❌ Please provide a question!\nExample: ${config.PREFIX}gemini What is artificial intelligence?`);
    }

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "AIzaSyDQ2bksLjOVRjM4jjjRNVaPAKqwltbtcDI") {
      return reply("❌ Gemini API key is not configured!\nPlease add your Gemini API key to config.js");
    }

    // Show typing indicator
    await robin.sendPresenceUpdate('composing', from);

    // Enhanced prompt
    const prompt = `User: ${q}\n\nContext: 
    - My name: ${pushname || 'User'}
    - Your name: ＤＴＺ ＮＯＶＡ Ｘ ＭＤ
    - You are a WhatsApp AI bot created by Isara Sihilel
    - Current time: ${new Date().toLocaleString()}
    - User number: ${senderNumber}
    
    Instructions:
    1. Answer in the same language as the question
    2. Be conversational and natural
    3. Use appropriate emojis
    4. Keep responses concise but informative
    5. Format long answers with bullet points
    6. If unsure, say "I'm not sure about that"
    
    Now respond to the user's question:`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    const response = await axios.post(
      GEMINI_API_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Stop typing indicator
    await robin.sendPresenceUpdate('paused', from);

    if (!response.data || !response.data.candidates || !response.data.candidates[0]?.content?.parts) {
      return reply("❌ Sorry, I couldn't generate a response. Please try again.");
    }
    
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    
    // Split long responses
    if (aiResponse.length > 4000) {
      const parts = splitMessage(aiResponse, 4000);
      for (let i = 0; i < parts.length; i++) {
        await reply(`${parts[i]} ${i < parts.length - 1 ? '(continued...)' : ''}`);
        if (i < parts.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      await reply(`${aiResponse}\n\n🤖 *Powered by Gemini AI*`);
    }

  } catch (error) {
    console.error("Gemini AI Error:", error.response?.data || error.message);
    
    // Stop typing indicator on error
    try {
      await robin.sendPresenceUpdate('paused', from);
    } catch (e) {}
    
    if (error.response?.status === 400) {
      reply("❌ Invalid API key or request. Please check your Gemini API configuration.");
    } else if (error.code === 'ECONNABORTED') {
      reply("⏰ Request timeout. Please try again with a shorter question.");
    } else if (error.response?.status === 429) {
      reply("🚫 Rate limit exceeded. Please wait a moment before trying again.");
    } else {
      reply("❌ Sorry, I encountered an error. Please try again later.");
    }
  }
});

// Helper function to split long messages
function splitMessage(text, maxLength) {
  const parts = [];
  let currentPart = '';
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if (currentPart.length + sentence.length <= maxLength) {
      currentPart += sentence + ' ';
    } else {
      if (currentPart) parts.push(currentPart.trim());
      currentPart = sentence + ' ';
    }
  }
  
  if (currentPart) parts.push(currentPart.trim());
  return parts;
}

// Alternative: Gemini with image support
cmd({
  pattern: "geminiimg",
  alias: ["aimage", "aiimg", "vision"],
  react: '🖼️',
  desc: "Ask questions about images using Gemini Vision",
  category: "ai",
  filename: __filename,
  usage: "Reply to an image with .geminiimg [your question]"
}, async (robin, mek, m, { q, pushname, reply, from, quoted }) => {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      return reply("❌ Gemini API key is not configured!");
    }

    // Check if quoted message has an image
    if (!mek.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
      return reply("❌ Please reply to an image with your question!");
    }

    const question = q || "What's in this image?";
    
    await reply("🖼️ Analyzing image with Gemini Vision...");

    // Note: For image analysis, you need to download the image and convert to base64
    // This requires additional implementation
    
    reply("⚠️ Image analysis feature requires additional setup.\nPlease use .gemini for text queries.");

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    reply("❌ Image analysis not available.");
  }
});

// AI Chat mode (continuous conversation)
const chatSessions = new Map();

cmd({
  pattern: "aichat",
  alias: ["chat", "talk"],
  react: '💬',
  desc: "Start a continuous chat with AI",
  category: "ai",
  filename: __filename,
  usage: ".aichat [start/stop] or just chat"
}, async (robin, mek, m, { q, sender, reply, from }) => {
  try {
    const command = q?.toLowerCase()?.trim();
    
    if (command === 'stop' || command === 'end') {
      if (chatSessions.has(sender)) {
        chatSessions.delete(sender);
        return reply("👋 AI chat session ended. Feel free to start again anytime!");
      }
      return reply("❌ No active chat session found.");
    }
    
    if (command === 'start' || command === 'new' || !chatSessions.has(sender)) {
      chatSessions.set(sender, {
        history: [],
        startTime: Date.now()
      });
      return reply(`🤖 *AI Chat Started!*\n\nI'm ＤＴＺ ＮＯＶＡ Ｘ ＭＤ, your AI assistant.\nAsk me anything! Type \`${config.PREFIX}aichat stop\` to end.`);
    }
    
    // Continue existing chat
    if (!q) {
      return reply("❌ Please type your message after .aichat");
    }
    
    const session = chatSessions.get(sender);
    
    // Add to history (keep last 10 messages)
    session.history.push({ role: 'user', content: q });
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }
    
    await reply("💭 Thinking...");
    
    // Build conversation history for context
    let historyText = "Previous conversation:\n";
    session.history.forEach((msg, index) => {
      historyText += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    });
    
    const prompt = `${historyText}\n\nNow respond to the latest user message: "${q}"\nKeep response natural and conversational.`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512,
      }
    };
    
    const response = await axios.post(
      GEMINI_API_URL,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000
      }
    );
    
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      session.history.push({ role: 'assistant', content: aiResponse });
      
      await reply(aiResponse);
    } else {
      reply("❌ Couldn't generate response. Please try again.");
    }
    
  } catch (error) {
    console.error("AI Chat Error:", error);
    reply("❌ Chat error. Session cleared. Start new chat with .aichat start");
    chatSessions.delete(sender);
  }
});
