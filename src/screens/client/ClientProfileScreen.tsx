import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '@/components/ConfirmationModal';

interface MenuItem {
  icon: string;
  title: string;
  subtitle: string;
  iconFamily?: 'ionicons' | 'material';
  onPress: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const ClientProfileScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

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

  // Stats data
  const stats = [
    { label: 'Bookings', value: '12', icon: 'calendar' },
    { label: 'Favorites', value: '8', icon: 'heart' },
    { label: 'Reviews', value: '5', icon: 'star' },
  ];

  // Menu sections
  const menuSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-circle-outline',
          title: 'Personal Information',
          subtitle: 'Update your profile details',
          onPress: () => console.log('Personal Info'),
        },
        {
          icon: 'location-outline',
          title: 'My Addresses',
          subtitle: 'Manage delivery addresses',
          onPress: () => console.log('Addresses'),
        },
        {
          icon: 'card-outline',
          title: 'Payment Methods',
          subtitle: 'Manage payment options',
          onPress: () => console.log('Payment'),
        },
      ],
    },
    {
      title: 'Bookings & Orders',
      items: [
        {
          icon: 'calendar-outline',
          title: 'My Bookings',
          subtitle: 'View your appointments',
          onPress: () => console.log('Bookings'),
        },
        {
          icon: 'receipt-outline',
          title: 'Order History',
          subtitle: 'Track your orders',
          onPress: () => console.log('Orders'),
        },
        {
          icon: 'heart-outline',
          title: 'My Favorites',
          subtitle: 'Saved vendors and services',
          onPress: () => console.log('Favorites'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          title: 'Notifications',
          subtitle: 'Manage notification settings',
          onPress: () => console.log('Notifications'),
        },
        {
          icon: 'shield-checkmark-outline',
          title: 'Privacy & Security',
          subtitle: 'Password and security settings',
          onPress: () => console.log('Privacy'),
        },
        {
          icon: 'language-outline',
          iconFamily: 'material',
          title: 'Language',
          subtitle: 'English',
          onPress: () => console.log('Language'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          title: 'Help Center',
          subtitle: 'FAQs and support',
          onPress: () => console.log('Help'),
        },
        {
          icon: 'chatbubble-ellipses-outline',
          title: 'Contact Support',
          subtitle: 'Get help from our team',
          onPress: () => console.log('Contact'),
        },
        {
          icon: 'document-text-outline',
          title: 'Terms & Privacy',
          subtitle: 'Legal information',
          onPress: () => console.log('Legal'),
        },
      ],
    },
  ];

  const renderIcon = (
    iconFamily: string = 'ionicons',
    iconName: string,
    size: number = 22,
    color: string = '#eb278d'
  ) => {
    if (iconFamily === 'material') {
      return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
    }
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Enhanced Header with Gradient */}
        <View
          className="pb-6 rounded-b-[50px] bg-[#eb278d]"
          
        >
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-white">Profile</Text>
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View className="items-center pb-5 px-5">
            <TouchableOpacity activeOpacity={0.8} className="relative mb-4">
              <View
                className="w-[104px] h-[104px] rounded-full p-0.5"
              >
                <View className="w-[100px] h-[100px] rounded-full bg-white items-center justify-center">
                  <Ionicons name="person" size={50} color="#eb278d" />
                </View>
              </View>
              <TouchableOpacity
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-pink-500 items-center justify-center border-3 border-white"
                activeOpacity={0.7}
                style={{
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>

            <Text className="text-2xl font-bold text-white mb-1">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Adenusi Kayode'}
            </Text>
            <Text className="text-sm text-white/90 mb-3">
              {user?.email || 'kayskidadenusi@gmail.com'}
            </Text>

            {/* Verification Badge */}
            <View className="flex-row items-center bg-white/20 px-3 py-1.5 rounded-full">
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="text-xs text-white ml-1 font-semibold">Verified Account</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View className="flex-row px-5 pt-5 pb-3 justify-between">
            {stats.map((stat, index) => (
              <TouchableOpacity
                key={index}
                className="flex-1 mx-1 items-center bg-white/15 py-4 rounded-2xl"
                activeOpacity={0.7}
              >
                <Ionicons name={stat.icon as any} size={22} color="rgba(255, 255, 255, 0.9)" />
                <Text className="text-xl font-bold text-white mt-2">{stat.value}</Text>
                <Text className="text-[11px] text-white/80 mt-0.5">{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Sections */}
        <View className="pt-5 pb-20">
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-5 px-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                {section.title}
              </Text>
              <View
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 3,
                    },
                  }),
                }}
              >
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    className={`flex-row items-center p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View className="w-11 h-11 rounded-xl bg-pink-50 items-center justify-center mr-3">
                      {renderIcon(item.iconFamily, item.icon)}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-800 mb-0.5">
                        {item.title}
                      </Text>
                      <Text className="text-xs text-gray-500">{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Danger Zone */}
          <View className="mb-5 px-5">
            <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Account Actions
            </Text>
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                  },
                  android: {
                    elevation: 3,
                  },
                }),
              }}
            >
              <TouchableOpacity
                className="flex-row items-center p-4 bg-red-50 border-b border-gray-100"
                onPress={() => setShowLogoutModal(true)}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 rounded-xl bg-red-100 items-center justify-center mr-3">
                  <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-red-500">Logout</Text>
                  <Text className="text-xs text-red-400">Sign out of your account</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center p-4 bg-red-50"
                onPress={() => setShowDeleteModal(true)}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 rounded-xl bg-red-100 items-center justify-center mr-3">
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-red-500">Delete Account</Text>
                  <Text className="text-xs text-red-400">Permanently remove account</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version */}
          <View className="items-center py-5 mt-2">
            <Text className="text-xs text-gray-400 mb-1">Version 1.0.0</Text>
            <Text className="text-[11px] text-gray-400">© 2024 Sharplook</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        icon="log-out-outline"
        iconColor="#eb278d"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        confirmColor="#eb278d"
        loading={loading}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        icon="warning-outline"
        iconColor="#ef4444"
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmColor="#ef4444"
        loading={loading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
};

export default ClientProfileScreen;