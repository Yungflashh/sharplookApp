import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { VendorTabParamList } from '@/types/navigation.types';

import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';
import VendorProfileScreen from '@/screens/vendor/VendoreProfileScreen';
import VendorBooking from '@/screens/vendor/VendorBookingScreen';
import VendorServicesScreen from '@/screens/vendor/VendorServicesScreen';
import VendorProductManagementScreen from '@/screens/vendor/Vendorproductmanagementscreen';

const Tab = createBottomTabNavigator<VendorTabParamList>();
const PRIMARY = '#E04079';
const { width } = Dimensions.get('window');

const TABS = [
  { name: 'Dashboard',   icon: 'house',          iconActive: 'house.fill',          label: 'Home'     },
  { name: 'Bookings',    icon: 'calendar',        iconActive: 'calendar.fill',       label: 'Bookings' },
  { name: 'My Products', icon: 'bag',             iconActive: 'bag.fill',            label: 'Products' },
  { name: 'Services',    icon: 'scissors',        iconActive: 'scissors',            label: 'Services' },
  { name: 'Profile',     icon: 'person',          iconActive: 'person.fill',         label: 'Profile'  },
] as const;

// Map tab names to Ionicons
const ION_ICON: Record<string, { outline: any; filled: any }> = {
  'Dashboard':   { outline: 'grid-outline',          filled: 'grid'             },
  'Bookings':    { outline: 'calendar-clear-outline', filled: 'calendar-clear'  },
  'My Products': { outline: 'bag-outline',            filled: 'bag'             },
  'Services':    { outline: 'cut-outline',            filled: 'cut'             },
  'Profile':     { outline: 'person-circle-outline',  filled: 'person-circle'   },
};

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
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
            const label = TABS.find(t => t.name === route.name)?.label ?? route.name;

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

const VendorTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <FloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Dashboard"   component={VendorDashboardScreen} />
    <Tab.Screen name="Bookings"    component={VendorBooking} />
    <Tab.Screen name="My Products" component={VendorProductManagementScreen} />
    <Tab.Screen name="Services"    component={VendorServicesScreen} />
    <Tab.Screen name="Profile"     component={VendorProfileScreen} />
  </Tab.Navigator>
);

export default VendorTabNavigator;

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
    // Android fallback shadow
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
