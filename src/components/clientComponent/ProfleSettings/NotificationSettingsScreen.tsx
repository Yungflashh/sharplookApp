import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { userAPI, handleAPIError, notificationAPI } from '@/api/api';
interface NotificationPreferences {
  notificationsEnabled?: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  newMessages: boolean;
  paymentAlerts: boolean;
  reminderNotifications: boolean;
}
const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotifications: true,
    emailNotifications: true,
    bookingUpdates: true,
    promotions: false,
    newMessages: true,
    paymentAlerts: true,
    reminderNotifications: true
  });
  useEffect(() => {
    loadSettings();
  }, []);
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await notificationAPI.getNotificationSettings();
      console.log('🔍 Notification settings response:', JSON.stringify(response, null, 2));
      const settings = response.data?.data?.settings || response.data?.data || response.data?.settings || response.data;
      console.log('✅ Extracted settings:', settings);
      if (settings) {
        setPreferences({
          notificationsEnabled: settings.notificationsEnabled ?? true,
          pushNotifications: settings.pushNotifications ?? true,
          emailNotifications: settings.emailNotifications ?? true,
          bookingUpdates: settings.bookingUpdates ?? true,
          promotions: settings.promotions ?? false,
          newMessages: settings.newMessages ?? true,
          paymentAlerts: settings.paymentAlerts ?? true,
          reminderNotifications: settings.reminderNotifications ?? true
        });
      } else {
        console.log('⚠️ No settings found, using defaults');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Error loading settings:', apiError.message);
      Alert.alert('Error', 'Failed to load notification settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await notificationAPI.updateNotificationSettings(preferences);
      console.log('✅ Settings saved:', response);
      Alert.alert('Success', 'Notification settings updated successfully');
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Error saving settings:', apiError.message);
      Alert.alert('Error', apiError.message);
    } finally {
      setSaving(false);
    }
  };
  const toggleSwitch = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const notificationSections = [{
    title: 'General',
    items: [{
      key: 'pushNotifications' as keyof NotificationPreferences,
      icon: 'notifications',
      title: 'Push Notifications',
      subtitle: 'Receive push notifications on your device'
    }, {
      key: 'emailNotifications' as keyof NotificationPreferences,
      icon: 'mail',
      title: 'Email Notifications',
      subtitle: 'Receive notifications via email'
    }]
  }, {
    title: 'Activity',
    items: [{
      key: 'bookingUpdates' as keyof NotificationPreferences,
      icon: 'calendar',
      title: 'Booking Updates',
      subtitle: 'Get notified about booking status changes'
    }, {
      key: 'newMessages' as keyof NotificationPreferences,
      icon: 'chatbubble',
      title: 'New Messages',
      subtitle: 'Alerts for new messages from vendors'
    }, {
      key: 'paymentAlerts' as keyof NotificationPreferences,
      icon: 'card',
      title: 'Payment Alerts',
      subtitle: 'Updates on payment transactions'
    }, {
      key: 'reminderNotifications' as keyof NotificationPreferences,
      icon: 'alarm',
      title: 'Reminders',
      subtitle: 'Booking reminders and follow-ups'
    }]
  }, {
    title: 'Marketing',
    items: [{
      key: 'promotions' as keyof NotificationPreferences,
      icon: 'pricetag',
      title: 'Promotions & Offers',
      subtitle: 'Special deals and promotional content'
    }]
  }];
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Notifications
          </Text>
          <View className="w-10" />
        </View>
      </View>

      {loading ? <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 mt-2">Loading settings...</Text>
        </View> : <>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{
        paddingBottom: 100
      }}>
            {notificationSections.map((section, sectionIndex) => <View key={sectionIndex} className="mb-5 px-5 pt-5">
                <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                  {section.title}
                </Text>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {section.items.map((item, itemIndex) => <View key={item.key} className={`flex-row items-center p-4 ${itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <View className="w-11 h-11 rounded-xl bg-pink-50 items-center justify-center mr-3">
                        <Ionicons name={item.icon as any} size={22} color="#eb278d" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-gray-800 mb-0.5">
                          {item.title}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {item.subtitle}
                        </Text>
                      </View>
                      <Switch value={preferences[item.key]} onValueChange={() => toggleSwitch(item.key)} trackColor={{
                false: '#d1d5db',
                true: '#fbb6ce'
              }} thumbColor={preferences[item.key] ? '#eb278d' : '#f3f4f6'} disabled={saving} />
                    </View>)}
                </View>
              </View>)}

            {}
            <View className="mx-5 bg-blue-50 rounded-xl px-4 py-3 flex-row">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 ml-2 text-xs text-blue-600 leading-5">
                You can customize which notifications you receive. Changes are saved
                when you tap the "Save Changes" button.
              </Text>
            </View>
          </ScrollView>

          {}
          <View className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4 border-t border-gray-100">
            <TouchableOpacity className={`py-4 rounded-xl items-center ${saving ? 'bg-pink-300' : 'bg-pink-500'}`} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white font-semibold text-base">
                  Save Changes
                </Text>}
            </TouchableOpacity>
          </View>
        </>}
    </SafeAreaView>;
};
export default NotificationSettingsScreen;