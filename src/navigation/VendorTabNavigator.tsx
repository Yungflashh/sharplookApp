import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { VendorTabParamList } from '@/types/navigation.types';
import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';
import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import ClientProfileScreen from '@/screens/client/ClientProfileScreen';
const Tab = createBottomTabNavigator<VendorTabParamList>();
const VendorTabNavigator = () => {
  return <Tab.Navigator screenOptions={{
    tabBarActiveTintColor: '#9C27B0',
    tabBarInactiveTintColor: '#999',
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopColor: '#E0E0E0',
      borderTopWidth: 1,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2
      },
      shadowOpacity: 0.1,
      shadowRadius: 4
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600'
    },
    headerShown: false
  }}>
      <Tab.Screen name="Dashboard" component={VendorDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="home" size={size} color={color} />
    }} />
      
      <Tab.Screen name="Bookings" component={VendorDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="calendar" size={size} color={color} />
    }} />
      
      <Tab.Screen name="Services" component={VendorDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="briefcase" size={size} color={color} />
    }} />
      
      <Tab.Screen name="Profile" component={ClientProfileScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="person" size={size} color={color} />
    }} />
    </Tab.Navigator>;
};
export default VendorTabNavigator;