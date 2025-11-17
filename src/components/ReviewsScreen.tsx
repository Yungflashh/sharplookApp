import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { reviewAPI, handleAPIError } from '@/api/api';
type ReviewsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reviews'>;
type ReviewsRouteProp = RouteProp<RootStackParamList, 'Reviews'>;
interface Review {
  _id: string;
  reviewer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  title?: string;
  comment: string;
  detailedRatings?: {
    quality?: number;
    punctuality?: number;
    communication?: number;
    value?: number;
  };
  images?: string[];
  response?: {
    comment: string;
    respondedAt: string;
  };
  createdAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
}
const ReviewsScreen: React.FC = () => {
  const navigation = useNavigation<ReviewsNavigationProp>();
  const route = useRoute<ReviewsRouteProp>();
  const {
    userId,
    serviceId,
    type = 'vendor'
  } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fetchReviews = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params = {
        page: pageNum,
        limit: 20,
        rating: selectedRating || undefined
      };
      let response;
      if (type === 'service' && serviceId) {
        response = await reviewAPI.getServiceReviews(serviceId, params);
      } else if (userId) {
        response = await reviewAPI.getReviewsForUser(userId, params);
      }
      console.log('Reviews response:', response);
      if (response?.success) {
        const newReviews = Array.isArray(response.data) ? response.data : response.data.reviews || [];
        if (append) {
          setReviews(prev => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }
        const hasNext = response.meta?.pagination?.hasNextPage ?? newReviews.length === 20;
        setHasMore(hasNext);
        setPage(pageNum);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Reviews fetch error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    if (!userId) return;
    try {
      const response = await reviewAPI.getReviewStats(userId);
      if (response.success) {
        setStats(response.data.stats || response.data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };
  useEffect(() => {
    fetchReviews();
    if (userId) fetchStats();
  }, [selectedRating]);
  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchReviews(1, false), fetchStats()]).finally(() => setRefreshing(false));
  };
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(page + 1, true);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const renderStars = (rating: number, size: number = 16) => {
    return <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={size} color={star <= rating ? '#fbbf24' : '#d1d5db'} />)}
      </View>;
  };
  const renderReviewCard = (review: Review) => <View key={review._id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  }}>
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mr-3">
            {review.reviewer.avatar ? <Image source={{
            uri: review.reviewer.avatar
          }} className="w-12 h-12 rounded-full" /> : <Text className="text-lg font-bold text-pink-600">
                {review.reviewer.firstName.charAt(0)}
                {review.reviewer.lastName.charAt(0)}
              </Text>}
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">
              {review.reviewer.firstName} {review.reviewer.lastName}
            </Text>
            <Text className="text-xs text-gray-500">
              {formatDate(review.createdAt)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          {renderStars(review.rating, 18)}
          <Text className="text-sm font-bold text-gray-900 ml-1">
            {review.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      {}
      {review.title && <Text className="text-base font-bold text-gray-900 mb-2">
          {review.title}
        </Text>}

      {}
      <Text className="text-gray-700 mb-3">{review.comment}</Text>

      {}
      {review.detailedRatings && <View className="bg-gray-50 rounded-xl p-3 mb-3">
          <Text className="text-xs font-bold text-gray-700 mb-2">
            Detailed Ratings:
          </Text>
          <View className="gap-2">
            {review.detailedRatings.quality && <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Quality</Text>
                {renderStars(review.detailedRatings.quality, 14)}
              </View>}
            {review.detailedRatings.punctuality && <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Punctuality</Text>
                {renderStars(review.detailedRatings.punctuality, 14)}
              </View>}
            {review.detailedRatings.communication && <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Communication</Text>
                {renderStars(review.detailedRatings.communication, 14)}
              </View>}
            {review.detailedRatings.value && <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Value</Text>
                {renderStars(review.detailedRatings.value, 14)}
              </View>}
          </View>
        </View>}

      {}
      {review.response && <View className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-3">
          <View className="flex-row items-center mb-2">
            <Ionicons name="chatbubble-ellipses" size={16} color="#2563eb" />
            <Text className="text-xs font-bold text-blue-900 ml-2">
              Vendor Response
            </Text>
          </View>
          <Text className="text-sm text-blue-800">{review.response.comment}</Text>
          <Text className="text-xs text-blue-600 mt-2">
            {formatDate(review.response.respondedAt)}
          </Text>
        </View>}

      {}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center">
            <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {review.helpfulCount}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="thumbs-down-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {review.notHelpfulCount}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-400">
          {review.helpfulCount + review.notHelpfulCount} votes
        </Text>
      </View>
    </View>;
  const renderEmptyState = () => <View className="flex-1 items-center justify-center py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="star-outline" size={48} color="#d1d5db" />
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-2">No Reviews Yet</Text>
      <Text className="text-gray-600 text-center px-8">
        {selectedRating ? `No ${selectedRating}-star reviews found` : 'Be the first to leave a review!'}
      </Text>
    </View>;
  if (loading && page === 1) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading reviews...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Reviews</Text>

          <View className="w-10" />
        </View>

        {}
        {stats && <View className="bg-pink-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="items-center">
                <Text className="text-4xl font-bold text-pink-600">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </Text>
                <View className="flex-row mt-1">
                  {renderStars(Math.round(stats.averageRating || 0), 16)}
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {stats.total} reviews
                </Text>
              </View>

              <View className="flex-1 ml-6">
                {stats.byRating?.map((item: any) => <View key={item._id} className="flex-row items-center gap-2 mb-1">
                    <Text className="text-xs text-gray-600 w-8">{item._id}★</Text>
                    <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View className="h-full bg-yellow-400" style={{
                  width: `${item.count / stats.total * 100}%`
                }} />
                    </View>
                    <Text className="text-xs text-gray-600 w-8 text-right">
                      {item.count}
                    </Text>
                  </View>)}
              </View>
            </View>
          </View>}

        {}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <TouchableOpacity onPress={() => setSelectedRating(null)} className={`px-4 py-2 rounded-full ${selectedRating === null ? 'bg-pink-600' : 'bg-gray-100'}`} activeOpacity={0.7}>
            <Text className={`font-semibold ${selectedRating === null ? 'text-white' : 'text-gray-700'}`}>
              All
            </Text>
          </TouchableOpacity>

          {[5, 4, 3, 2, 1].map(rating => <TouchableOpacity key={rating} onPress={() => setSelectedRating(rating)} className={`px-4 py-2 rounded-full flex-row items-center gap-1 ${selectedRating === rating ? 'bg-pink-600' : 'bg-gray-100'}`} activeOpacity={0.7}>
              <Ionicons name="star" size={14} color={selectedRating === rating ? '#fff' : '#fbbf24'} />
              <Text className={`font-semibold ${selectedRating === rating ? 'text-white' : 'text-gray-700'}`}>
                {rating}
              </Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>

      {}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />} onScroll={({
      nativeEvent
    }) => {
      const {
        layoutMeasurement,
        contentOffset,
        contentSize
      } = nativeEvent;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
      if (isCloseToBottom) {
        loadMore();
      }
    }} scrollEventThrottle={400}>
        <View className="px-5 py-4">
          {reviews.length > 0 ? <>
              {reviews.map(review => renderReviewCard(review))}

              {loading && page > 1 && <View className="py-4">
                  <ActivityIndicator size="small" color="#eb278d" />
                </View>}

              {!hasMore && reviews.length > 10 && <Text className="text-center text-gray-400 text-sm py-4">
                  No more reviews
                </Text>}
            </> : renderEmptyState()}
        </View>
      </ScrollView>
    </SafeAreaView>;
};
export default ReviewsScreen;