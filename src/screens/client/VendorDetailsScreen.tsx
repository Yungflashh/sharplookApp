import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Image, Linking, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, handleAPIError } from '@/api/api';
import ServiceCard from '@/components/clientComponent/ServiceCard';
import ReviewCard from '@/components/clientComponent/ReviewCard';
import callService from '@/services/call.service';

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
} = Dimensions.get('window');

type VendorDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VendorDetail'>;
type VendorDetailScreenRouteProp = RouteProp<RootStackParamList, 'VendorDetail'>;

interface VendorData {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  isOnline: boolean;
  vendorProfile: {
    businessName: string;
    businessDescription?: string;
    vendorType: string;
    rating: number;
    totalRatings: number;
    completedBookings: number;
    isVerified: boolean;
    categories: Array<{
      _id: string;
      name: string;
      icon: string;
    }>;
    location?: {
      address: string;
      city: string;
      state: string;
    };
    serviceRadius?: number;
  };
}

const VendorDetailScreen: React.FC = () => {
  const navigation = useNavigation<VendorDetailScreenNavigationProp>();
  const route = useRoute<VendorDetailScreenRouteProp>();
  const {
    vendorId
  } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getVendorDetail(vendorId);
      console.log('🔍 Full API Response:', JSON.stringify(response, null, 2));
      if (response.success || response.data?.success) {
        const responseData = response.data?.data || response.data;
        setVendor(responseData.vendor);
        setServices(responseData.services || []);
        setReviews(responseData.reviews || []);
        setStats(responseData.stats);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Vendor detail fetch error:', apiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVendorDetails().finally(() => {
      setRefreshing(false);
    });
  }, [vendorId]);

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
  };

  const handleCallVendor = async () => {
    if (vendor) {
      try {
        navigation.navigate('OngoingCall', {
          callType: 'voice',
          isOutgoing: true,
          otherUser: {
            _id: vendor._id,
            firstName: vendor.firstName,
            lastName: vendor.lastName,
            avatar: vendor.avatar,
          },
        });
      } catch (error) {
        console.error('Error initiating call:', error);
        Alert.alert('Error', 'Failed to initiate call');
      }
    }
  };
  const handleMessageVendor = () => {
    if (vendor) {
      navigation.navigate('ChatDetail', {
        vendorId: vendor._id,
        vendorName: vendor.vendorProfile.businessName
      });
    }
  };
  const handleShareVendor = () => {
    console.log('Share vendor:', vendorId);
  };
  const handleBookService = (serviceId: string) => {
    const service = services.find(s => s._id === serviceId);
    if (service && vendor) {
      if (service.isActive === false) {
        Alert.alert('Service Unavailable', 'This service is currently not available. Please contact the vendor for more information.', [{
          text: 'OK'
        }]);
        return;
      }
      navigation.navigate('CreateBooking', {
        service: {
          _id: service._id,
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          duration: service.duration,
          category: service.category,
          isActive: service.isActive
        },
        vendor: {
          _id: vendor._id,
          vendorProfile: {
            businessName: vendor.vendorProfile.businessName,
            vendorType: vendor.vendorProfile.vendorType,
            location: vendor.vendorProfile.location
          }
        }
      });
    }
  };
  const renderStars = (rating: number) => {
    return <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={16} color={star <= rating ? '#fbbf24' : '#d1d5db'} />)}
      </View>;
  };
  const formatVendorType = (type: string) => {
    switch (type) {
      case 'home_service':
        return 'Home Service';
      case 'in_shop':
        return 'In-Shop';
      case 'both':
        return 'Home & In-Shop';
      default:
        return 'Service Available';
    }
  };
  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading vendor details...</Text>
        </View>
      </SafeAreaView>;
  }
  if (!vendor) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 text-lg font-semibold mt-4">Vendor not found</Text>
          <TouchableOpacity className="mt-6 bg-pink-500 px-6 py-3 rounded-xl" onPress={() => navigation.goBack()}>
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="relative">
        {}
        <LinearGradient colors={['#eb278d', '#f472b6']} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} className="w-full h-64">
          {vendor.avatar ? <Image source={{
          uri: vendor.avatar
        }} className="w-full h-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center">
              <Ionicons name="person" size={80} color="rgba(255,255,255,0.5)" />
            </View>}
        </LinearGradient>

        {}
        <View className="absolute top-4 left-0 right-0 flex-row items-center justify-between px-5">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/90 items-center justify-center" onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/90 items-center justify-center" onPress={handleShareVendor}>
              <Ionicons name="share-outline" size={22} color="#1f2937" />
            </TouchableOpacity>

            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/90 items-center justify-center" onPress={handleFavoriteToggle}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>

        {}
        {vendor.isOnline && <View className="absolute top-4 left-1/2 -ml-12">
            <View className="bg-green-500 px-3 py-1.5 rounded-full flex-row items-center">
              <View className="w-2 h-2 bg-white rounded-full mr-2" />
              <Text className="text-white text-xs font-bold">Online Now</Text>
            </View>
          </View>}

        {}
        <View className="absolute bottom-0 left-0 right-0 px-5">
          <View className="bg-white rounded-3xl p-5 shadow-lg">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-2xl font-bold text-gray-900">
                    {vendor.vendorProfile?.businessName || `${vendor.firstName} ${vendor.lastName}`}
                  </Text>
                  {vendor.vendorProfile.isVerified && <Ionicons name="checkmark-circle" size={24} color="#10b981" />}
                </View>

                <View className="flex-row items-center gap-4 mb-3">
                  <View className="flex-row items-center gap-1">
                    {renderStars(vendor.vendorProfile.rating)}
                    <Text className="text-sm font-bold text-gray-900 ml-2">
                      {vendor.vendorProfile.rating.toFixed(1)}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      ({vendor.vendorProfile.totalRatings})
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <Ionicons name="location" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600">
                    {formatVendorType(vendor.vendorProfile.vendorType)}
                  </Text>
                </View>

                {vendor.vendorProfile?.location?.address && <View className="flex-row items-center gap-2 mt-1">
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                      {vendor.vendorProfile.location.city}, {vendor.vendorProfile.location.state}
                    </Text>
                  </View>}
              </View>
            </View>

            {}
            {vendor.vendorProfile.categories && vendor.vendorProfile.categories.length > 0 && <View className="flex-row flex-wrap gap-2 mt-4">
                {vendor.vendorProfile.categories.map(category => <View key={category._id} className="bg-pink-50 px-3 py-1.5 rounded-full">
                    <Text className="text-pink-600 text-xs font-semibold">
                      {category.name}
                    </Text>
                  </View>)}
              </View>}
          </View>
        </View>
      </View>

      {}
      <View className="flex-row px-5 mt-20 gap-3">
        <View className="flex-1 bg-white rounded-2xl p-4 items-center">
          <Ionicons name="checkmark-done" size={24} color="#10b981" />
          <Text className="text-2xl font-bold text-gray-900 mt-2">
            {vendor.vendorProfile.completedBookings}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">Completed</Text>
        </View>

        <View className="flex-1 bg-white rounded-2xl p-4 items-center">
          <Ionicons name="briefcase" size={24} color="#3b82f6" />
          <Text className="text-2xl font-bold text-gray-900 mt-2">
            {stats?.totalServices || 0}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">Services</Text>
        </View>

        <View className="flex-1 bg-white rounded-2xl p-4 items-center">
          <Ionicons name="chatbubbles" size={24} color="#f59e0b" />
          <Text className="text-2xl font-bold text-gray-900 mt-2">
            {stats?.totalReviews || 0}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">Reviews</Text>
        </View>
      </View>

      {}
      <View className="flex-row px-5 mt-6 gap-3">
        {(['about', 'services', 'reviews'] as const).map(tab => <TouchableOpacity key={tab} className={`flex-1 py-3 rounded-xl ${activeTab === tab ? 'bg-pink-500' : 'bg-white'}`} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text className={`text-center font-semibold capitalize ${activeTab === tab ? 'text-white' : 'text-gray-600'}`}>
              {tab}
            </Text>
          </TouchableOpacity>)}
      </View>

      {}
      <ScrollView className="flex-1 px-5 mt-4" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />}>
        {}
        {activeTab === 'about' && <View className="pb-32">
            {}
            {vendor.vendorProfile.businessDescription && <View className="bg-white rounded-2xl p-5 mb-4">
                <Text className="text-lg font-bold text-gray-900 mb-3">About</Text>
                <Text className="text-gray-600 leading-6">
                  {vendor.vendorProfile.businessDescription}
                </Text>
              </View>}

            {}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-lg font-bold text-gray-900 mb-4">Contact Information</Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <Ionicons name="call" size={20} color="#eb278d" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Phone</Text>
                    <Text className="text-sm font-semibold text-gray-900">{vendor.phone}</Text>
                  </View>
                </View>

                <View className="flex-row items-center mt-3">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <Ionicons name="mail" size={20} color="#eb278d" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Email</Text>
                    <Text className="text-sm font-semibold text-gray-900">{vendor.email}</Text>
                  </View>
                </View>

                {vendor.vendorProfile.location && <View className="flex-row items-center mt-3">
                    <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                      <Ionicons name="location" size={20} color="#eb278d" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Location</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {vendor.vendorProfile.location.address}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {vendor.vendorProfile.location.city}, {vendor.vendorProfile.location.state}
                      </Text>
                    </View>
                  </View>}
              </View>
            </View>

            {}
            {vendor.vendorProfile.serviceRadius && <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="navigate-circle" size={24} color="#eb278d" />
                    <Text className="text-base font-bold text-gray-900 ml-3">
                      Service Radius
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-pink-600">
                    {vendor.vendorProfile.serviceRadius} km
                  </Text>
                </View>
              </View>}
          </View>}

        {}
        {activeTab === 'services' && <View className="pb-32">
            {services.length > 0 ? <View className="space-y-4">
                {services.map(service => <ServiceCard key={service._id} service={service} onPress={() => handleBookService(service._id)} />)}
              </View> : <View className="bg-white rounded-2xl p-8 items-center">
                <Ionicons name="briefcase-outline" size={64} color="#d1d5db" />
                <Text className="text-gray-400 text-lg font-semibold mt-4">
                  No services available
                </Text>
                <Text className="text-gray-300 text-sm mt-2">
                  This vendor hasn't added services yet
                </Text>
              </View>}
          </View>}

        {}
        {activeTab === 'reviews' && <View className="pb-32">
            {reviews.length > 0 ? <>
                {}
                <View className="bg-white rounded-2xl p-5 mb-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-gray-900">
                      Customer Reviews
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Reviews', {
                userId: vendor._id,
                type: 'vendor'
              })} className="flex-row items-center" activeOpacity={0.7}>
                      <Text className="text-pink-600 font-semibold mr-1">
                        See All
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#eb278d" />
                    </TouchableOpacity>
                  </View>

                  {}
                  {vendor.vendorProfile && <View className="flex-row items-center justify-between bg-pink-50 rounded-xl p-4 mb-4">
                      <View className="items-center">
                        <Text className="text-4xl font-bold text-pink-600">
                          {(vendor.vendorProfile.rating || 0).toFixed(1)}
                        </Text>
                        <View className="flex-row mt-1">
                          {renderStars(Math.round(vendor.vendorProfile.rating || 0))}
                        </View>
                        <Text className="text-sm text-gray-600 mt-1">
                          {vendor.vendorProfile.totalRatings || 0} reviews
                        </Text>
                      </View>

                      {stats && <View className="flex-1 ml-6">
                          <Text className="text-xs font-semibold text-gray-700 mb-2">
                            Rating Distribution
                          </Text>
                          {[5, 4, 3, 2, 1].map(rating => {
                  const count = reviews.filter((r: any) => r.rating === rating).length || 0;
                  const percentage = reviews.length ? count / reviews.length * 100 : 0;
                  return <View key={rating} className="flex-row items-center gap-2 mb-1">
                                <Text className="text-xs text-gray-600 w-6">
                                  {rating}★
                                </Text>
                                <View className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <View className="h-full bg-yellow-400" style={{
                        width: `${percentage}%`
                      }} />
                                </View>
                                <Text className="text-xs text-gray-600 w-6 text-right">
                                  {count}
                                </Text>
                              </View>;
                })}
                        </View>}
                    </View>}
                </View>

                {}
                <Text className="text-base font-bold text-gray-900 mb-3 px-1">
                  Recent Reviews
                </Text>
                <View className="space-y-4">
                  {reviews.slice(0, 3).map(review => <ReviewCard key={review._id} review={review} />)}
                </View>

                {}
                {reviews.length > 3 && <TouchableOpacity onPress={() => navigation.navigate('Reviews', {
            userId: vendor._id,
            type: 'vendor'
          })} className="bg-white rounded-2xl p-4 mt-4 border-2 border-pink-500" activeOpacity={0.7}>
                    <Text className="text-pink-600 font-bold text-center">
                      View All {reviews.length} Reviews
                    </Text>
                  </TouchableOpacity>}
              </> : <View className="bg-white rounded-2xl p-8 items-center">
                <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                <Text className="text-gray-400 text-lg font-semibold mt-4">
                  No reviews yet
                </Text>
                <Text className="text-gray-300 text-sm mt-2 text-center">
                  {stats?.totalReviews > 0 ? 'Reviews are being loaded...' : 'Be the first to review this vendor'}
                </Text>
                {stats?.totalReviews > 0 && <TouchableOpacity onPress={() => fetchVendorDetails()} className="mt-4 bg-pink-500 px-6 py-3 rounded-xl" activeOpacity={0.7}>
                    <Text className="text-white font-semibold">Refresh Reviews</Text>
                  </TouchableOpacity>}
              </View>}
          </View>}
      </ScrollView>

      {}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4">
        <View className="flex-row gap-3">
          <TouchableOpacity className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center" onPress={handleCallVendor} activeOpacity={0.7}>
            <Ionicons name="call" size={24} color="#eb278d" />
          </TouchableOpacity>

          <TouchableOpacity className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center" onPress={handleMessageVendor} activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#eb278d" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 h-14 rounded-2xl items-center justify-center" style={{
          backgroundColor: '#eb278d',
          shadowColor: '#eb278d',
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6
        }} onPress={() => {
          if (services.length > 0) {
            if (activeTab === 'services') {
              handleBookService(services[0]._id);
            } else {
              setActiveTab('services');
            }
          } else {
            Alert.alert('No Services', 'This vendor has not added any services yet.', [{
              text: 'OK'
            }]);
          }
        }} activeOpacity={0.8}>
            <Text className="text-white text-base font-bold">
              {activeTab === 'services' && services.length > 0 ? 'Select Service' : 'Book Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>;
};
export default VendorDetailScreen;