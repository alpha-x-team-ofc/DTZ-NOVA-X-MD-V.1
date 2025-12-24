const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require("./lib/functions");
const fs = require("fs");
const P = require("pino");
const config = require("./config");
const qrcode = require("qrcode-terminal");
const util = require("util");
const { sms, downloadMediaMessage } = require("./lib/msg");
const axios = require("axios");
const { File } = require("megajs");
const prefix = config.PREFIX;
(async () => {
  const { default: fetch } = await import('node-fetch');
  globalThis.fetch = fetch;
})();

const ownerNumber = config.OWNER_NUM;

//===================SESSION-AUTH============================
if (!fs.existsSync(__dirname + "/auth_info_baileys/creds.json")) {
  if (!config.SESSION_ID)
    return console.log("Please add your session to SESSION_ID env !!");
  
  const sessdata = config.SESSION_ID;
  
  // FIXED: Check if SESSION_ID is a valid Mega.nz URL or just a hash
  if (sessdata.includes("mega.nz/file/")) {
    // If it's a full URL
    const file = File.fromURL(sessdata);
    file.loadAttributes((err, file) => {
      if (err) {
        console.error("Error loading Mega.nz file:", err.message);
        console.log("Creating new session instead...");
        return;
      }
      file.download((err, data) => {
        if (err) {
          console.error("Error downloading session:", err.message);
          console.log("Creating new session instead...");
          return;
        }
        fs.writeFileSync(__dirname + "/auth_info_baileys/creds.json", data);
        console.log("Session downloaded ✅ from Mega.nz");
      });
    });
  } else if (sessdata.includes("#")) {
    // If it's just a hash (e.g., "FILEID#KEY")
    const parts = sessdata.split("#");
    if (parts.length === 2) {
      const file = File.fromURL(`https://mega.nz/file/${parts[0]}#${parts[1]}`);
      file.loadAttributes((err, file) => {
        if (err) {
          console.error("Invalid session hash:", err.message);
          console.log("Creating new session instead...");
          return;
        }
        file.download((err, data) => {
          if (err) {
            console.error("Error downloading session:", err.message);
            console.log("Creating new session instead...");
            return;
          }
          fs.writeFileSync(__dirname + "/auth_info_baileys/creds.json", data);
          console.log("Session downloaded ✅ from hash");
        });
      });
    } else {
      console.log("Invalid session format. Creating new session...");
    }
  } else {
    // If SESSION_ID is not a valid URL/hash
    console.log("Invalid SESSION_ID format. Creating new session...");
  }
}

// Alternative: SIMPLER FIX - Just create new session if download fails
/
if (!fs.existsSync(__dirname + "/auth_info_baileys/creds.json")) {
  if (!config.SESSION_ID) {
    console.log("No session provided. Creating new session...");
  } else {
    try {
      // Try to download session
      const file = File.fromURL(config.SESSION_ID);
      const data = await new Promise((resolve, reject) => {
        file.download((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      fs.writeFileSync(__dirname + "/auth_info_baileys/creds.json", data);
      console.log("Session downloaded ✅");
    } catch (error) {
      console.log("Failed to download session. Creating new session...");
    }
  }
}
*

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

//=============================================

async function connectToWA() {

//===========================

  console.log("Connecting ＤＴＺ ＮＯＶＡ Ｘ ＭＤ");
  const { state, saveCreds } = await useMultiFileAuthState(
    __dirname + "/auth_info_baileys/"
  );
  var { version } = await fetchLatestBaileysVersion();

  const robin = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version,
  });

  // ADD QR CODE GENERATION
  robin.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Display QR Code if needed
    if (qr) {
      console.log("Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === "close") {
      if (
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
      ) {
        console.log("Connection closed. Reconnecting...");
        setTimeout(() => connectToWA(), 5000);
      }
    } else if (connection === "open") {
      console.log(" Installing... ");
      const path = require("path");
      fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() == ".js") {
          require("./plugins/" + plugin);
        }
      });
      console.log("ＤＴＺ ＮＯＶＡ Ｘ ＭＤ installed successful ✅");
      console.log("ＤＴＺ ＮＯＶＡ Ｘ ＭＤ connected to whatsapp ✅");

      let up = `ＤＴＺ ＮＯＶＡ Ｘ ＭＤ connected successful ✅`;
      let up1 = `Hello ＤＴＺ ＮＯＶＡ Ｘ ＭＤ, I made bot successful`;

      // FIXED: Use proper error handling for owner notifications
      try {
        await robin.sendMessage(ownerNumber + "@s.whatsapp.net", {
          image: { url: `https://files.catbox.moe/fpyw9m.png` },
          caption: up,
        });
        
        // Remove duplicate sending or fix number
        if (ownerNumber !== "94752978237") {
          await robin.sendMessage("94752978237@s.whatsapp.net", {
            image: { url: `https://files.catbox.moe/fpyw9m.png` },
            caption: up1,
          });
        }
      } catch (error) {
        console.log("Couldn't send startup message:", error.message);
      }
    }
  });
  
  robin.ev.on("creds.update", saveCreds);
  
  // ... rest of your message handling code remains the same ...
  robin.ev.on("messages.upsert", async (mek) => {
    // Your existing message handling code
    // (Keep all your existing code from line 105 onwards)
  });
}

app.get("/", (req, res) => {
  res.send("hey, ＤＴＺ ＮＯＶＡ Ｘ ＭＤ started✅");
});

app.listen(port, () =>
  console.log(`Server listening on port http://localhost:${port}`)
);

setTimeout(() => {
  connectToWA();
}, 4000);
