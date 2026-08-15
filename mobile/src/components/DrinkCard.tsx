import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Drink } from '../types';
import { MOOD_MAP } from '../moods';
import { resolveImg } from '../api';
import { theme, spacing } from '../theme';

export default function DrinkCard({ drink, onPress }: { drink: Drink; onPress: () => void }) {
  const img = resolveImg(drink.image);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {img ? (
        <Image source={{ uri: img }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}><Text style={styles.placeholderText}>🍹</Text></View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{drink.name}</Text>
        {drink.nameEn ? <Text style={styles.nameEn}>{drink.nameEn}</Text> : null}
        {drink.summary ? <Text style={styles.summary} numberOfLines={2}>{drink.summary}</Text> : null}
        <View style={styles.moods}>
          {drink.moods.map((m) => (
            MOOD_MAP[m] ? <Text key={m} style={styles.moodTag}>{MOOD_MAP[m].emoji} {MOOD_MAP[m].label}</Text> : null
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  image: { width: '100%', height: 160 },
  placeholder: { backgroundColor: '#F3EDE4', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 48 },
  body: { padding: spacing(3) },
  name: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  nameEn: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  summary: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(2), lineHeight: 20 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginTop: spacing(2) },
  moodTag: { fontSize: 12, color: theme.colors.primaryDark, backgroundColor: '#F6E9E1', paddingHorizontal: spacing(2), paddingVertical: 2, borderRadius: 999 },
});
