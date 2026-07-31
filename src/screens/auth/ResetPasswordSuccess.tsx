import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPasswordSuccess'>;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const GRAY    = '#6B7280';

const ResetPasswordSuccess = () => {
  const navigation = useNavigation<NavProp>();

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login', params: { message: 'Password reset successfully! Please log in with your new password.' } }] });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.badgeWrap}>
          <Ionicons name="sparkles" size={16} color={PRIMARY} style={[styles.sparkle, { top: 6, left: 18 }]} />
          <Ionicons name="sparkles" size={12} color={PRIMARY} style={[styles.sparkle, { top: 2, right: 22 }]} />
          <Ionicons name="heart" size={12} color={PRIMARY} style={[styles.sparkle, { bottom: 14, left: 24 }]} />
          <Ionicons name="heart" size={10} color={PRIMARY} style={[styles.sparkle, { bottom: 10, right: 26 }]} />
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={44} color={WHITE} />
          </View>
        </View>

        <Text style={styles.title}>All Done!</Text>
        <Text style={styles.subtitle}>Your password has been reset successfully.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.88}>
          <Text style={styles.doneBtnText}>Done</Text>
          <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  badgeWrap: {
    width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  sparkle: { position: 'absolute' },
  badge: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: GRAY, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  doneBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
});

export default ResetPasswordSuccess;
