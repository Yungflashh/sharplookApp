import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { VendorTabParamList } from '@/types/navigation.types';
import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';
import VendorProfileScreen from '@/screens/vendor/VendoreProfileScreen';
import VendorBooking from '@/screens/vendor/VendorBookingScreen';
import VendorServicesScreen from '@/screens/vendor/VendorServicesScreen';
import AddEditProductScreen from '@/screens/vendor/Addeditproductscreen';
import VendorProductManagementScreen from '@/screens/vendor/Vendorproductmanagementscreen';
import { Platform } from 'react-native';

const Tab = createBottomTabNavigator<VendorTabParamList>();

const VendorTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ec4899',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={VendorDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size,
        focused
      }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
    }} />
      
      <Tab.Screen name="Bookings" component={VendorBooking} options={{
      tabBarIcon: ({
        color,
        size,
        focused
      }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
    }} />
      
      
      <Tab.Screen name="My Products" component={VendorProductManagementScreen} options={{
      tabBarIcon: ({
        color,
        size,
        focused
      }) => <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={size} color={color} />
    }} />
      <Tab.Screen name="Services" component={VendorServicesScreen} options={{
      tabBarIcon: ({
        color,
        size,
        focused
      }) => <Ionicons name={focused ? "flower" : "flower-outline"} size={size} color={color} />
    }} />
      
      <Tab.Screen name="Profile" component={VendorProfileScreen} options={{
      tabBarIcon: ({
        color,
        size,
        focused
      }) => <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
    }} />
    </Tab.Navigator>
  );
};
export default VendorTabNavigator;