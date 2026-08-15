export interface Mood { slug: string; emoji: string; label: string; }

// 与后端 server/src/moods-meta.js 保持一致
export const MOODS: Mood[] = [
  { slug: 'happy', emoji: '😄', label: '开心' },
  { slug: 'excited', emoji: '🤩', label: '兴奋' },
  { slug: 'calm', emoji: '😌', label: '平静' },
  { slug: 'sad', emoji: '😢', label: '难过' },
  { slug: 'anxious', emoji: '😰', label: '焦虑' },
  { slug: 'tired', emoji: '😫', label: '疲惫' },
  { slug: 'lonely', emoji: '🥺', label: '孤独' },
  { slug: 'angry', emoji: '😠', label: '生气' },
];

export const MOOD_MAP: Record<string, Mood> = {};
for (const m of MOODS) MOOD_MAP[m.slug] = m;
