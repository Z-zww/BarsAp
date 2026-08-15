import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'drinker_token';

function resolveBase(): string {
  const extra = (Constants.expoConfig?.extra || {}) as { apiUrl?: string };
  if (extra && extra.apiUrl) return extra.apiUrl;
  // 用 Expo 开发服务器所在主机作为后端主机（同一台电脑跑后端，端口 4000）
  const hostUri: string = Constants.expoConfig?.hostUri || '';
  const host = hostUri.split(':')[0];
  return 'http://' + (host || 'localhost') + ':4000';
}

let customBase: string | null = null;

const API_BASE_KEY = 'drinker_api_url';

export function getBase(): string {
  return customBase || resolveBase();
}

export async function loadApiBase(): Promise<string> {
  const v = await AsyncStorage.getItem(API_BASE_KEY);
  customBase = v || null;
  return getBase();
}

export async function setApiBase(url: string): Promise<string> {
  let u = (url || '').trim();
  if (u && !u.startsWith('http://') && !u.startsWith('https://')) u = 'http://' + u;
  while (u.endsWith('/')) u = u.slice(0, -1);
  customBase = u || null;
  if (u) await AsyncStorage.setItem(API_BASE_KEY, u);
  else await AsyncStorage.removeItem(API_BASE_KEY);
  return getBase();
}

export function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return getBase() + url;
}

let token: string | null = null;
export function setToken(t: string | null) { token = t; }

export async function loadToken(): Promise<string | null> {
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  setToken(t);
  return t;
}

export async function saveToken(t: string | null) {
  setToken(t);
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let res: any;
  try {
    res = await fetch(getBase() + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError('无法连接服务器，请确认后端已启动（' + getBase() + '）');
  }
  let data: any = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new ApiError((data && data.error) || ('HTTP ' + res.status));
  return data as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  }
  return parts.length ? '?' + parts.join('&') : '';
}

export const api = {
  register: (username: string, password: string) => request('POST', '/api/auth/register', { username, password }),
  login: (username: string, password: string) => request('POST', '/api/auth/login', { username, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/me'),
  moodsToday: () => request('GET', '/api/moods/today'),
  moods: (month: string) => request('GET', '/api/moods' + qs({ month })),
  saveMood: (date: string, mood: string | null, note?: string | null) => request('POST', '/api/moods', { date, mood, note }),
  deleteMood: (date: string) => request('DELETE', '/api/moods/' + encodeURIComponent(date)),
  drinks: (opts?: { mood?: string; q?: string; limit?: number }) => request('GET', '/api/drinks' + qs(opts || {})),
  drinksNetwork: (q: string) => request('GET', '/api/drinks/network' + qs({ q })),
  drink: (id: string) => request('GET', '/api/drinks/' + encodeURIComponent(id)),
  posts: (sort?: string) => request('GET', '/api/posts' + qs({ sort })),
  post: (id: number) => request('GET', '/api/posts/' + id),
  createPost: (data: { title: string; ingredients: string[]; steps: string[]; image?: string }) => request('POST', '/api/posts', data),
  deletePost: (id: number) => request('DELETE', '/api/posts/' + id),
  like: (id: number) => request('POST', '/api/posts/' + id + '/like'),
  comment: (id: number, content: string) => request('POST', '/api/posts/' + id + '/comments', { content }),
  deleteComment: (id: number) => request('DELETE', '/api/comments/' + id),
};
