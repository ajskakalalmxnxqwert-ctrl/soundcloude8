const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"; 

app.get("/", (req, res) => res.send("Backend Active ✅"));

app.get("/api/resolve", async (req, res) => {
    const { url } = req.query;
    try {
        const r = await axios.get(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${CLIENT_ID}`);
        const transcodings = r.data.media.transcodings;
        const best = transcodings.find(t => t.format.protocol === 'progressive') || transcodings[0];
        const streamRes = await axios.get(`${best.url}?client_id=${CLIENT_ID}`);

        res.json({
            title: r.data.title,
            download_url: streamRes.data.url
        });
    } catch (error) {
        res.status(500).json({ error: "SoundCloud Error" });
    }
});

app.get("/api/download-proxy", async (req, res) => {
    const { url, title } = req.query;
    try {
        const response = await axios({ method: 'get', url: url, responseType: 'stream' });
        const safeTitle = (title || "track").replace(/[^a-z0-9]/gi, '_');
        
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
        res.setHeader("Content-Type", "application/octet-stream"); 
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Download failed.");
    }
});

app.listen(PORT, '0.0.0.0');
