import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getStoredUser } from '@/utils/authHelper';
import ClientDashboardScreen from '@/screens/client/ClientDashboardScreen';
import VendorDashboardScreen from '@/screens/vendor/VendorDashboardScreen';
interface MainNavigatorProps {
  route?: {
    params?: {
      isVendor?: boolean;
    };
  };
}
const MainNavigator: React.FC<MainNavigatorProps> = ({
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
  // Glitch will add these components
  return isVendor ? <VendorDashboardScreen /> : <ClientDashboardScreen />;
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