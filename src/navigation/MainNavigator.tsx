import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getStoredUser } from '@/utils/authHelper';
import ClientTabNavigator from '@/navigation/ClientTabNavigator';
import VendorTabNavigator from '@/navigation/VendorTabNavigator';
import type { RootStackScreenProps } from '@/types/navigation.types';
type Props = RootStackScreenProps<'Main'>;
const MainNavigator: React.FC<Props> = ({
  route
}) => {
  const [isVendor, setIsVendor] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkUserType();
  }, []);
  const checkUserType = async () => {
    try {
      if (route?.params?.isVendor !== undefined) {
        setIsVendor(route.params.isVendor);
        console.log('✅ User type from params:', route.params.isVendor ? 'Vendor' : 'Client');
      } else {
        const user = await getStoredUser();
        if (user) {
          const userIsVendor = user.isVendor === true;
          setIsVendor(userIsVendor);
          console.log('✅ User type from storage:', userIsVendor ? 'Vendor' : 'Client');
        } else {
          setIsVendor(false);
          console.log('⚠️ No user data found, defaulting to Client');
        }
      }
    } catch (error) {
      console.error('❌ Error checking user type:', error);
      setIsVendor(false);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>;
  }
  return isVendor ? <VendorTabNavigator /> : <ClientTabNavigator />;
};
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
});
export default MainNavigator;