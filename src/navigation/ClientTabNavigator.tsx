import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ClientTabParamList } from '@/types/navigation.types';
import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import ClientProfileScreen from '@/screens/client/ClientProfileScreen';
const Tab = createBottomTabNavigator<ClientTabParamList>();
const ClientTabNavigator = () => {
  return <Tab.Navigator screenOptions={{
    tabBarActiveTintColor: '#E91E63',
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
      <Tab.Screen name="Home" component={ClientDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="home" size={size} color={color} />
    }} />
      
      <Tab.Screen name="Bookings" component={ClientDashboardScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="calendar" size={size} color={color} />
    }} />
      
      {}
      
      <Tab.Screen name="Profile" component={ClientProfileScreen} options={{
      tabBarIcon: ({
        color,
        size
      }) => <Ionicons name="person" size={size} color={color} />
    }} />
    </Tab.Navigator>;
};
export default ClientTabNavigator;