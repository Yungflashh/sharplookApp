import React from 'react';
import { View, Text, Button } from 'react-native';

const LoginScreen = ({ navigation }: any) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text className=' text-4xl'>Login Screen eee</Text>
      <Button
        title="Go to Register"
        onPress={() => navigation.navigate('Register')}
      />
      <Button
        title="Log in as Client"
        onPress={() => navigation.navigate('Main', { screen: 'Client' })}
      />
      <Button
        title="Log in as Vendor"
        onPress={() => navigation.navigate('Main', { screen: 'Vendor' })}
      />
    </View>
  );
};

export default LoginScreen;
