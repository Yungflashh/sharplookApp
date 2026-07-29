import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@/types/navigation.types';

const BG = '#FFF0F5';
const PINK = '#E91E63';
const BORDER = '#F8BBD0';
const { width: SW } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ChooseRole'>;

const ChooseRoleScreen = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={styles.backCircle}>
            <Ionicons name="chevron-back" size={20} color={PINK} />
          </View>
        </TouchableOpacity>

        {/* Centred content */}
        <View style={styles.center}>
          <Image
            source={require('../../../assets/lookrealMainLogo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />

          <Text style={styles.title}>Join as...</Text>
          <Text style={styles.subtitle}>How would you like to use the app?</Text>

          {/* Client Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Register', { isVendor: false })}
            activeOpacity={0.85}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={32} color={PINK} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>I'm a Client</Text>
              <Text style={styles.cardDesc}>
                Browse and book beauty services from top professionals near you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Vendor Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Register', { isVendor: true })}
            activeOpacity={0.85}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="storefront-outline" size={32} color={PINK} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>I'm a Vendor</Text>
              <Text style={styles.cardDesc}>
                List your beauty services, manage bookings and grow your business
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: SW * 0.06, paddingVertical: 16 },
  backBtn: { marginBottom: 8 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    elevation: 2,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'stretch' },
  logoImg: { width: SW * 0.65, height: 100, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5,
    borderColor: BORDER, padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    elevation: 2,
  },
  cardIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  loginText: { fontSize: 14, color: '#888' },
  loginLink: { fontSize: 14, color: PINK, fontWeight: '700' },
});

export default ChooseRoleScreen;
