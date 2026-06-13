import { useAuthStore } from '@/store/auth';
import { useDiamondsSheetStore } from '@/store/diamonds-sheet';
import { useWalletStore } from '@/store/wallet';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUICK_AMOUNTS = [1000, 10000, 25000, 50000, 100000];
const MIN_WITHDRAW = 1000;

const PAYMENT_METHODS = [
  { id: 'click', label: 'Click', color: '#00AAFF', bg: '#00AAFF18' },
  { id: 'payme', label: 'Payme', color: '#FF3366', bg: '#FF336618' },
  { id: 'uzum', label: 'Uzum', color: '#A855F7', bg: '#A855F718' },
];

type Tab = 'topup' | 'withdraw';

export function GlobalDiamondsSheet() {
  const { t } = useTranslation();
  const { isOpen, close } = useDiamondsSheetStore();
  const { addBalance } = useWalletStore();
  const authUser = useAuthStore((s) => s.user);
  const authWithdraw = useAuthStore((s) => s.withdrawBalance);
  const balance = authUser?.info?.balance ?? 0;
  const sheetRef = useRef<BottomSheet>(null);

  const [tab, setTab] = useState<Tab>('topup');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    close();
    setAmount('');
    setSelectedMethod(null);
    setCardNumber('');
    setWithdrawAmount('');
    setTab('topup');
  }, [close]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        onPress={handleClose}
      />
    ),
    [handleClose]
  );

  const { top } = useSafeAreaInsets();

  // TOP UP logic
  const numericAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isTopUpValid =
    numericAmount >= QUICK_AMOUNTS[0] && selectedMethod !== null;

  function handleAmountChange(text: string) {
    setAmount(text.replace(/\D/g, ''));
  }

  function handleQuickSelect(val: number) {
    setAmount(val.toString());
  }

  function handleTopUp() {
    if (!isTopUpValid) return;
    addBalance(numericAmount);
    Alert.alert(
      t('components.globalDiamondsSheet.successTitle'),
      t('components.globalDiamondsSheet.topupSuccess', {
        amount: numericAmount.toLocaleString(),
      }),
      [{ text: t('components.globalDiamondsSheet.ok'), onPress: handleClose }]
    );
  }

  // WITHDRAW logic
  const RESERVE = 1000;
  const maxWithdrawable = Math.max(0, balance - RESERVE);
  const numericWithdraw = parseInt(withdrawAmount.replace(/\D/g, ''), 10) || 0;
  const formattedCard = cardNumber
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
  const rawCard = cardNumber.replace(/\D/g, '');
  const isWithdrawValid =
    numericWithdraw >= MIN_WITHDRAW &&
    numericWithdraw <= maxWithdrawable &&
    rawCard.length === 16;

  function handleCardChange(text: string) {
    setCardNumber(text.replace(/\D/g, '').slice(0, 16));
  }

  function handleWithdraw() {
    if (!isWithdrawValid) return;
    authWithdraw(numericWithdraw);
    Alert.alert(
      t('components.globalDiamondsSheet.requestSent'),
      t('components.globalDiamondsSheet.withdrawSuccess', {
        amount: numericWithdraw.toLocaleString(),
        last4: rawCard.slice(-4),
      }),
      [{ text: t('components.globalDiamondsSheet.ok'), onPress: handleClose }]
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={s.sheetBg}
      topInset={top}
      handleIndicatorStyle={s.handle}
    >
      <View style={s.root}>
        <BottomSheetScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <LinearGradient
              colors={['#6BCB7733', '#3DAF4A22']}
              style={s.headerIcon}
            >
              <Text style={{ fontSize: 22 }}>💰</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{t('components.globalDiamondsSheet.wallet')}</Text>
              <Text style={s.headerBalance}>
                {balance.toLocaleString()} so&apos;m
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'topup' && s.tabBtnActiveBlue]}
              onPress={() => setTab('topup')}
              activeOpacity={0.8}
            >
              {tab === 'topup' && (
                <LinearGradient
                  colors={['#4D96FF', '#C77DFF']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
              <Text
                style={[s.tabBtnText, tab === 'topup' && s.tabBtnTextActive]}
              >
                {t('components.globalDiamondsSheet.topupTab')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'withdraw' && s.tabBtnActiveGreen]}
              onPress={() => setTab('withdraw')}
              activeOpacity={0.8}
            >
              {tab === 'withdraw' && (
                <LinearGradient
                  colors={['#6BCB77', '#3DAF4A']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
              <Text
                style={[s.tabBtnText, tab === 'withdraw' && s.tabBtnTextActive]}
              >
                {t('components.globalDiamondsSheet.withdrawTab')}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'topup' ? (
            <>
              <Text style={s.sectionLabel}>
                {t('components.globalDiamondsSheet.minAmountLabel', {
                  amount: QUICK_AMOUNTS[0].toLocaleString(),
                })}
              </Text>

              {/* Quick amounts */}
              <View style={s.quickWrap}>
                {QUICK_AMOUNTS.map(val => {
                  const selected = parseInt(amount, 10) === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => handleQuickSelect(val)}
                      style={[s.quickBtn, selected && s.quickBtnActive]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.quickBtnText,
                          selected && s.quickBtnTextActive,
                        ]}
                      >
                        {val >= 1000 ? val / 1000 + 'k' : val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount input */}
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>💰</Text>
                <TextInput
                  style={s.input}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder={t('components.globalDiamondsSheet.amountPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                {amount.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAmount('')}
                    style={s.clearBtn}
                  >
                    <Text style={s.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {numericAmount > 0 && numericAmount < QUICK_AMOUNTS[0] && (
                <Text
                  style={s.errorText}
                >
                  {t('components.globalDiamondsSheet.minAmountError', {
                    amount: QUICK_AMOUNTS[0].toLocaleString(),
                  })}
                </Text>
              )}

              {/* Payment methods */}
              <Text style={[s.sectionLabel, { marginTop: 14 }]}>
                {t('components.globalDiamondsSheet.paymentMethod')}
              </Text>
              <View style={s.methodsRow}>
                {PAYMENT_METHODS.map(m => {
                  const selected = selectedMethod === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setSelectedMethod(m.id)}
                      style={[s.methodCard, selected && s.methodCardActive]}
                      activeOpacity={0.8}
                    >
                      {selected && (
                        <LinearGradient
                          colors={['#4D96FF22', '#C77DFF11']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <View
                        style={[s.methodLogoBox, { backgroundColor: m.bg }]}
                      >
                        <Text style={[s.methodLogoText, { color: m.color }]}>
                          {m.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handleTopUp}
                activeOpacity={isTopUpValid ? 0.85 : 1}
                style={{ marginTop: 24 }}
              >
                <LinearGradient
                  colors={
                    isTopUpValid
                      ? ['#4D96FF', '#C77DFF']
                      : ['#2a2a3a', '#2a2a3a']
                  }
                  style={s.actionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text
                    style={[
                      s.actionBtnText,
                      !isTopUpValid && s.actionBtnTextDisabled,
                    ]}
                  >
                    {t('components.globalDiamondsSheet.topupBtn')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Balance info */}
              <View style={s.balanceCard}>
                <LinearGradient
                  colors={['#6BCB7722', '#3DAF4A11']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={s.balanceCardLabel}>{t('components.globalDiamondsSheet.availableBalance')}</Text>
                <Text style={s.balanceCardAmount}>
                  💰 {balance.toLocaleString()} so&apos;m
                </Text>
                <Text style={s.balanceCardSub}>
                  {t('components.globalDiamondsSheet.withdrawable', {
                    amount: maxWithdrawable.toLocaleString(),
                  })}
                </Text>
              </View>

              <Text style={s.sectionLabel}>{t('components.globalDiamondsSheet.cardNumber')}</Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>💳</Text>
                <TextInput
                  style={s.input}
                  value={formattedCard}
                  onChangeText={handleCardChange}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                  returnKeyType="next"
                  maxLength={19}
                />
                {rawCard.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setCardNumber('')}
                    style={s.clearBtn}
                  >
                    <Text style={s.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {rawCard.length > 0 && rawCard.length < 16 && (
                <Text style={s.errorText}>
                  {t('components.globalDiamondsSheet.cardNumberError')}
                </Text>
              )}

              <Text style={[s.sectionLabel, { marginTop: 14 }]}>
                {t('components.globalDiamondsSheet.withdrawAmount')}
              </Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>💰</Text>
                <TextInput
                  style={s.input}
                  value={withdrawAmount}
                  onChangeText={t => setWithdrawAmount(t.replace(/\D/g, ''))}
                  placeholder={t('components.globalDiamondsSheet.minPlaceholder', {
                    amount: MIN_WITHDRAW.toLocaleString(),
                  })}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                {withdrawAmount.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setWithdrawAmount('')}
                    style={s.clearBtn}
                  >
                    <Text style={s.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {numericWithdraw > 0 && numericWithdraw < MIN_WITHDRAW && (
                <Text style={s.errorText}>
                  {t('components.globalDiamondsSheet.minAmountError', {
                    amount: MIN_WITHDRAW.toLocaleString(),
                  })}
                </Text>
              )}
              {numericWithdraw > maxWithdrawable && numericWithdraw >= MIN_WITHDRAW && (
                <Text style={s.errorText}>
                  {maxWithdrawable > 0
                    ? t('components.globalDiamondsSheet.maxWithdrawError', {
                        amount: maxWithdrawable.toLocaleString(),
                      })
                    : t('components.globalDiamondsSheet.cannotWithdraw')}
                </Text>
              )}

              <View style={s.rateRow}>
                <Text style={s.rateText}>
                  {t('components.globalDiamondsSheet.feeInfo')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleWithdraw}
                activeOpacity={isWithdrawValid ? 0.85 : 1}
                style={{ marginTop: 24 }}
              >
                <LinearGradient
                  colors={
                    isWithdrawValid
                      ? ['#6BCB77', '#3DAF4A']
                      : ['#2a2a3a', '#2a2a3a']
                  }
                  style={s.actionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text
                    style={[
                      s.actionBtnText,
                      !isWithdrawValid && s.actionBtnTextDisabled,
                    ]}
                  >
                    {t('components.globalDiamondsSheet.withdrawBtn')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  sheetBg: { backgroundColor: '#1A1A24' },
  handle: { backgroundColor: 'rgba(255,255,255,0.2)' },
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 70,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerBalance: {
    color: '#6BCB77',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabBtnActiveBlue: { borderColor: 'rgba(77,150,255,0.5)' },
  tabBtnActiveGreen: { borderColor: 'rgba(107,203,119,0.5)' },
  tabBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '800',
  },
  tabBtnTextActive: { color: '#fff' },

  // Balance card
  balanceCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107,203,119,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    overflow: 'hidden',
  },
  balanceCardLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceCardAmount: {
    color: '#6BCB77',
    fontSize: 22,
    fontWeight: '900',
  },
  balanceCardSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // Section label
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Quick amounts
  quickWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickBtnActive: {
    borderColor: 'rgba(77,150,255,0.6)',
    backgroundColor: 'rgba(77,150,255,0.18)',
  },
  quickBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
  quickBtnTextActive: { color: '#4D96FF' },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    marginBottom: 6,
  },
  inputIcon: { fontSize: 18 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  errorText: {
    color: '#FF6B6B',
    fontSize: 11,
    marginBottom: 4,
    marginLeft: 4,
  },

  // Payment methods
  methodsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodCard: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  methodCardActive: {
    borderColor: 'rgba(77,150,255,0.55)',
  },
  methodLogoBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  methodLogoText: {
    fontSize: 13,
    fontWeight: '900',
  },

  // Action button
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  actionBtnTextDisabled: { color: 'rgba(255,255,255,0.3)' },

  // Rate
  rateRow: {
    marginTop: 6,
    marginBottom: 2,
  },
  rateText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },
});
