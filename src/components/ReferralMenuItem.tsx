import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { referralAPI } from '@/api/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingReferralButtonProps {
  navigation: any;
  showTooltip?: boolean;
  initialPosition?: { x: number; y: number };
}

const FloatingReferralButton: React.FC<FloatingReferralButtonProps> = ({ 
  navigation,
  showTooltip = true,
  initialPosition,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  
  // Position state - default to right middle
  const defaultX = SCREEN_WIDTH - 80;
  const defaultY = SCREEN_HEIGHT / 2 - 100;
  
  // ⭐ ALL animations use native driver FALSE to avoid conflicts
  const pan = useRef(new Animated.ValueXY({ 
    x: initialPosition?.x ?? defaultX,
    y: initialPosition?.y ?? defaultY,
  })).current;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats();
    startPulseAnimation();
    
    if (showTooltip) {
      setTimeout(() => {
        showTooltipAnimation();
      }, 1000);
      
      setTimeout(() => {
        hideTooltipAnimation();
      }, 4000);
    }
  }, []);

  const loadStats = async () => {
    try {
      const response = await referralAPI.getReferralStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: false, // ⭐ Changed to false
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false, // ⭐ Changed to false
        }),
      ])
    ).start();
  };

  const showTooltipAnimation = () => {
    setTooltipVisible(true);
    Animated.spring(tooltipOpacity, {
      toValue: 1,
      useNativeDriver: false, // ⭐ Changed to false
      tension: 40,
      friction: 7,
    }).start();
  };

  const hideTooltipAnimation = () => {
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false, // ⭐ Changed to false
    }).start(() => {
      setTooltipVisible(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        setIsDragging(true);
        hideTooltipAnimation();
        
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: false, // ⭐ Changed to false
        }).start();
        
        // @ts-ignore
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
      },
      
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false, // ⭐ Changed to false
          tension: 40,
          friction: 5,
        }).start();
        
        pan.flattenOffset();
        
        const isClick = Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10;
        
        if (isClick) {
          Animated.sequence([
            Animated.spring(scaleAnim, {
              toValue: 0.85,
              useNativeDriver: false, // ⭐ Changed to false
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: false, // ⭐ Changed to false
            }),
          ]).start();
          
          setTimeout(() => {
            navigation.navigate('Referral');
          }, 150);
        } else {
          snapToEdge();
        }
        
        setIsDragging(false);
      },
    })
  ).current;

  const snapToEdge = () => {
    // @ts-ignore
    const currentX = pan.x._value;
    // @ts-ignore
    const currentY = pan.y._value;
    
    const leftDistance = currentX;
    const rightDistance = SCREEN_WIDTH - currentX - 60;
    
    let targetX = leftDistance < rightDistance ? 10 : SCREEN_WIDTH - 70;
    
    let targetY = currentY;
    const maxY = SCREEN_HEIGHT - 200;
    const minY = 80;
    
    if (targetY < minY) targetY = minY;
    if (targetY > maxY) targetY = maxY;
    
    Animated.spring(pan, {
      toValue: { x: targetX, y: targetY },
      useNativeDriver: false,
      tension: 40,
      friction: 6,
    }).start();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        zIndex: 9999,
        left: 0,
        top: 0,
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          { scale: scaleAnim }
        ],
      }}
    >
      {/* Pulse ring effect */}
      {!isDragging && (
        <Animated.View
          className="absolute inset-0 rounded-full"
          style={{
            width: 60,
            height: 60,
            backgroundColor: '#eb278d',
            opacity: 0.3,
            transform: [{ scale: pulseAnim }],
          }}
        />
      )}
      
      {/* Main button */}
      <TouchableOpacity
        activeOpacity={0.9}
        className="rounded-full overflow-hidden"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={['#eb278d', '#c71f73']}
          className="w-[60px] h-[60px] rounded-full items-center justify-center"
        >
          <Ionicons name="gift" size={30} color="#FFFFFF" />
          
          {/* Badge for pending referrals */}
          {stats && stats.pendingReferrals > 0 && (
            <View 
              className="absolute -top-1 -right-1 bg-yellow-400 rounded-full min-w-[22px] h-[22px] items-center justify-center px-1.5"
              style={{
                borderWidth: 2.5,
                borderColor: '#FFFFFF',
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 6,
              }}
            >
              <Text className="text-white text-[11px] font-bold">
                {stats.pendingReferrals > 9 ? '9+' : stats.pendingReferrals}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Tooltip */}
      {showTooltip && tooltipVisible && stats && (
        <Animated.View
          className="absolute top-4 right-16 bg-white rounded-xl px-3 py-2.5"
          style={{
            opacity: tooltipOpacity,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Text className="text-xs font-bold text-gray-900 mb-0.5">
            {stats.totalReferrals} Referral{stats.totalReferrals !== 1 ? 's' : ''}
          </Text>
          <Text className="text-[11px] text-pink-600 font-semibold">
            ₦{stats.totalEarnings.toLocaleString()} earned
          </Text>
          {stats.pendingReferrals > 0 && (
            <Text className="text-[10px] text-yellow-600 mt-0.5">
              {stats.pendingReferrals} pending
            </Text>
          )}
          
          {/* Arrow */}
          <View 
            className="absolute -right-1.5 top-5 w-3 h-3 bg-white"
            style={{ 
              transform: [{ rotate: '45deg' }],
            }}
          />
        </Animated.View>
      )}
      
      {/* Drag hint */}
      {isDragging && (
        <View 
          className="absolute -bottom-10 left-1/2 bg-gray-900/80 rounded-lg px-3 py-1.5"
          style={{
            transform: [{ translateX: -40 }],
          }}
        >
          <Text className="text-white text-xs font-medium">Drag me!</Text>
        </View>
      )}
    </Animated.View>
  );
};

export default FloatingReferralButton;