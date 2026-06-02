import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VendorTabParamList } from '@/types/navigation.types';

import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';
import VendorProfileScreen from '@/screens/vendor/VendoreProfileScreen';
import VendorBooking from '@/screens/vendor/VendorBookingScreen';
import VendorServicesScreen from '@/screens/vendor/VendorServicesScreen';
import VendorProductManagementScreen from '@/screens/vendor/Vendorproductmanagementscreen';

const Tab = createBottomTabNavigator<VendorTabParamList>();

const P = '#E91E63';

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
}

const TabIcon = ({ name, focused, color }: TabIconProps) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name={name as any} size={25} color={color} />
    {focused && (
      <View
        style={{
          width: 18,
          height: 3,
          borderRadius: 2,
          backgroundColor: P,
          marginTop: 4,
        }}
      />
    )}
  </View>
);

const VendorTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: P,
        tabBarInactiveTintColor: '#C0C0C0',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 66 + Math.max(insets.bottom, 0),
          paddingBottom: Platform.OS === 'ios' ? 30 : Math.max(insets.bottom, 10),
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={VendorDashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Bookings"
        component={VendorBooking}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'calendar-check' : 'calendar-check-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="My Products"
        component={VendorProductManagementScreen}
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'package-variant' : 'package-variant-closed'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Services"
        component={VendorServicesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'scissors-cutting' : 'scissors-cutting'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={VendorProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'account-circle' : 'account-circle-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default VendorTabNavigator;
