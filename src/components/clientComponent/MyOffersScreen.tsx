import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';

interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  serviceType: 'home' | 'shop' | 'both'; // ✅ NEW FIELD
  responses: any[];
  createdAt: string;
  expiresAt: string;
  category: {
    name: string;
  };
  location?: { // ✅ Now optional
    address: string;
    city: string;
    state: string;
  };
}

const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getMyOffers({
        page: 1,
        limit: 50,
      });

      if (response.success) {
        const offersData = response.data.offers || response.data || [];
        
        // ✅ Filter out expired offers
        const activeOffers = offersData.filter((offer: Offer) => {
          const isExpired = offer.status.toLowerCase() === 'expired';
          const expiryDate = new Date(offer.expiresAt);
          const now = new Date();
          return !isExpired && expiryDate > now;
        });
        
        setOffers(activeOffers);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: 'checkmark-circle' as const,
          iconColor: '#059669',
        };
      case 'accepted':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: 'thumbs-up' as const,
          iconColor: '#3b82f6',
        };
      case 'closed':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'close-circle' as const,
          iconColor: '#6b7280',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'help-circle' as const,
          iconColor: '#6b7280',
        };
    }
  };

  // ✅ NEW: Service type configuration
  const getServiceTypeConfig = (type: string) => {
    switch (type) {
      case 'home':
        return {
          icon: 'home' as const,
          label: 'Home Service',
          color: '#10b981',
          bgColor: '#d1fae5',
        };
      case 'shop':
        return {
          icon: 'storefront' as const,
          label: 'In-Shop',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
      case 'both':
        return {
          icon: 'repeat' as const,
          label: 'Flexible',
          color: '#f59e0b',
          bgColor: '#fef3c7',
        };
      default:
        return {
          icon: 'help-circle' as const,
          label: 'Unknown',
          color: '#6b7280',
          bgColor: '#f3f4f6',
        };
    }
  };

  const renderOfferCard = (offer: Offer) => {
    const statusConfig = getStatusConfig(offer.status);
    const serviceTypeConfig = getServiceTypeConfig(offer.serviceType); // ✅ NEW

    return (
      <TouchableOpacity
        key={offer._id}
        className="bg-white rounded-3xl p-5 mb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={() =>
          navigation.navigate('OfferDetail', {
            offerId: offer._id,
          })
        }
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 mb-1.5" numberOfLines={2}>
              {offer.title}
            </Text>
            <View className="flex-row items-center flex-wrap gap-2">
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-pink-500 mr-2" />
                <Text className="text-sm text-gray-600 font-medium">
                  {offer.category.name}
                </Text>
              </View>
              
              {/* ✅ NEW: Service Type Badge */}
              <View 
                className="px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: serviceTypeConfig.bgColor }}
              >
                <Ionicons 
                  name={serviceTypeConfig.icon} 
                  size={12} 
                  color={serviceTypeConfig.color} 
                />
                <Text 
                  className="text-xs font-bold ml-1"
                  style={{ color: serviceTypeConfig.color }}
                >
                  {serviceTypeConfig.label}
                </Text>
              </View>
            </View>
          </View>

          <View
            className={`px-3 py-1.5 rounded-full ${statusConfig.bg} flex-row items-center`}
          >
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.iconColor} />
            <Text className={`text-xs font-bold ml-1 capitalize ${statusConfig.text}`}>
              {offer.status}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View className="flex-row gap-2 mb-4">
          {/* Budget */}
          <View className="flex-1 bg-pink-50 rounded-2xl p-3">
            <View className="flex-row items-center mb-1">
              <Ionicons name="cash" size={16} color="#eb278d" />
              <Text className="text-xs text-pink-700 font-semibold ml-1">BUDGET</Text>
            </View>
            <Text className="text-base font-bold text-pink-900">
              {formatPrice(offer.proposedPrice)}
            </Text>
          </View>

          {/* Responses */}
          <View className="flex-1 bg-blue-50 rounded-2xl p-3">
            <View className="flex-row items-center mb-1">
              <Ionicons name="chatbubbles" size={16} color="#3b82f6" />
              <Text className="text-xs text-blue-700 font-semibold ml-1">RESPONSES</Text>
            </View>
            <Text className="text-base font-bold text-blue-900">
              {offer.responses.length}
            </Text>
          </View>
        </View>

        {/* ✅ UPDATED: Location/Service Type Info */}
        <View className="bg-gray-50 rounded-2xl p-3 mb-4">
          <View className="flex-row items-center justify-between">
            {offer.serviceType === 'shop' ? (
              // Show service type for shop-only offers
              <View className="flex-row items-center flex-1">
                <View 
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: serviceTypeConfig.bgColor }}
                >
                  <Ionicons 
                    name={serviceTypeConfig.icon} 
                    size={16} 
                    color={serviceTypeConfig.color} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 font-semibold">SERVICE TYPE</Text>
                  <Text 
                    className="text-sm font-bold"
                    style={{ color: serviceTypeConfig.color }}
                  >
                    {serviceTypeConfig.label}
                  </Text>
                </View>
              </View>
            ) : (
              // Show location for home/both offers
              offer.location && (
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                    <Ionicons name="location" size={16} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 font-semibold">LOCATION</Text>
                    <Text className="text-sm text-gray-900 font-bold" numberOfLines={1}>
                      {offer.location.city}, {offer.location.state}
                    </Text>
                  </View>
                </View>
              )
            )}
            
            {/* Expiry - moved to right side */}
            <View className="flex-row items-center ml-3">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-2">
                <Ionicons name="time" size={16} color="#f97316" />
              </View>
              <View>
                <Text className="text-xs text-gray-500 font-semibold">EXPIRES</Text>
                <Text className="text-sm text-gray-900 font-bold">
                  {formatDate(offer.expiresAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">
              Posted {formatDate(offer.createdAt)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-sm text-pink-600 font-bold mr-1">View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#eb278d" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">
            Loading your offers...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text className="text-xl font-bold text-white text-center">My Offers</Text>
              <Text className="text-sm text-white/80 text-center">
                {offers.length} Active {offers.length === 1 ? 'Offer' : 'Offers'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('CreateOffer')}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
      >
        <View className="px-5 py-6">
          {offers.length > 0 ? (
            <>
              {/* Stats Card */}
              <View
                className="bg-white rounded-3xl p-5 mb-6"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-base font-bold text-gray-900 mb-4">
                  Quick Stats
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-green-50 rounded-2xl p-3">
                    <Text className="text-2xl font-bold text-green-700 mb-1">
                      {offers.filter((o) => o.status.toLowerCase() === 'open').length}
                    </Text>
                    <Text className="text-xs text-green-600 font-semibold">Open</Text>
                  </View>

                  <View className="flex-1 bg-blue-50 rounded-2xl p-3">
                    <Text className="text-2xl font-bold text-blue-700 mb-1">
                      {offers.filter((o) => o.status.toLowerCase() === 'accepted').length}
                    </Text>
                    <Text className="text-xs text-blue-600 font-semibold">Accepted</Text>
                  </View>

                  <View className="flex-1 bg-pink-50 rounded-2xl p-3">
                    <Text className="text-2xl font-bold text-pink-700 mb-1">
                      {offers.reduce((sum, o) => sum + o.responses.length, 0)}
                    </Text>
                    <Text className="text-xs text-pink-600 font-semibold">Responses</Text>
                  </View>
                </View>
              </View>

              {/* Offers List */}
              <View className="mb-4">
                <Text className="text-lg font-bold text-gray-900 mb-4">Your Offers</Text>
                {offers.map((offer) => renderOfferCard(offer))}
              </View>
            </>
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <View
                className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 items-center justify-center mb-6"
                style={{
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  className="w-32 h-32 rounded-full items-center justify-center"
                >
                  <Ionicons name="pricetag" size={56} color="#fff" />
                </LinearGradient>
              </View>

              <Text className="text-xl font-bold text-gray-900 mb-2">No Active Offers</Text>
              <Text className="text-gray-600 text-center mb-8 px-8 leading-6">
                Create your first offer and let vendors compete for your business with their best
                proposals!
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('CreateOffer')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  className="px-8 py-4 rounded-2xl"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="add-circle" size={22} color="#fff" />
                    <Text className="text-white text-base font-bold ml-2">Create Offer</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyOffersScreen;