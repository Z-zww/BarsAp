// 心情元数据：slug / emoji / 中文标签（移动端也有同份常量，保持同步）
const MOODS = [
  { slug: 'happy', emoji: '😄', label: '开心' },
  { slug: 'excited', emoji: '🤩', label: '兴奋' },
  { slug: 'calm', emoji: '😌', label: '平静' },
  { slug: 'sad', emoji: '😢', label: '难过' },
  { slug: 'anxious', emoji: '😰', label: '焦虑' },
  { slug: 'tired', emoji: '😫', label: '疲惫' },
  { slug: 'lonely', emoji: '🥺', label: '孤独' },
  { slug: 'angry', emoji: '😠', label: '生气' },
];

const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.slug, m]));

module.exports = { MOODS, MOOD_MAP };
