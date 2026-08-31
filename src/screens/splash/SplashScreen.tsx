import React from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, Image } from 'react-native';

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width * 0.6, 260);

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />

      <View style={styles.logoWrap}>
        <Image
          source={require('../../../assets/lookrealMainLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.tagline}>Beauty & wellness,</Text>
        <Text style={styles.taglineAccent}>at your fingertips</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  taglineAccent: {
    fontSize: 18,
    color: '#D73870',
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});

export default SplashScreen;
