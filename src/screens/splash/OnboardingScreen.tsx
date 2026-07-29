import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { completeOnboarding } from '@/utils/authHelper';

const { width, height } = Dimensions.get('window');

const CARD_W = width * 0.70;
const CARD_H = height * 0.42;
const SIDE_PAD = (width - CARD_W) / 2; // 15% each side

const SLIDES = [
  {
    id: '1',
    titleBefore: 'Discover Top Beauty ',
    highlight: 'Expert',
    titleAfter: ' Near You',
    subtitle:
      'Connect with verified professionals specializing in hair, makeup, nails skin, and more.',
    image: require('../../../assets/splash1.png'),
  },
  {
    id: '2',
    titleBefore: 'Book Beauty Services\nThat Make you ',
    highlight: 'Glow',
    titleAfter: '',
    subtitle:
      'From relaxing spa treatments to flawless makeup and hair, everything you need is just a tap away.',
    image: require('../../../assets/splash2.png'),
  },
  {
    id: '3',
    titleBefore: 'Relax, Rejuvenate &\nFeel Your ',
    highlight: 'Best',
    titleAfter: '',
    subtitle:
      'Connect with verified professionals specializing in hair, makeup, nails, skin, and more.',
    image: require('../../../assets/splash3.png'),
  },
];

type Slide = (typeof SLIDES)[number];

interface Props {
  onComplete: (isVendor?: boolean) => void;
}

const OnboardingScreen = ({ onComplete }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToOffset({ offset: next * CARD_W, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setActiveIndex(Math.max(0, Math.min(index, SLIDES.length - 1)));
  };

  const handleCTA = async (isVendor: boolean) => {
    await completeOnboarding();
    onComplete(isVendor);
  };

  const renderCard = ({ item, index }: { item: Slide; index: number }) => {
    const isActive = index === activeIndex;
    const isFirst = index === 0;
    const isLast = index === SLIDES.length - 1;
    const cardW = isFirst || isLast ? CARD_W + SIDE_PAD : CARD_W;
    return (
      <View style={[styles.cardShadow, { width: cardW }, !isActive && styles.cardInactive]}>
        <View style={styles.cardInner}>
          <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
        </View>
      </View>
    );
  };

  const slide = SLIDES[activeIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCE4EC" />

      <View style={styles.carouselWrapper}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W}
          decelerationRate="fast"
          extraData={activeIndex}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
        />
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Title + Subtitle */}
      <View style={styles.textSection}>
        <Text style={styles.title}>
          <Text style={styles.titleNormal}>{slide.titleBefore}</Text>
          <Text style={styles.titleHighlight}>{slide.highlight}</Text>
          {slide.titleAfter ? (
            <Text style={styles.titleNormal}>{slide.titleAfter}</Text>
          ) : null}
        </Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => handleCTA(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Experience Beauty</Text>
          <Ionicons name="chevron-forward" size={18} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => handleCTA(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineBtnText}>I'm a vendor</Text>
          <Ionicons name="chevron-forward" size={18} color="#E91E63" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
    paddingBottom: height * 0.04,
  },

  carouselWrapper: {
    height: CARD_H,
    marginTop: height * 0.06,
  },

  // Shadow wrapper — no overflow so shadow renders on Android
  cardShadow: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  cardInactive: {
    opacity: 0.55,
    transform: [{ scaleY: 0.95 }],
  },
  // Inner clips the image to rounded corners
  cardInner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: height * 0.025,
    paddingBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#E91E63',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#F8BBD0',
  },

  textSection: {
    flex: 1,
    paddingHorizontal: width * 0.07,
    paddingTop: height * 0.01,
  },
  title: {
    fontSize: width * 0.065,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: width * 0.09,
    marginBottom: 10,
    textAlign: 'center',
  },
  titleNormal: {
    color: '#1a1a1a',
  },
  titleHighlight: {
    color: '#E91E63',
  },
  subtitle: {
    fontSize: width * 0.036,
    color: '#666',
    lineHeight: width * 0.055,
    textAlign: 'center',
  },

  buttons: {
    paddingHorizontal: width * 0.07,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 30,
    paddingVertical: height * 0.018,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: width * 0.041,
    fontWeight: '600',
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#E91E63',
    borderRadius: 30,
    paddingVertical: height * 0.017,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
  },
  outlineBtnText: {
    color: '#E91E63',
    fontSize: width * 0.041,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
