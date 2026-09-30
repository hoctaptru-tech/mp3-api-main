import axios from 'axios';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class ZingMp3 {
  private VERSION = '1.10.19';
  private API_KEY = 'X533435334';
  private SECRET_KEY = 'ac82a40121703e7e22131922c2628dd1';

  private getHash256(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  private getHmac512(str: string, key: string): string {
    return crypto.createHmac('sha512', key).update(str).digest('hex');
  }

  private getSignature(path: string, ctime: number, id?: string): string {
    const hash256 = id ? this.getHash256(`id=${id}`) : '';
    const rawSig = `ctime=${ctime}version=${this.VERSION}${hash256}`;
    return this.getHmac512(`${path}${this.getHash256(rawSig)}`, this.SECRET_KEY);
  }

  private async request(path: string, params: any = {}, agent?: HttpsProxyAgent<string>) {
    const ctime = Math.floor(Date.now() / 1000);
    const sig = this.getSignature(path, ctime, params.id);

    const config: any = {
      params: {
        ...params,
        ctime,
        version: this.VERSION,
        apiKey: this.API_KEY,
        sig,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://zingmp3.vn/',
        'Cookie': 'zmp3_rqid=MHwyMDEuMTE2LjUyLjE1N3wxNzI3NzA1NjAw'
      },
      timeout: 10000
    };

    if (agent) {
      config.httpsAgent = agent;
      config.httpAgent = agent;
    }

    const response = await axios.get(`https://zingmp3.vn${path}`, config);
    return response.data;
  }

  // --- GET SONG ---
  public async getSong(songId: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/song/get/song', { id: songId }, agent);
  }

  // --- GET DETAIL PLAYLIST ---
  public async getDetailPlaylist(playlistId: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/playlist', { id: playlistId }, agent);
  }

  // --- GET HOME ---
  public async getHome(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/home', {}, agent);
  }

  // --- GET TOP 100 ---
  public async getTop100(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/top-100', {}, agent);
  }

  // --- GET CHART HOME ---
  public async getChartHome(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/chart-home', {}, agent);
  }

  // --- GET NEW RELEASE CHART ---
  public async getNewReleaseChart(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/new-release-chart', {}, agent);
  }

  // --- GET INFO SONG ---
  public async getInfoSong(songId: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/song/get/info', { id: songId }, agent);
  }

  // --- GET ARTIST ---
  public async getArtist(name: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/artist', { name }, agent);
  }

  // --- GET ARTIST SONG ---
  public async getArtistSong(id: string, page: number = 1, count: number = 15, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/song/get/list', { id, type: 'artist', page, count }, agent);
  }

  // --- GET LYRIC ---
  public async getLyric(songId: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/lyric/get/lyric', { id: songId }, agent);
  }

  // --- SEARCH ---
  public async search(query: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/search/multi', { q: query }, agent);
  }

  // --- GET LIST MV ---
  public async getListMV(id: string, page: number = 1, count: number = 15, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/video/get/list', { id, type: 'genre', page, count }, agent);
  }

  // --- GET CATEGORY MV ---
  public async getCategoryMV(id: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/genre/get/info', { id }, agent);
  }

  // --- GET MV ---
  public async getMV(id: string, agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/video/get/info', { id }, agent);
  }

  // --- GET EVENT ---
  public async getEvent(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/event/get/list', {}, agent);
  }

  // --- GET RADIO ---
  public async getRadio(agent?: HttpsProxyAgent<string>) {
    return this.request('/api/v2/page/get/radio', {}, agent);
  }
}

export default new ZingMp3();