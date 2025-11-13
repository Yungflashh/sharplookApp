import React from 'react';
import { View, Text, Button } from 'react-native';
const RegisterScreen = ({
  navigation
}: any) => {
  return <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }}>
      <Text>Register Screen</Text>
      <Button title="Go back to Login" onPress={() => navigation.goBack()} />
    </View>;
};
export default RegisterScreen;