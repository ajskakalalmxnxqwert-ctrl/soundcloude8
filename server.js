const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const CLIENT_IDS = [
  "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj",
  "iZIs4mchueS9S0qSH97Yp7YyvO46pZ2i",
  "2t9qZos706ST5v35u8A3pU9V9JS887S8"
];

app.get("/", (req, res) => {
  res.send("Server running ✅");
});

app.get("/api/resolve", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    let trackData = null;
    let workingId = "";

    for (const id of CLIENT_IDS) {
      try {
        const r = await axios.get(`https://api-v2.soundcloud.com/resolve`, {
          params: { url, client_id: id }
        });
        trackData = r.data;
        workingId = id;
        break;
      } catch (e) {}
    }

    if (!trackData) throw new Error("Could not resolve track.");

    const transcodings = trackData.media.transcodings;
    const best =
      transcodings.find(t => t.format.protocol === 'progressive') ||
      transcodings[0];

    const streamRes = await axios.get(best.url, {
      params: { client_id: workingId }
    });

    res.json({
      title: trackData.title,
      artist: trackData.user.username,
      thumbnail: trackData.artwork_url || trackData.user.avatar_url,
      download_url: streamRes.data.url
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to resolve track." });
  }
});

app.get("/api/download", async (req, res) => {
  const { url, title } = req.query;

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(title || "track").replace(/[^\w\s]/gi, "")}.mp3"`
    );
    res.setHeader("Content-Type", "audio/mpeg");

    response.data.pipe(res);

  } catch (e) {
    res.status(500).send("Download failed.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
