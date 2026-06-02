import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClientTabParamList } from '@/types/navigation.types';

import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import ClientProfileScreen from '@/screens/client/ClientProfileScreen';
import BookingsScreen from '@/screens/client/BookingScreen';
import MarketplaceScreen from '@/screens/client/MarketPlaceScreen';
import MyOffersScreen from '@/components/clientComponent/MyOffersScreen';

const Tab = createBottomTabNavigator<ClientTabParamList>();

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

const ClientTabNavigator = () => {
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
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={ClientDashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'home-variant' : 'home-variant-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'calendar-month' : 'calendar-month-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="MarketPlace"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'shopping' : 'shopping-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Offers"
        component={MyOffersScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'tag' : 'tag-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ClientProfileScreen}
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

export default ClientTabNavigator;
