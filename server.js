const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (Crucial for WordPress)
app.use(cors());
app.use(express.json());

// --- CONFIG ---
// We use a known working public client_id. 
// If this fails, the tool will show a clear error.
const CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"; 

app.get("/", (req, res) => {
    res.send("<h1>SoundCloud Backend: ONLINE ✅</h1>");
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// Resolve Track Info
app.get("/api/resolve", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        // 1. Resolve the SoundCloud URL to track data
        const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${CLIENT_ID}`;
        const r = await axios.get(resolveUrl);
        const trackData = r.data;

        if (!trackData.media || !trackData.media.transcodings) {
            throw new Error("Track is not downloadable or private.");
        }

        // 2. Find the best stream (progressive is best for downloading)
        const transcodings = trackData.media.transcodings;
        const best = transcodings.find(t => t.format.protocol === 'progressive') || transcodings[0];
        
        // 3. Get the actual stream URL
        const streamRes = await axios.get(`${best.url}?client_id=${CLIENT_ID}`);

        res.json({
            title: trackData.title,
            artist: trackData.user.username,
            thumbnail: trackData.artwork_url || trackData.user.avatar_url,
            download_url: streamRes.data.url // This is the direct .mp3 link
        });
    } catch (error) {
        console.error("Resolve Error:", error.message);
        const msg = error.response?.status === 404 ? "Track not found." : "SoundCloud API Error. Try again.";
        res.status(500).json({ error: msg });
    }
});

// Proxy Download (Forces the browser to download instead of play)
app.get("/api/download-proxy", async (req, res) => {
    const { url, title } = req.query;
    if (!url) return res.status(400).send("No URL provided");

    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        // Clean the title for the filename
        const safeTitle = (title || "track").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
        res.setHeader("Content-Type", "audio/mpeg");
        response.data.pipe(res);
    } catch (e) {
        console.error("Proxy Error:", e.message);
        res.status(500).send("Download failed. The link might have expired.");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
