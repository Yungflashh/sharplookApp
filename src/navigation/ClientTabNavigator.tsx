import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ClientTabParamList } from '@/types/navigation.types';

import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import ClientProfileScreen from '@/screens/client/ClientProfileScreen';
import BookingsScreen from '@/screens/client/BookingScreen';
import MarketplaceScreen from '@/screens/client/MarketPlaceScreen';

const Tab = createBottomTabNavigator<ClientTabParamList>();
const PRIMARY = '#E04079';

const ION_ICON: Record<string, { outline: any; filled: any }> = {
  'Home':        { outline: 'grid-outline',           filled: 'grid'            },
  'Bookings':    { outline: 'calendar-clear-outline',  filled: 'calendar-clear' },
  'MarketPlace': { outline: 'storefront-outline',      filled: 'storefront'     },
  'Profile':     { outline: 'person-circle-outline',   filled: 'person-circle'  },
};

const LABELS: Record<string, string> = {
  'Home':        'Home',
  'Bookings':    'Bookings',
  'MarketPlace': 'Market',
  'Profile':     'Profile',
};

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barWrapper, { bottom: Platform.OS === 'ios' ? insets.bottom - 8 : insets.bottom + 12 }]} pointerEvents="box-none">
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 100}
        tint="light"
        style={styles.blurContainer}
      >
        <View style={styles.glassInner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icons = ION_ICON[route.name] ?? { outline: 'ellipse-outline', filled: 'ellipse' };
            const label = LABELS[route.name] ?? route.name;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name as any);
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.tabItem}
              >
                {focused && <View style={styles.activeBlob} />}
                <Ionicons
                  name={focused ? icons.filled : icons.outline}
                  size={22}
                  color={focused ? PRIMARY : 'rgba(100,100,120,0.6)'}
                />
                <Text style={[styles.label, focused && styles.labelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const ClientTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <FloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"        component={ClientDashboardScreen} />
    <Tab.Screen name="Bookings"    component={BookingsScreen} />
    <Tab.Screen name="MarketPlace" component={MarketplaceScreen} />
    <Tab.Screen name="Profile"     component={ClientProfileScreen} />
  </Tab.Navigator>
);

export default ClientTabNavigator;

const styles = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  blurContainer: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...Platform.select({
      android: { elevation: 16 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
    }),
  },

  glassInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },

  activeBlob: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(224,64,121,0.1)',
  },

  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(100,100,120,0.6)',
    letterSpacing: 0.1,
  },

  labelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
});
