
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';

type SharedContentRouteProp = RouteProp<RootStackParamList, 'SharedContent'>;
type SharedContentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SharedContent'>;

const SharedContentScreen = () => {
  const navigation = useNavigation<SharedContentNavigationProp>();
  const route = useRoute<SharedContentRouteProp>();
  const { type, id } = route.params;

  useEffect(() => {
    if (type === 'vendor') {
      navigation.replace('VendorDetail', { vendorId: id });
    } else if (type === 'product') {
      navigation.replace('ProductDetail', { productId: id });
    }
  }, [type, id, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>Loading...</Text>
    </View>
  );
};

export default SharedContentScreen;
