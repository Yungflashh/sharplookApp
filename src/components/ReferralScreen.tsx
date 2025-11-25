import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Share,
  Clipboard,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { referralAPI } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
}

interface Referral {
  _id: string;
  referee: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    createdAt: string;
  };
  status: 'pending' | 'completed' | 'expired';
  referrerReward: number;
  referrerPaid: boolean;
  referrerPaidAt?: string;
  createdAt: string;
  completedAt?: string;
  firstBookingCompleted: boolean;
}

const ReferralScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadReferralData();
    getUserReferralCode();
  }, []);

  const getUserReferralCode = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setReferralCode(user.referralCode || '');
      }
    } catch (error) {
      console.error('Error getting referral code:', error);
    }
  };

const loadReferralData = async () => {
  try {
    setLoading(true);
    const [statsResponse, referralsResponse] = await Promise.all([
      referralAPI.getReferralStats(),
      referralAPI.getMyReferrals({ page: 1, limit: 20 }),
    ]);

    console.log('Stats response:', statsResponse);
    console.log('Referrals response:', referralsResponse);
    
    
    const statsData = statsResponse.data?.stats;
    setStats(statsData);
    
    
    const referralsData = referralsResponse.data;  
    
    console.log('Setting referrals:', referralsData?.length || 0, 'items');
    console.log('First referral:', referralsData?.[0]);
    
    setReferrals(referralsData || []);
    
    
    const pagination = referralsResponse.meta?.pagination;  
    setHasMore(pagination?.hasNextPage || false);
  } catch (error) {
    console.error('Error loading referral data:', error);
    Alert.alert('Error', 'Failed to load referral data');
  } finally {
    setLoading(false);
  }
};
const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadReferralData();
    setRefreshing(false);
  };

const loadMore = async () => {
  if (loadingMore || !hasMore) return;

  try {
    setLoadingMore(true);
    const nextPage = page + 1;
    const response = await referralAPI.getMyReferrals({ page: nextPage, limit: 20 });

    const newReferrals = response.data || [];  
    
    setReferrals(prev => [...prev, ...newReferrals]);
    setPage(nextPage);
    
    const pagination = response.meta?.pagination;  
    setHasMore(pagination?.hasNextPage || false);
  } catch (error) {
    console.error('Error loading more referrals:', error);
  } finally {
    setLoadingMore(false);
  }
};

  const shareReferralCode = async () => {
    try {
      const message = `Join Sharplook and get amazing Services! Use my referral code: ${referralCode}\n\nDownload the app now!`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyReferralCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Success', 'Referral code copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'expired':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderReferralItem = ({ item }: { item: Referral }) => (
    <TouchableOpacity
      className="bg-white mx-5 mb-3 rounded-2xl p-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
      onPress={() => navigation.navigate('ReferralDetail', { referralId: item._id })}
      activeOpacity={0.7}
    >
      <View className="flex-row mb-3">
        <View className="mr-3">
          {item.referee.avatar ? (
            <Image 
              source={{ uri: item.referee.avatar }} 
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-pink-500 items-center justify-center">
              <Text className="text-lg font-bold text-white">
                {item.referee.firstName[0]}{item.referee.lastName[0]}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 mb-0.5">
            {item.referee.firstName} {item.referee.lastName}
          </Text>
          <Text className="text-sm text-gray-600 mb-0.5">{item.referee.email}</Text>
          <Text className="text-xs text-gray-400">
            Joined {formatDate(item.referee.createdAt)}
          </Text>
        </View>
        <View className="justify-center">
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={24}
            color={getStatusColor(item.status)}
          />
        </View>
      </View>

      <View 
        className="flex-row justify-between items-center pt-3"
        style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}
      >
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Reward</Text>
          <Text className="text-lg font-bold text-pink-600">
            {formatCurrency(item.referrerReward)}
          </Text>
        </View>
        {item.referrerPaid && (
          <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full">
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text className="text-xs font-semibold text-green-600 ml-1">Paid</Text>
          </View>
        )}
        {!item.firstBookingCompleted && item.status === 'pending' && (
          <View className="flex-row items-center bg-yellow-50 px-3 py-1.5 rounded-full">
            <Ionicons name="time" size={16} color="#F59E0B" />
            <Text className="text-xs font-semibold text-yellow-600 ml-1">
              Awaiting booking
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#eb278d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <LinearGradient
        colors={['#eb278d', '#c71f73']}
        className="px-5 pt-4 pb-8"
      >
        <Text className="text-3xl font-bold text-white mb-2">Referral Program</Text>
        <Text className="text-base text-pink-100">
          Earn rewards by inviting friends
        </Text>
      </LinearGradient>

      <FlatList
        data={referrals}
        renderItem={renderReferralItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <>
            {}
            <View className="flex-row px-5 py-5 gap-3">
              <View 
                className="flex-1 bg-white rounded-2xl p-4 items-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="people" size={32} color="#eb278d" />
                <Text className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.totalReferrals || 0}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 text-center">
                  Total Referrals
                </Text>
              </View>
              <View 
                className="flex-1 bg-white rounded-2xl p-4 items-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="checkmark-done" size={32} color="#10B981" />
                <Text className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.completedReferrals || 0}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 text-center">
                  Completed
                </Text>
              </View>
            </View>

            <View className="flex-row px-5 pb-5 gap-3">
              <View 
                className="flex-1 bg-white rounded-2xl p-4 items-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="cash" size={32} color="#F59E0B" />
                <Text className="text-xl font-bold text-gray-900 mt-2 text-center">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 text-center">
                  Total Earned
                </Text>
              </View>
            </View>

            {}
            <View 
              className="mx-5 mb-5 bg-white rounded-2xl p-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Your Referral Code
              </Text>
              <View 
                className="flex-row items-center justify-between bg-pink-50 rounded-xl px-4 py-4 mb-3"
                style={{
                  borderWidth: 2,
                  borderColor: '#eb278d',
                  borderStyle: 'dashed',
                }}
              >
                <Text className="text-2xl font-bold text-pink-600" style={{ letterSpacing: 2 }}>
                  {referralCode}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center"
                    onPress={copyReferralCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy" size={20} color="#eb278d" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center"
                    onPress={shareReferralCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-social" size={20} color="#eb278d" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-sm text-gray-500 text-center">
                Share this code with friends to earn rewards
              </Text>
            </View>

            {}
            <TouchableOpacity
              className="flex-row items-center justify-between mx-5 mb-5 bg-white rounded-xl p-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => navigation.navigate('ReferralLeaderboard')}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy" size={24} color="#F59E0B" />
              <Text className="flex-1 text-base font-semibold text-gray-900 ml-3">
                View Leaderboard
              </Text>
              <Ionicons name="chevron-forward" size={24} color="#6B7280" />
            </TouchableOpacity>

            {}
            <View className="flex-row items-center justify-between px-5 pb-3">
              <Text className="text-xl font-bold text-gray-900">Your Referrals</Text>
              <Text className="text-sm text-gray-500">
                {stats?.totalReferrals || 0} total
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16 px-5">
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-semibold text-gray-400 mt-4">No referrals yet</Text>
            <Text className="text-sm text-gray-300 mt-2">
              Start inviting friends to earn rewards!
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-5 items-center">
              <ActivityIndicator size="small" color="#eb278d" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default ReferralScreen;