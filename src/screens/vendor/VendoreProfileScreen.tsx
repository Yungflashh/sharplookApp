import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Switch, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '@/components/ConfirmationModal';
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');
interface Stat {
  label: string;
  value: string;
  icon: string;
}
interface MenuItem {
  icon: string;
  title: string;
  subtitle: string;
  iconFamily?: string;
  badge?: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}
interface MenuSection {
  title: string;
  items: MenuItem[];
}
const VendorProfileScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  useEffect(() => {
    loadUserData();
  }, []);
  const loadUserData = async (): Promise<void> => {
    const userData = await getStoredUser();
    setUser(userData);
  };
  const handleLogout = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAccount = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log('Delete account requested');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('❌ Delete account error:', error);
    } finally {
      setLoading(false);
    }
  };
  const stats: Stat[] = [{
    label: 'Products',
    value: '24',
    icon: 'cube-outline'
  }, {
    label: 'Orders',
    value: '156',
    icon: 'cart-outline'
  }, {
    label: 'Reviews',
    value: '4.8',
    icon: 'star'
  }, {
    label: 'Revenue',
    value: '₦2.5M',
    icon: 'cash-outline'
  }];
  const profileSections: MenuSection[] = [{
    title: 'Store Management',
    items: [{
      icon: 'storefront-outline',
      title: 'Store Settings',
      subtitle: 'Manage your store details',
      iconFamily: 'material',
      onPress: () => console.log('Store Settings')
    }, {
      icon: 'cube-outline',
      title: 'My Products',
      subtitle: 'View and manage products',
      iconFamily: 'ionicons',
      badge: '24',
      onPress: () => console.log('My Products')
    }, {
      icon: 'pricetag-outline',
      title: 'Promotions',
      subtitle: 'Active discounts and offers',
      iconFamily: 'ionicons',
      onPress: () => console.log('Promotions')
    }]
  }, {
    title: 'Analytics & Reports',
    items: [{
      icon: 'analytics-outline',
      title: 'Sales Analytics',
      subtitle: 'View performance metrics',
      iconFamily: 'ionicons',
      onPress: () => console.log('Analytics')
    }, {
      icon: 'document-text-outline',
      title: 'Reports',
      subtitle: 'Download sales reports',
      iconFamily: 'ionicons',
      onPress: () => console.log('Reports')
    }]
  }, {
    title: 'Account Settings',
    items: [{
      icon: 'person-circle-outline',
      title: 'Personal Information',
      subtitle: 'Update your profile details',
      iconFamily: 'ionicons',
      onPress: () => console.log('Personal Info')
    }, {
      icon: 'card-outline',
      title: 'Payment Methods',
      subtitle: 'Manage bank accounts',
      iconFamily: 'ionicons',
      onPress: () => console.log('Payment Methods')
    }, {
      icon: 'shield-checkmark-outline',
      title: 'Security',
      subtitle: 'Password and 2FA settings',
      iconFamily: 'ionicons',
      onPress: () => console.log('Security')
    }]
  }, {
    title: 'Preferences',
    items: [{
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage notification settings',
      iconFamily: 'ionicons',
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled
    }, {
      icon: 'moon-outline',
      title: 'Dark Mode',
      subtitle: 'Toggle dark theme',
      iconFamily: 'ionicons',
      hasSwitch: true,
      switchValue: darkMode,
      onSwitchChange: setDarkMode
    }, {
      icon: 'language-outline',
      title: 'Language',
      subtitle: 'English',
      iconFamily: 'material',
      onPress: () => console.log('Language')
    }]
  }, {
    title: 'Support',
    items: [{
      icon: 'help-circle-outline',
      title: 'Help Center',
      subtitle: 'Get help and support',
      iconFamily: 'ionicons',
      onPress: () => console.log('Help Center')
    }, {
      icon: 'chatbubble-ellipses-outline',
      title: 'Contact Support',
      subtitle: 'Chat with our team',
      iconFamily: 'ionicons',
      onPress: () => console.log('Contact Support')
    }, {
      icon: 'document-outline',
      title: 'Terms & Privacy',
      subtitle: 'Legal information',
      iconFamily: 'ionicons',
      onPress: () => console.log('Terms & Privacy')
    }]
  }];
  const renderIcon = (iconFamily: string, iconName: string, size: number = 24, color: string = '#ec4899'): JSX.Element => {
    switch (iconFamily) {
      case 'material':
        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
      case 'feather':
        return <Feather name={iconName as any} size={size} color={color} />;
      default:
        return <Ionicons name={iconName as any} size={size} color={color} />;
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {}
        <View className='bg-[#ec4899] rounded-b-[30px] pb-4'>
          {}
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity className="w-10 h-10 justify-center items-center">
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-white">Profile</Text>
            <TouchableOpacity className="w-10 h-10 justify-center items-center">
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {}
          <View className="items-center pb-5">
            <TouchableOpacity activeOpacity={0.8} className="relative mb-4">
              <View className="w-[104px] h-[104px] rounded-full p-0.5">
                <View className="w-[100px] h-[100px] rounded-full bg-white justify-center items-center">
                  <Ionicons name="person" size={50} color="#ec4899" />
                </View>
              </View>
              <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-pink-500 justify-center items-center border-3 border-white" activeOpacity={0.7}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>

            <Text className="text-2xl font-bold text-white mb-1">
              {user?.businessName || "John's Store"}
            </Text>
            <Text className="text-sm text-white/90 mb-3">
              {user?.email || 'vendor@example.com'}
            </Text>

            {}
            <View className="flex-row items-center bg-white/20 px-3 py-1.5 rounded-full">
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="text-xs text-white ml-1 font-semibold">Verified Vendor</Text>
            </View>
          </View>

          {}
          <View className="flex-row px-5 pt-5 pb-2.5 justify-between">
            {stats.map((stat, index) => <TouchableOpacity key={index} className="items-center bg-white/15 py-3 px-4 rounded-2xl" style={{
            minWidth: (SCREEN_WIDTH - 60) / 4 - 8
          }} activeOpacity={0.7}>
                <Ionicons name={stat.icon as any} size={20} color="rgba(255, 255, 255, 0.9)" />
                <Text className="text-lg font-bold text-white mt-1">{stat.value}</Text>
                <Text className="text-[11px] text-white/80 mt-0.5">{stat.label}</Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {}
        <View className="pt-5">
          {profileSections.map((section, sectionIndex) => <View key={sectionIndex} className="mb-5 px-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                {section.title}
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden" style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2
                },
                shadowOpacity: 0.05,
                shadowRadius: 8
              },
              android: {
                elevation: 3
              }
            })
          }}>
                {section.items.map((item, itemIndex) => <TouchableOpacity key={itemIndex} className={`flex-row items-center justify-between p-4 ${itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`} onPress={!item.hasSwitch ? item.onPress : undefined} activeOpacity={item.hasSwitch ? 1 : 0.7}>
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-xl bg-pink-50 justify-center items-center mr-3">
                        {renderIcon(item.iconFamily || 'ionicons', item.icon)}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-medium text-gray-800 mb-0.5">
                          {item.title}
                        </Text>
                        <Text className="text-xs text-gray-500">{item.subtitle}</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center">
                      {item.badge && <View className="bg-pink-500 px-2 py-0.5 rounded-xl mr-2">
                          <Text className="text-xs text-white font-semibold">{item.badge}</Text>
                        </View>}
                      {item.hasSwitch ? <Switch value={item.switchValue} onValueChange={item.onSwitchChange} trackColor={{
                  false: '#e5e7eb',
                  true: '#fce7f3'
                }} thumbColor={item.switchValue ? '#ec4899' : '#9ca3af'} ios_backgroundColor="#e5e7eb" /> : <Ionicons name="chevron-forward" size={20} color="#d1d5db" />}
                    </View>
                  </TouchableOpacity>)}
              </View>
            </View>)}

          {}
          <View className="mb-5 px-5">
            <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Account Actions
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden" style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2
                },
                shadowOpacity: 0.05,
                shadowRadius: 8
              },
              android: {
                elevation: 3
              }
            })
          }}>
              <TouchableOpacity className="flex-row items-center justify-between p-4 bg-red-50 border-b border-gray-100" onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-red-100 justify-center items-center mr-3">
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                  </View>
                  <Text className="text-[15px] font-medium text-red-500">Logout</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-4 bg-red-50" onPress={() => setShowDeleteModal(true)} activeOpacity={0.7}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-red-100 justify-center items-center mr-3">
                    <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  </View>
                  <Text className="text-[15px] font-medium text-red-500">Delete Account</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {}
          <View className="items-center py-5 mt-2.5">
            <Text className="text-xs text-gray-400 mb-1">Version 1.0.0</Text>
            <Text className="text-[11px] text-gray-400">© 2024 VendorHub</Text>
          </View>
        </View>
      </ScrollView>

      {}
      <ConfirmationModal visible={showLogoutModal} title="Logout" message="Are you sure you want to logout from your vendor account?" icon="log-out-outline" iconColor="#ec4899" confirmText="Yes, Logout" cancelText="Cancel" confirmColor="#ec4899" loading={loading} onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />

      <ConfirmationModal visible={showDeleteModal} title="Delete Account" message="Are you sure you want to delete your vendor account? This action cannot be undone and all your data will be permanently removed." icon="warning-outline" iconColor="#ef4444" confirmText="Delete Account" cancelText="Cancel" confirmColor="#ef4444" loading={loading} onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} />
    </SafeAreaView>;
};
export default VendorProfileScreen;