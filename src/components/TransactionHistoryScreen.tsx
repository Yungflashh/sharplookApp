import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sharpPayAPI } from '../api/api';
import { useNavigation } from '@react-navigation/native';
import WalletFundingModal from '@/components/WalletFundingModal';
import WithdrawalModal from '@/components/WIthdrawalModal';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  reference: string;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
}

interface TransactionStats {
  totalTransactions: number;
  totalInflow: number;
  totalOutflow: number;
  currentBalance: number;
}

const TransactionHistoryScreen = () => {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [fundingModalVisible, setFundingModalVisible] = useState<boolean>(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState<boolean>(false);

  const loadTransactions = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await sharpPayAPI.getTransactions({
        page: pageNum,
        limit: 20,
      });

      const newTransactions = response.data || [];
      const pagination = response.meta?.pagination;

      console.log('✅ Transactions extracted:', newTransactions.length);

      if (refresh || pageNum === 1) {
        setTransactions(newTransactions);
        calculateTotalsFromTransactions(newTransactions);
      } else {
        const allTransactions = [...transactions, ...newTransactions];
        setTransactions(allTransactions);
        calculateTotalsFromTransactions(allTransactions);
      }

      if (pagination) {
        setHasMore(pagination.hasNextPage || false);
      } else {
        setHasMore(newTransactions.length === 20);
      }
      
      setPage(pageNum);
    } catch (error: any) {
      console.error('❌ Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const calculateTotalsFromTransactions = (txns: Transaction[]) => {
    let totalInflow = 0;
    let totalOutflow = 0;

    txns.forEach((txn) => {
      if (isOutflow(txn.type)) {
        totalOutflow += txn.amount;
      } else {
        totalInflow += txn.amount;
      }
    });

    setStats((prevStats) => ({
      totalTransactions: txns.length,
      totalInflow,
      totalOutflow,
      currentBalance: prevStats?.currentBalance || 0,
    }));

    console.log('💰 Calculated totals - Inflow:', totalInflow, 'Outflow:', totalOutflow);
  };

  const loadStats = async () => {
    try {
      const response = await sharpPayAPI.getStats();
      const statsData = response.data.stats || {};
      
      console.log('📊 Stats Data extracted:', statsData);
      
      setStats((prevStats) => ({
        totalTransactions: prevStats?.totalTransactions || 0,
        totalInflow: prevStats?.totalInflow || 0,
        totalOutflow: prevStats?.totalOutflow || 0,
        currentBalance: statsData.currentBalance || statsData.availableBalance || 0,
      }));
      
      console.log('✅ Stats set successfully');
    } catch (error: any) {
      console.error('❌ Error loading stats:', error);
      setStats((prevStats) => ({
        totalTransactions: prevStats?.totalTransactions || 0,
        totalInflow: prevStats?.totalInflow || 0,
        totalOutflow: prevStats?.totalOutflow || 0,
        currentBalance: 0,
      }));
    }
  };

  useEffect(() => {
    loadTransactions(1);
    loadStats();
  }, []);

  const onRefresh = useCallback(() => {
    loadTransactions(1, true);
    loadStats();
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(page + 1);
    }
  };

  const getTransactionIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('payment') || lowerType.includes('debit')) {
      return { name: 'arrow-up-circle', color: '#ef4444' };
    }
    if (lowerType.includes('earning') || lowerType.includes('credit') || lowerType.includes('deposit')) {
      return { name: 'arrow-down-circle', color: '#10b981' };
    }
    if (lowerType.includes('refund')) {
      return { name: 'arrow-back-circle', color: '#3b82f6' };
    }
    if (lowerType.includes('withdrawal')) {
      return { name: 'cash-outline', color: '#f59e0b' };
    }
    
    return { name: 'swap-horizontal', color: '#6b7280' };
  };

  const formatType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} min ago`;
    }
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    if (diffInHours < 48) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const isOutflow = (type: string) => {
    const outflowTypes = ['payment', 'withdrawal', 'debit', 'commission'];
    return outflowTypes.some(t => type.toLowerCase().includes(t));
  };

  const filterByDate = (transaction: Transaction) => {
    if (dateFilter === 'all') return true;

    const txnDate = new Date(transaction.createdAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      return txnDate >= todayStart;
    }

    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return txnDate >= weekAgo;
    }

    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return txnDate >= monthAgo;
    }

    return true;
  };

  const filteredTransactions = (transactions || [])
    .filter(txn => {
      if (filter === 'inflow' && isOutflow(txn.type)) return false;
      if (filter === 'outflow' && !isOutflow(txn.type)) return false;
      return filterByDate(txn);
    });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Transaction History</Text>
          <View className="w-10" />
        </View>
        
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-3">Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Transaction History</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#eb278d']} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Wallet Card - Enhanced Design */}
        {stats && (
          <>
            <View className="px-4 pt-4">
              <LinearGradient 
                colors={['#eb278d', '#f472b6']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={{
                  padding: 20,
                  borderRadius: 24,
                  overflow: 'hidden',
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12
                }}
              >
                {/* Header Row */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/90 text-sm font-medium">
                      Total Balance
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setShowBalance(!showBalance)} 
                      className="w-8 h-8 items-center justify-center rounded-full" 
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} 
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={showBalance ? "eye-outline" : "eye-off-outline"} 
                        size={16} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  <View className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                    <Ionicons name="stats-chart" size={14} color="#fff" />
                    <Text className="text-white text-xs font-semibold">
                      Overview
                    </Text>
                  </View>
                </View>

                {/* Balance Display */}
                <View className="mb-6">
                  {showBalance ? (
                    <View>
                      <Text className="text-white text-4xl font-bold tracking-tight mb-2">
                        ₦{(stats.currentBalance || 0).toLocaleString()}
                      </Text>
                      <View className="flex-row items-center gap-4">
                        <View>
                          <Text className="text-white/70 text-xs">Total Inflow</Text>
                          <Text className="text-white font-semibold">
                            ₦{(stats.totalInflow || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View className="w-px h-8 bg-white/30" />
                        <View>
                          <Text className="text-white/70 text-xs">Total Outflow</Text>
                          <Text className="text-white font-semibold">
                            ₦{(stats.totalOutflow || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <Text className="text-white text-4xl font-bold tracking-widest mb-2">
                        ••••••
                      </Text>
                      <Text className="text-white/70 text-sm">Tap eye to view balance</Text>
                    </View>
                  )}
                </View>

                {/* Quick Stats */}
                <View className="flex-row gap-3 bg-white/10 rounded-2xl p-3 mb-4">
                  <View className="flex-1 items-center">
                    <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-2">
                      <Ionicons name="trending-up" size={18} color="#fff" />
                    </View>
                    <Text className="text-white/70 text-xs mb-1">Inflow</Text>
                    <Text className="text-white text-sm font-bold">
                      {showBalance ? `₦${(stats.totalInflow || 0).toLocaleString()}` : '••••'}
                    </Text>
                  </View>
                  
                  <View className="w-px bg-white/20" />
                  
                  <View className="flex-1 items-center">
                    <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-2">
                      <Ionicons name="trending-down" size={18} color="#fff" />
                    </View>
                    <Text className="text-white/70 text-xs mb-1">Outflow</Text>
                    <Text className="text-white text-sm font-bold">
                      {showBalance ? `₦${(stats.totalOutflow || 0).toLocaleString()}` : '••••'}
                    </Text>
                  </View>
                  
                  <View className="w-px bg-white/20" />
                  
                  <View className="flex-1 items-center">
                    <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-2">
                      <Ionicons name="receipt" size={18} color="#fff" />
                    </View>
                    <Text className="text-white/70 text-xs mb-1">Total</Text>
                    <Text className="text-white text-sm font-bold">
                      {stats.totalTransactions || 0}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-4">
                  <TouchableOpacity 
                    className="flex-1 bg-white/20 rounded-2xl py-3 items-center flex-row justify-center gap-2" 
                    activeOpacity={0.7} 
                    onPress={() => setFundingModalVisible(true)}
                  >
                    <View className="w-10 h-10 rounded-full bg-white/30 items-center justify-center">
                      <Ionicons name="add" size={20} color="#fff" />
                    </View>
                    <Text className="text-white text-sm font-semibold">Fund Wallet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className="flex-1 bg-white rounded-2xl py-3 items-center flex-row justify-center gap-2" 
                    activeOpacity={0.7} 
                    onPress={() => setWithdrawalModalVisible(true)}
                  >
                    <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center">
                      <Ionicons name="arrow-up" size={20} color="#eb278d" />
                    </View>
                    <Text className="text-gray-800 text-sm font-semibold">Withdraw</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </>
        )}

        {/* Filter Buttons */}
        <View className="flex-row px-4 pt-4 gap-2">
          <TouchableOpacity
            className={`flex-1 py-2.5 px-4 rounded-full items-center border ${
              filter === 'all' 
                ? 'bg-pink-500 border-pink-500' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setFilter('all')}
          >
            <Text className={`text-sm font-medium ${
              filter === 'all' ? 'text-white' : 'text-gray-600'
            }`}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2.5 px-4 rounded-full items-center border ${
              filter === 'inflow' 
                ? 'bg-pink-500 border-pink-500' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setFilter('inflow')}
          >
            <Text className={`text-sm font-medium ${
              filter === 'inflow' ? 'text-white' : 'text-gray-600'
            }`}>
              Inflow
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2.5 px-4 rounded-full items-center border ${
              filter === 'outflow' 
                ? 'bg-pink-500 border-pink-500' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setFilter('outflow')}
          >
            <Text className={`text-sm font-medium ${
              filter === 'outflow' ? 'text-white' : 'text-gray-600'
            }`}>
              Outflow
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter */}
        <View className="px-4 pt-3">
          <Text className="text-gray-500 text-xs font-medium mb-2">FILTER BY DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`py-2 px-4 rounded-full border ${
                  dateFilter === 'all'
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setDateFilter('all')}
              >
                <Text className={`text-sm font-medium ${
                  dateFilter === 'all' ? 'text-white' : 'text-gray-600'
                }`}>
                  All Time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-2 px-4 rounded-full border ${
                  dateFilter === 'today'
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setDateFilter('today')}
              >
                <Text className={`text-sm font-medium ${
                  dateFilter === 'today' ? 'text-white' : 'text-gray-600'
                }`}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-2 px-4 rounded-full border ${
                  dateFilter === 'week'
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setDateFilter('week')}
              >
                <Text className={`text-sm font-medium ${
                  dateFilter === 'week' ? 'text-white' : 'text-gray-600'
                }`}>
                  Last 7 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-2 px-4 rounded-full border ${
                  dateFilter === 'month'
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setDateFilter('month')}
              >
                <Text className={`text-sm font-medium ${
                  dateFilter === 'month' ? 'text-white' : 'text-gray-600'
                }`}>
                  Last 30 Days
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Transactions List */}
        <View className="px-4 pt-4">
          {filteredTransactions.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-900 text-lg font-semibold mt-4">No Transactions</Text>
              <Text className="text-gray-500 text-sm text-center px-8 mt-2">
                {filter === 'all'
                  ? 'Your transaction history will appear here'
                  : `No ${filter} transactions found`}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction, index) => {
              const icon = getTransactionIcon(transaction.type);
              const isNegative = isOutflow(transaction.type);

              return (
                <TouchableOpacity
                  key={`${transaction._id}-${index}`}
                  className={`flex-row items-center justify-between bg-white rounded-xl p-4 border border-gray-200 ${
                    index === filteredTransactions.length - 1 ? '' : 'mb-3'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-12 h-12 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${icon.color}20` }}
                    >
                      <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-gray-900 text-[15px] font-semibold mb-0.5">
                        {formatType(transaction.type)}
                      </Text>
                      <Text className="text-gray-500 text-[13px] mb-0.5" numberOfLines={1}>
                        {transaction.description}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {formatDate(transaction.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end ml-3">
                    <Text className={`text-base font-bold mb-1.5 ${
                      isNegative ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {isNegative ? '-' : '+'}₦{transaction.amount.toLocaleString()}
                    </Text>
                    
                    <View className={`px-2.5 py-1 rounded-full ${
                      transaction.status === 'completed' ? 'bg-green-100' :
                      transaction.status === 'pending' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <Text className={`text-[11px] font-semibold ${
                        transaction.status === 'completed' ? 'text-green-600' :
                        transaction.status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {loadingMore && (
            <View className="flex-row items-center justify-center py-5">
              <ActivityIndicator size="small" color="#eb278d" />
              <Text className="text-gray-500 text-sm ml-2">Loading more...</Text>
            </View>
          )}

          {!hasMore && filteredTransactions.length > 0 && (
            <View className="items-center py-5">
              <Text className="text-gray-400 text-sm">No more transactions</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Wallet Funding Modal */}
      <WalletFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSuccess={() => {
          loadTransactions(1, true);
          loadStats();
        }}
        currentBalance={stats?.currentBalance || 0}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        visible={withdrawalModalVisible}
        onClose={() => setWithdrawalModalVisible(false)}
        onSuccess={() => {
          loadTransactions(1, true);
          loadStats();
        }}
        currentBalance={stats?.currentBalance || 0}
      />
    </SafeAreaView>
  );
};

export default TransactionHistoryScreen;