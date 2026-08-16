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
  author_avatar?: string | null;
  ingredients: string[];
  steps: string[];
  image: string | null;
  created_at: string;
  author: string;
  author_id: number;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface CommentItem {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar?: string | null;
}

export interface MoodRecord {
  date: string;
  mood: string | null;
  note: string | null;
  emoji: string;
  label: string;
}

export interface Memo {
  id: number;
  date: string;
  content: string;
  created_at: string;
}

export interface User { id: number; username: string; avatar?: string | null; }

export interface DirectMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export interface Conversation {
  user: User;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  online: boolean;
}

export interface AppNotification {
  id: number;
  type: 'message' | 'follow' | 'like' | 'comment' | string;
  title: string;
  body: string;
  data: { userId?: number; postId?: number };
  read_at: string | null;
  created_at: string;
}
