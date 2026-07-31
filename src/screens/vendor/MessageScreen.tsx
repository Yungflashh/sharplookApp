import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const MessageScreen = () => {
  return <SafeAreaView style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }}>
      <Text>Message Screen</Text>
    </SafeAreaView>;
};
export default MessageScreen;