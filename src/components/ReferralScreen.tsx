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
  StatusBar,
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
      const message = `Join LookReal and get amazing Services! Use my referral code: ${referralCode}\n\nDownload the app now!`;
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
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
      onPress={() => navigation.navigate('ReferralDetail', { referralId: item._id })}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <View style={{ marginRight: 12 }}>
          {item.referee.avatar ? (
            <Image
              source={{ uri: item.referee.avatar }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#eb278d',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>
                {item.referee.firstName[0]}{item.referee.lastName[0]}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
            {item.referee.firstName} {item.referee.lastName}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>{item.referee.email}</Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            Joined {formatDate(item.referee.createdAt)}
          </Text>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={24}
            color={getStatusColor(item.status)}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Reward</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#eb278d' }}>
            {formatCurrency(item.referrerReward)}
          </Text>
        </View>
        {item.referrerPaid && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ECFDF5',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669', marginLeft: 4 }}>
              Paid
            </Text>
          </View>
        )}
        {!item.firstBookingCompleted && item.status === 'pending' && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFBEB',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Ionicons name="time" size={14} color="#F59E0B" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#D97706', marginLeft: 4 }}>
              Awaiting booking
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#eb278d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with Back Button */}
      <LinearGradient
        colors={['#eb278d', '#c71f73']}
        style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
      >
        {/* Back Button Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Title */}
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 }}>
          Referral Program
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.85)' }}>
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
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Stats Cards Row 1 */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#FDF2F8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="people" size={24} color="#eb278d" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                  {stats?.totalReferrals || 0}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Total Referrals
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="checkmark-done" size={24} color="#10B981" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                  {stats?.completedReferrals || 0}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Completed
                </Text>
              </View>
            </View>

            {/* Stats Card - Earnings */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#FFFBEB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="cash" size={28} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Earned</Text>
                  <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#111827' }}>
                    {formatCurrency(stats?.totalEarnings || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Referral Code Card */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                  Your Referral Code
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FDF2F8',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    marginBottom: 12,
                    borderWidth: 2,
                    borderColor: '#eb278d',
                    borderStyle: 'dashed',
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#eb278d', letterSpacing: 3 }}>
                    {referralCode}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                      onPress={copyReferralCode}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy-outline" size={20} color="#eb278d" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#eb278d',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#eb278d',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                      onPress={shareReferralCode}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                  Share this code with friends to earn rewards
                </Text>
              </View>
            </View>

            {/* Leaderboard Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginHorizontal: 20,
                marginTop: 16,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
              onPress={() => navigation.navigate('ReferralLeaderboard')}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFFBEB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  View Leaderboard
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Section Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 24,
                paddingBottom: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Your Referrals</Text>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                {stats?.totalReferrals || 0} total
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="people-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
              No referrals yet
            </Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
              Start inviting friends to earn rewards!
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#eb278d" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default ReferralScreen;