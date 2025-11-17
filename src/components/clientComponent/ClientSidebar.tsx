import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.7;
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
interface ClientSidebarProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}
const ClientSidebar: React.FC<ClientSidebarProps> = ({
  visible,
  onClose,
  userName = 'Kayode',
  userEmail = 'kayode@example.com'
}) => {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 65
      }), Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })]).start();
    } else {
      Animated.parallel([Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true
      }), Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })]).start();
    }
  }, [visible]);
  const menuSections: MenuSection[] = [{
    items: [{
      id: 'home',
      title: 'Home',
      icon: 'home',
      onPress: () => {
        console.log('Home');
        onClose();
      }
    }, {
      id: 'bookings',
      title: 'My Bookings',
      icon: 'calendar',
      onPress: () => {
        console.log('Bookings');
        onClose();
      }
    }, {
      id: 'favorites',
      title: 'Favorites',
      icon: 'heart',
      onPress: () => {
        console.log('Favorites');
        onClose();
      }
    }]
  }, {
    title: 'SERVICES',
    items: [{
      id: 'beauty',
      title: 'Beauty & Wellness',
      icon: 'sparkles',
      onPress: () => {
        console.log('Beauty');
        onClose();
      }
    }, {
      id: 'spa',
      title: 'Body Treatment & Spa',
      icon: 'flower',
      iconFamily: 'material',
      onPress: () => {
        console.log('Spa');
        onClose();
      }
    }, {
      id: 'skincare',
      title: 'Skincare',
      icon: 'water',
      onPress: () => {
        console.log('Skincare');
        onClose();
      }
    }, {
      id: 'makeup',
      title: 'Makeup',
      icon: 'brush',
      iconFamily: 'material',
      onPress: () => {
        console.log('Makeup');
        onClose();
      }
    }]
  }, {
    title: 'ACCOUNT',
    items: [{
      id: 'profile',
      title: 'My Profile',
      icon: 'person',
      onPress: () => {
        console.log('Profile');
        onClose();
      }
    }, {
      id: 'orders',
      title: 'My Orders',
      icon: 'receipt',
      onPress: () => {
        console.log('Orders');
        onClose();
      }
    }, {
      id: 'wallet',
      title: 'Wallet',
      icon: 'wallet',
      onPress: () => {
        console.log('Wallet');
        onClose();
      }
    }, {
      id: 'settings',
      title: 'Settings',
      icon: 'settings',
      onPress: () => {
        console.log('Settings');
        onClose();
      }
    }]
  }, {
    title: 'SUPPORT',
    items: [{
      id: 'help',
      title: 'Help Center',
      icon: 'help-circle',
      onPress: () => {
        console.log('Help');
        onClose();
      }
    }, {
      id: 'contact',
      title: 'Contact Us',
      icon: 'call',
      onPress: () => {
        console.log('Contact');
        onClose();
      }
    }, {
      id: 'about',
      title: 'About Sharplook',
      icon: 'information-circle',
      onPress: () => {
        console.log('About');
        onClose();
      }
    }]
  }];
  const renderIcon = (iconFamily: string = 'ionicons', iconName: string, size: number = 22, color: string = '#6b7280') => {
    if (iconFamily === 'material') {
      return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
    }
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };
  return <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        {}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View className="absolute inset-0 bg-black" style={{
          opacity: overlayOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5]
          })
        }} />
        </TouchableWithoutFeedback>

        {}
        <Animated.View className="absolute right-0 top-0 bottom-0 bg-white" style={{
        width: DRAWER_WIDTH,
        transform: [{
          translateX: slideAnim
        }],
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: {
              width: -2,
              height: 0
            },
            shadowOpacity: 0.25,
            shadowRadius: 10
          },
          android: {
            elevation: 16
          }
        })
      }}>
          <SafeAreaView className="flex-1" edges={['top']}>
            {}
            <LinearGradient colors={['#eb278d', '#f472b6']} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} className="pb-6">
              {}
              <View className="flex-row justify-end px-5 pt-3 pb-4">
                <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {}
              <View className="px-6">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mr-4">
                    <View className="w-14 h-14 rounded-full bg-white items-center justify-center">
                      <Ionicons name="person" size={28} color="#eb278d" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xl font-bold" numberOfLines={1}>
                      Hello {userName}
                    </Text>
                    <Text className="text-white/90 text-sm mt-1" numberOfLines={1}>
                      {userEmail}
                    </Text>
                  </View>
                </View>

                {}
                <View className="flex-row mt-6 pt-5 border-t border-white/20">
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">0</Text>
                    <Text className="text-white/80 text-xs mt-1">Bookings</Text>
                  </View>
                  <View className="w-px bg-white/20" />
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">0</Text>
                    <Text className="text-white/80 text-xs mt-1">Favorites</Text>
                  </View>
                  <View className="w-px bg-white/20" />
                  <View className="flex-1 items-center">
                    <Text className="text-white text-xl font-bold">0</Text>
                    <Text className="text-white/80 text-xs mt-1">Reviews</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {}
            <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false}>
              {menuSections.map((section, sectionIndex) => <View key={sectionIndex} className="mb-6">
                  {section.title && <Text className="text-gray-400 text-xs font-semibold px-6 mb-2 tracking-wider">
                      {section.title}
                    </Text>}
                  <View>
                    {section.items.map(item => <TouchableOpacity key={item.id} onPress={item.onPress} className="flex-row items-center px-6 py-3.5 active:bg-gray-50" activeOpacity={0.7}>
                        <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                          {renderIcon(item.iconFamily, item.icon, 22, '#eb278d')}
                        </View>
                        <Text className="flex-1 text-gray-800 text-[15px] font-medium">
                          {item.title}
                        </Text>
                        {item.badge && <View className="bg-pink-500 px-2 py-0.5 rounded-full min-w-[24px] items-center mr-2">
                            <Text className="text-white text-xs font-semibold">
                              {item.badge}
                            </Text>
                          </View>}
                        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                      </TouchableOpacity>)}
                  </View>
                </View>)}

              {}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity className="flex-row items-center justify-center bg-red-50 py-3.5 rounded-xl border border-red-200" activeOpacity={0.7} onPress={() => {
                console.log('Logout');
                onClose();
              }}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text className="text-red-500 font-semibold ml-2">Logout</Text>
                </TouchableOpacity>
              </View>

              {}
              <View className="items-center pb-6 px-6">
                <Text className="text-gray-400 text-xs">Version 1.0.0</Text>
                <Text className="text-gray-400 text-[10px] mt-1">© 2024 Sharplook</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>;
};
export default ClientSidebar;