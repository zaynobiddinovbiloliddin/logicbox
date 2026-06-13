import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, { ForwardedRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RatingModalProps {
  sheetRef: ForwardedRef<BottomSheet | null>;
}

interface PlayerRating {
  id: string;
  name: string;
  score: number;
  rank: number;
  isMe?: boolean;
  avatar?: string;
}

const MOCK_RATINGS: PlayerRating[] = [
  { id: '1', name: 'Alex Thunder', score: 12500, rank: 1 },
  { id: '2', name: 'Sarah Logic', score: 11800, rank: 2 },
  { id: '3', name: 'Mike Mind', score: 10200, rank: 3 },
  { id: '4', name: 'Ivan Ivanov', score: 9500, rank: 4 },
  { id: '5', name: 'Elena Smart', score: 8900, rank: 5 },
  { id: '6', name: 'John Doe', score: 7500, rank: 12, isMe: true },
  { id: '7', name: 'User 7', score: 7200, rank: 13 },
  { id: '8', name: 'User 8', score: 6800, rank: 14 },
];

export default function GameRatingModal({ sheetRef }: RatingModalProps) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.7}
      />
    ),
    []
  );

  const renderItem = useCallback(({ item }: { item: PlayerRating }) => {
    return (
      <View style={[styles.ratingItem, item.isMe && styles.ratingItemMe]}>
        <View style={styles.rankContainer}>
          {item.rank <= 3 ? (
            <Text style={styles.rankEmoji}>
              {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
            </Text>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={['#4D96FF', '#C77DFF']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>

        <View style={styles.nameWrap}>
          <Text style={[styles.playerName, item.isMe && styles.playerNameMe]}>
            {item.name} {item.isMe && t('components.gameRatingModal.you')}
          </Text>
        </View>

        <View style={styles.scoreWrap}>
          <Text style={styles.scoreText}>{item.score.toLocaleString()}</Text>
          <Ionicons name="flash" size={12} color="#FFD700" />
        </View>
      </View>
    );
  }, []);

  const snapPoints = useMemo(() => ['60%', '90%'], []);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      topInset={top}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('components.gameRatingModal.title')}</Text>
        <Text style={styles.subtitle}>{t('components.gameRatingModal.subtitle')}</Text>
      </View>

      <BottomSheetFlatList
        data={MOCK_RATINGS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#050a14',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ratingItemMe: {
    backgroundColor: 'rgba(77,150,255,0.1)',
    borderColor: 'rgba(77,150,255,0.3)',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  nameWrap: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  playerNameMe: {
    color: '#4D96FF',
    fontWeight: '800',
  },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '900',
  },
});
