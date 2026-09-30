const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');

// Import thư viện ZingMp3 chuẩn từ thư mục dist (Xử lý đúng cấu trúc export)
const ZingMp3Module = require('./dist/index.js');
const zingApi = ZingMp3Module.ZingMp3 || ZingMp3Module.default || ZingMp3Module;

const app = express();
const PORT = process.env.PORT || 5555;

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Biến lưu Agent Proxy Việt Nam
let vnProxyAgent = null;

// Hàm cào Proxy VN tự động từ API miễn phí
async function refreshVNProxy() {
  try {
    const apiUrl = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=VN&ssl=all&anonymity=all';
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const proxyList = response.data.split('\r\n').filter(Boolean);

    if (proxyList.length > 0) {
      const activeProxy = `http://${proxyList[0]}`;
      console.log(`[Proxy VN] Đã kết nối Proxy VN mới: ${activeProxy}`);
      vnProxyAgent = new HttpsProxyAgent(activeProxy);
    } else {
      console.log('[Proxy VN] Chưa tìm thấy Proxy free khả dụng, sẽ thử lại sau.');
      vnProxyAgent = null;
    }
  } catch (error) {
    console.error('[Proxy VN] Lỗi khi làm mới Proxy:', error.message);
    vnProxyAgent = null;
  }
}

// Khởi tạo Proxy khi bắt đầu chạy và cập nhật mỗi 15 phút
refreshVNProxy();
setInterval(refreshVNProxy, 15 * 60 * 1000);

// Helper hỗ trợ gọi API ZingMp3 linh hoạt
async function callZingApi(fnName, param) {
  if (typeof zingApi[fnName] === 'function') {
    return await zingApi[fnName](param, vnProxyAgent);
  } else if (typeof zingApi === 'function') {
    const instance = new zingApi();
    if (typeof instance[fnName] === 'function') {
      return await instance[fnName](param, vnProxyAgent);
    }
  }
  throw new Error(`Hàm ${fnName} không tồn tại trên ZingMp3 API module.`);
}

// --- CÁC ENDPOINT API CỦA SERVER ---

// 1. Kiểm tra trạng thái Server
app.get('/health', (req, res) => {
  res.json({ status: 'OK', proxyActive: !!vnProxyAgent });
});

// 2. Tìm kiếm bài hát / nghệ sĩ
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ err: -1, msg: 'Thiếu từ khóa tìm kiếm (q)' });
    
    const data = await callZingApi('search', keyword);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// 3. Lấy thông tin bài hát (kèm link stream)
app.get('/api/song', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id bài hát' });

    const data = await callZingApi('getSong', songId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// 4. Redirect trực tiếp đến link file MP3 128kbps (để phát nhạc ngay)
app.get('/api/song/stream', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id bài hát' });

    const data = await callZingApi('getSong', songId);
    if (data && data.data && data.data['128']) {
      return res.redirect(data.data['128']);
    }
    res.status(404).json(data || { err: -1, msg: 'Không tìm thấy nguồn nhạc MP3' });
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// 5. Lấy thông tin chi tiết bài hát (Detail Info)
app.get('/api/info-song', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id bài hát' });

    const data = await callZingApi('getInfoSong', songId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// 6. Lấy lời bài hát (Lyric)
app.get('/api/lyric', async (req, res) => {
  try {
    const songId = req.query.id;
    if (!songId) return res.status(400).json({ err: -1, msg: 'Thiếu tham số id bài hát' });

    const data = await callZingApi('getLyric', songId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ err: -1, msg: error.message });
  }
});

// Lắng nghe cổng khởi chạy
app.listen(PORT, () => {
  console.log(`Server Zing MP3 API đang chạy tại port ${PORT}`);
});