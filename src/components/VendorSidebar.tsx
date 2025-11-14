import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  iconFamily?: 'ionicons' | 'material';
  onPress: () => void;
  badge?: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface VendorSidebarProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

const VendorSidebar: React.FC<VendorSidebarProps> = ({
  visible,
  onClose,
  userName = "John's Store",
  userEmail = 'vendor@example.com',
}) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 65,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          icon: 'home',
          onPress: () => {
            console.log('Dashboard');
            onClose();
          },
        },
        {
          id: 'orders',
          title: 'Orders',
          icon: 'cart',
          onPress: () => {
            console.log('Orders');
            onClose();
          },
          badge: '12',
        },
        {
          id: 'products',
          title: 'My Products',
          icon: 'cube',
          onPress: () => {
            console.log('Products');
            onClose();
          },
        },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        {
          id: 'inventory',
          title: 'Inventory',
          icon: 'package-variant',
          iconFamily: 'material',
          onPress: () => {
            console.log('Inventory');
            onClose();
          },
        },
        {
          id: 'promotions',
          title: 'Promotions',
          icon: 'pricetag',
          onPress: () => {
            console.log('Promotions');
            onClose();
          },
        },
        {
          id: 'analytics',
          title: 'Analytics',
          icon: 'analytics',
          onPress: () => {
            console.log('Analytics');
            onClose();
          },
        },
      ],
    },
    {
      title: 'STORE',
      items: [
        {
          id: 'store-settings',
          title: 'Store Settings',
          icon: 'storefront',
          onPress: () => {
            console.log('Store Settings');
            onClose();
          },
        },
        {
          id: 'reviews',
          title: 'Reviews',
          icon: 'star',
          onPress: () => {
            console.log('Reviews');
            onClose();
          },
        },
        {
          id: 'customers',
          title: 'Customers',
          icon: 'people',
          onPress: () => {
            console.log('Customers');
            onClose();
          },
        },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          icon: 'help-circle',
          onPress: () => {
            console.log('Help');
            onClose();
          },
        },
        {
          id: 'settings',
          title: 'Settings',
          icon: 'settings',
          onPress: () => {
            console.log('Settings');
            onClose();
          },
        },
      ],
    },
  ];

  const renderIcon = (iconFamily: string = 'ionicons', iconName: string, size: number = 22, color: string = '#6b7280') => {
    if (iconFamily === 'material') {
      return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
    }
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            className="absolute inset-0 bg-black"
            style={{ opacity: overlayOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }) }}
          />
        </TouchableWithoutFeedback>

        {/* Drawer */}
        <Animated.View
          className="absolute left-0 top-0 bottom-0 bg-white"
          style={{
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 2, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
              },
              android: {
                elevation: 16,
              },
            }),
          }}
        >
          <SafeAreaView className="flex-1" edges={['top']}>
            {/* Header with Gradient */}
            <LinearGradient
              colors={['#ec4899', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="pb-6"
            >
              {/* Close Button */}
              <View className="flex-row justify-end px-4 pt-2 pb-4">
                <TouchableOpacity
                  onPress={onClose}
                  className="w-10 h-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Profile Section */}
              <View className="px-6">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mr-4">
                    <View className="w-14 h-14 rounded-full bg-white items-center justify-center">
                      <Ionicons name="person" size={28} color="#ec4899" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-bold" numberOfLines={1}>
                      {userName}
                    </Text>
                    <Text className="text-white/90 text-sm mt-0.5" numberOfLines={1}>
                      {userEmail}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-full">
                        <View className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5" />
                        <Text className="text-white text-xs font-semibold">Active</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stats */}
                <View className="flex-row mt-6 pt-4 border-t border-white/20">
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">124</Text>
                    <Text className="text-white/80 text-xs mt-0.5">Orders</Text>
                  </View>
                  <View className="w-px bg-white/20" />
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">18</Text>
                    <Text className="text-white/80 text-xs mt-0.5">Products</Text>
                  </View>
                  <View className="w-px bg-white/20" />
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">4.8</Text>
                    <Text className="text-white/80 text-xs mt-0.5">Rating</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Menu Items */}
            <ScrollView 
              className="flex-1 pt-4"
              showsVerticalScrollIndicator={false}
            >
              {menuSections.map((section, sectionIndex) => (
                <View key={sectionIndex} className="mb-6">
                  {section.title && (
                    <Text className="text-gray-400 text-xs font-semibold px-6 mb-2 tracking-wider">
                      {section.title}
                    </Text>
                  )}
                  <View>
                    {section.items.map((item, itemIndex) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={item.onPress}
                        className="flex-row items-center px-6 py-3.5 active:bg-gray-50"
                        activeOpacity={0.7}
                      >
                        <View className="w-9 h-9 rounded-xl bg-pink-50 items-center justify-center mr-3">
                          {renderIcon(item.iconFamily, item.icon, 20, '#ec4899')}
                        </View>
                        <Text className="flex-1 text-gray-800 text-[15px] font-medium">
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View className="bg-pink-500 px-2 py-0.5 rounded-full min-w-[24px] items-center">
                            <Text className="text-white text-xs font-semibold">
                              {item.badge}
                            </Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {/* Logout Button */}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity
                  className="flex-row items-center justify-center bg-red-50 py-3.5 rounded-xl border border-red-200"
                  activeOpacity={0.7}
                  onPress={() => {
                    console.log('Logout');
                    onClose();
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text className="text-red-500 font-semibold ml-2">Logout</Text>
                </TouchableOpacity>
              </View>

              {/* Version Info */}
              <View className="items-center pb-6 px-6">
                <Text className="text-gray-400 text-xs">Version 1.0.0</Text>
                <Text className="text-gray-400 text-[10px] mt-1">© 2024 VendorHub</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default VendorSidebar;