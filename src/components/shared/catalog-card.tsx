import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CatalogCard({
  icon,
  title,
  desc,
  badge,
  color,
  from,
  to,
  prize,
  onPress,
}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={catalogStyles.wrap}
    >
      <LinearGradient
        colors={[from + '18', to + '10']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[catalogStyles.border, { borderColor: from + '33' }]} />

      {/* Main Row - Icon and Content */}
      <View style={catalogStyles.mainRow}>
        <View
          style={[catalogStyles.iconWrap, { backgroundColor: color + '22' }]}
        >
          {typeof icon === 'string' && /\p{Emoji_Presentation}/u.test(icon) ? (
            <Text style={{ fontSize: 28 }}>{icon}</Text>
          ) : typeof icon === 'string' ? (
            <Ionicons name={icon as any} size={28} color={color} />
          ) : (
            <Image source={icon} style={catalogStyles.icon} />
          )}
        </View>

        <View style={catalogStyles.contentColumn}>
          {/* Title and Badge Row */}
          <View style={catalogStyles.topRow}>
            <Text style={catalogStyles.title} numberOfLines={1}>
              {title}
            </Text>
            {badge && (
              <View
                style={[
                  catalogStyles.badge,
                  { backgroundColor: color + '22', borderColor: color + '44' },
                ]}
              >
                <Text style={[catalogStyles.badgeText, { color }]}>
                  {badge}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={catalogStyles.desc} numberOfLines={1}>
            {desc}
          </Text>

          {/* Bottom Row - Prize and Action */}
          <View style={catalogStyles.bottomRow}>
            {prize ? (
              <View style={catalogStyles.prizeWrap}>
                <Text style={catalogStyles.prizeIcon}>🏆</Text>
                <Text style={catalogStyles.prizeText}>{prize} UZS</Text>
              </View>
            ) : null}
            <View
              style={[
                catalogStyles.actionBtn,
                { backgroundColor: color + '22', borderColor: color + '44' },
              ]}
            >
              <Text style={[catalogStyles.actionText, { color }]}>Начать</Text>
              <Ionicons name="arrow-forward" size={10} color={color} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const catalogStyles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'center',
  },
  contentColumn: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 30, height: 30 },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    flexShrink: 0,
  },
  badgeText: { fontSize: 8, fontWeight: '700' },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  desc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    lineHeight: 13,
  },
  priceBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  price: { fontSize: 10, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 7,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  prizeWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prizeIcon: {
    fontSize: 10,
  },
  prizeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
});
