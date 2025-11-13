import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Client" component={ClientDashboardScreen} />
      <Tab.Screen name="Vendor" component={VendorDashboardScreen} />
    </Tab.Navigator>
  );
};

export default MainNavigator;
