const fs = require("fs");
if (fs.existsSync("config.env"))
  require("dotenv").config({ path: "./config.env" });

function convertToBool(text, fault = "true") {
  return text === fault ? true : false;
}

module.exports = {
  SESSION_ID: process.env.SESSION_ID || "𝙰𝚂𝙸𝚃𝙷𝙰-𝙼𝙳=dd76e2bee0917471",
  OWNER_NUM: process.env.OWNER_NUM || "94752978237",
  PREFIX: process.env.PREFIX || ".",
  ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/fpyw9m.png",
  ALIVE_MSG: process.env.ALIVE_MSG || "Iam Alive Now!! ★𝐃𝐓𝐙 𝐍𝐎𝐕𝐀 𝐗 𝐌𝐃★ 🤭💗 ආහ් පැටියෝ කොහොමද ?🌝!\n\n🥶ＤＴＺ ＴＥＡＭ🥶",
  AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
  MODE: process.env.MODE || "public",
  AUTO_STICKER: process.env.AUTO_STICKER || "true",  // Added missing comma here
  MOVIE_API_KEY: process.env.MOVIE_API_KEY || "sky|9d3c4942490b636ca58c82c6da4a599039358cdc"
};
