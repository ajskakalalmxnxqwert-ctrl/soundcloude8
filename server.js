const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Explicit CORS for WordPress
app.use(cors());
app.use(express.json());

// 1. Root Route (Test this in your browser)
app.get("/", (req, res) => {
    res.send("<h1>SoundCloud Backend is Live! ✅</h1><p>API is ready at /api/resolve</p>");
});

// 2. Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API is working" });
});

// 3. Resolve SoundCloud URL
app.get("/api/resolve", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"; // Standard public ID

    try {
        const r = await axios.get(`https://api-v2.soundcloud.com/resolve`, { 
            params: { url, client_id: CLIENT_ID } 
        });
        const trackData = r.data;
        const transcodings = trackData.media.transcodings;
        const best = transcodings.find(t => t.format.protocol === 'progressive') || transcodings[0];
        const streamRes = await axios.get(best.url, { params: { client_id: CLIENT_ID } });

        res.json({
            title: trackData.title,
            artist: trackData.user.username,
            thumbnail: trackData.artwork_url || trackData.user.avatar_url,
            download_url: streamRes.data.url
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "SoundCloud refused the connection. Try again in a minute." });
    }
});

// 4. Download Proxy
app.get("/api/download-proxy", async (req, res) => {
    const { url, title } = req.query;
    try {
        const response = await axios({ method: 'get', url: url, responseType: 'stream' });
        res.setHeader("Content-Disposition", `attachment; filename="${title || 'track'}.mp3"`);
        res.setHeader("Content-Type", "audio/mpeg");
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Download failed.");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
