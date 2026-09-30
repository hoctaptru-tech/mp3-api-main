const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');

// Nhập module Zing MP3 API từ thư mục dist (hoặc src tùy dự án)
const zingApi = require('./dist/index.js'); 

const app = express();
const PORT = process.env.PORT || 5555;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Biến lưu trữ Agent Proxy VN
let vnProxyAgent = null;

// Hàm tự động cào Proxy Việt Nam tươi từ ProxyScrape API
async function refreshVNProxy() {
  try {
    const apiUrl = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=VN&ssl=all&anonymity=all';
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const proxyList = response.data.split('\r\n').filter(Boolean);

    if (proxyList.length > 0) {
      const activeProxy = `http://${proxyList[0]}`;
      console.log(`[Proxy VN] Đã tìm thấy Proxy VN mới: ${activeProxy}`);
      vnProxyAgent = new HttpsProxyAgent(activeProxy);
    } else {
      console.log('[Proxy VN] Không tìm thấy Proxy VN free nào khả dụng, sử dụng kết nối trực tiếp.');
      vnProxyAgent = null;
    }
  } catch (error) {
    console.error('[Proxy VN] Lỗi khi lấy danh sách Proxy VN:', error.message);
    vnProxyAgent = null;
  }
}

// Gọi lấy Proxy VN ngay khi server khởi động
refreshVNProxy();
// Tự động làm mới Proxy mỗi 15 phút để tránh IP die
setInterval(refreshVNProxy, 15 * 60 * 1000);

// Endpoint kiểm tra trạng thái
app.get('/health', (req, res) => {
  res.json({ status: 'OK', proxyActive: !!vnProxyAgent });
});

// Endpoint tìm kiếm bài hát
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ err: -1, msg: 'Thiếu từ khóa q' });
    
    // Gọi API qua Proxy nếu có
    const data = await zingApi.search(keyword, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Endpoint lấy link stream
app.get('/api/song', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu song ID' });

    const data = await zingApi.getSong(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Endpoint redirect trực tiếp đến file mp3 chất lượng 128kbps
app.get('/api/song/stream', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu song ID' });

    const data = await zingApi.getSong(songId, vnProxyAgent);
    if (data && data.data && data.data['128']) {
      return res.redirect(data.data['128']);
    }
    res.status(404).json(data || { err: -1, msg: 'Không tìm thấy nguồn nhạc' });
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Endpoint thông tin chi tiết bài hát
app.get('/api/info-song', async (req, res) => {
  try {
    const songId = req.query.id;
    const data = await zingApi.getInfoSong(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Endpoint lời bài hát
app.get('/api/lyric', async (req, res) => {
  try {
    const songId = req.query.id;
    const data = await zingApi.getLyric(songId, vnProxyAgent);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});