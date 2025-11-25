import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { referralAPI } from '@/api/api';

interface LeaderboardEntry {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  referralCount: number;
  totalEarnings: number;
}

const ReferralLeaderboard = ({ navigation }: any) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await referralAPI.getLeaderboard(20);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `${index + 1}`;
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isTopThree = index < 3;

    return (
      <View
        className={`flex-row items-center bg-white mx-5 mb-3 rounded-2xl p-4 ${
          isTopThree ? 'border-2 border-amber-400' : ''
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Rank */}
        <View className="w-12 items-center mr-3">
          {isTopThree ? (
            <Text className="text-3xl">{getRankEmoji(index)}</Text>
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
              <Text className="text-base font-bold text-gray-600">{index + 1}</Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View className="flex-1 flex-row items-center">
          {item.user.avatar ? (
            <Image
              source={{ uri: item.user.avatar }}
              className="w-12 h-12 rounded-full mr-3"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-pink-500 items-center justify-center mr-3">
              <Text className="text-lg font-bold text-white">
                {item.user.firstName[0]}{item.user.lastName[0]}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 mb-1.5">
              {item.user.firstName} {item.user.lastName}
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center bg-pink-50 px-2 py-1 rounded-full">
                <Ionicons name="people" size={12} color="#eb278d" />
                <Text className="text-xs font-medium text-pink-600 ml-1">
                  {item.referralCount} referrals
                </Text>
              </View>
              <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-full">
                <Ionicons name="cash" size={12} color="#10B981" />
                <Text className="text-xs font-medium text-green-600 ml-1">
                  {formatCurrency(item.totalEarnings)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#eb278d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#c71f73']}
        className="px-5 pt-2 pb-8"
      >
        {/* Back Button Row */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Title & Subtitle */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white mb-1">Leaderboard</Text>
            <Text className="text-sm text-pink-100">Top referrers this month</Text>
          </View>
          <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="trophy" size={28} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.user._id}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16 px-5">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="trophy-outline" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-semibold text-gray-500 mb-2">
              No leaderboard data yet
            </Text>
            <Text className="text-sm text-gray-400 text-center">
              Be the first to start referring!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ReferralLeaderboard;