import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();
const AppNavigator = () => {
  return <NavigationContainer>
      <Stack.Navigator>
        {}
      </Stack.Navigator>
    </NavigationContainer>;
};
export default AppNavigator;