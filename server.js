const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');

// Import instance ZingMp3 từ TypeScript/JavaScript build
const zingApiModule = require('./dist/index.js');
const zingApi = zingApiModule.default || zingApiModule;

const app = express();
const PORT = process.env.PORT || 5555;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let vnProxyAgent = null;

// Tự động xoay Proxy VN tươi
async function refreshVNProxy() {
  try {
    const apiUrl = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=VN&ssl=all&anonymity=all';
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const proxyList = response.data.split('\r\n').filter(Boolean);

    if (proxyList.length > 0) {
      const activeProxy = `http://${proxyList[0]}`;
      console.log(`[Proxy VN] Đã kết nối Proxy VN: ${activeProxy}`);
      vnProxyAgent = new HttpsProxyAgent(activeProxy);
    } else {
      console.log('[Proxy VN] Không tìm thấy Proxy free, sử dụng kết nối trực tiếp.');
      vnProxyAgent = null;
    }
  } catch (error) {
    console.error('[Proxy VN] Lỗi cào Proxy VN:', error.message);
    vnProxyAgent = null;
  }
}

refreshVNProxy();
setInterval(refreshVNProxy, 15 * 60 * 1000);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', proxyActive: !!vnProxyAgent });
});

app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ err: -1, msg: 'Thiếu từ khóa search (q)' });
    const data = await zingApi.search(keyword, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

app.get('/api/song', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id' });
    const data = await zingApi.getSong(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Endpoint redirect trực tiếp đến link MP3 Stream 128kbps
app.get('/api/song/stream', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id' });

    const data = await zingApi.getSong(songId, vnProxyAgent);
    if (data && data.data && data.data['128']) {
      return res.redirect(data.data['128']);
    }
    res.status(404).json(data || { err: -1, msg: 'Không tìm thấy nguồn nhạc MP3 128kbps (Bài hát có thể yêu cầu tài khoản VIP)' });
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

app.get('/api/info-song', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id' });
    const data = await zingApi.getInfoSong(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

app.get('/api/lyric', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id' });
    const data = await zingApi.getLyric(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server Zing MP3 API đang chạy tại cổng ${PORT}`);
});