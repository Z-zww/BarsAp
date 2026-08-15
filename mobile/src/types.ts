export interface Ingredient { name: string; amount?: string; }

export interface VideoLink { title: string; url: string; }

export interface Drink {
  id: string;
  name: string;
  nameEn: string | null;
  category: string | null;
  moods: string[];
  image: string | null;
  summary: string | null;
  history: string | null;
  ingredients: Ingredient[];
  steps: string[];
  videos: VideoLink[];
  tags: string[];
}

export interface Post {
  id: number;
  title: string;
  ingredients: string[];
  steps: string[];
  image: string | null;
  created_at: string;
  author: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  username: string;
}

export interface MoodRecord {
  date: string;
  mood: string;
  note: string | null;
  emoji: string;
  label: string;
}

export interface User { id: number; username: string; }
