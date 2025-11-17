import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { reviewAPI, handleAPIError } from '@/api/api';
type CreateReviewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateReview'>;
type CreateReviewRouteProp = RouteProp<RootStackParamList, 'CreateReview'>;
const CreateReviewScreen: React.FC = () => {
  const navigation = useNavigation<CreateReviewNavigationProp>();
  const route = useRoute<CreateReviewRouteProp>();
  const {
    bookingId,
    vendorName,
    serviceName
  } = route.params;
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [qualityRating, setQualityRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (!comment || comment.trim().length < 10) {
      Alert.alert('Error', 'Please write a review (minimum 10 characters)');
      return;
    }
    try {
      setLoading(true);
      const reviewData = {
        bookingId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        detailedRatings: {
          quality: qualityRating || undefined,
          punctuality: punctualityRating || undefined,
          communication: communicationRating || undefined,
          value: valueRating || undefined
        }
      };
      const response = await reviewAPI.createReview(reviewData);
      if (response.success) {
        Alert.alert('Review Submitted', 'Thank you for your feedback!', [{
          text: 'OK',
          onPress: () => navigation.goBack()
        }]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };
  const renderStars = (currentRating: number, onPress: (rating: number) => void, size: number = 40) => {
    return <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map(star => <TouchableOpacity key={star} onPress={() => onPress(star)} activeOpacity={0.7}>
            <Ionicons name={star <= currentRating ? 'star' : 'star-outline'} size={size} color={star <= currentRating ? '#fbbf24' : '#d1d5db'} />
          </TouchableOpacity>)}
      </View>;
  };
  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Tap to rate';
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Write a Review</Text>

          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          {}
          <View className="bg-white rounded-2xl p-4 mb-6">
            <Text className="text-sm text-gray-600 mb-1">Service</Text>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              {serviceName}
            </Text>

            <Text className="text-sm text-gray-600 mb-1">Vendor</Text>
            <Text className="text-base font-semibold text-gray-900">
              {vendorName}
            </Text>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Overall Rating <Text className="text-red-500">*</Text>
            </Text>

            <View className="items-center py-4">
              {renderStars(rating, setRating, 48)}

              <Text className={`text-lg font-semibold mt-3 ${rating > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {getRatingText(rating)}
              </Text>
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-4">
              Detailed Ratings (Optional)
            </Text>

            {}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Quality of Service
                </Text>
                <Text className="text-sm text-gray-600">
                  {qualityRating > 0 ? `${qualityRating}/5` : '-'}
                </Text>
              </View>
              {renderStars(qualityRating, setQualityRating, 28)}
            </View>

            {}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Punctuality
                </Text>
                <Text className="text-sm text-gray-600">
                  {punctualityRating > 0 ? `${punctualityRating}/5` : '-'}
                </Text>
              </View>
              {renderStars(punctualityRating, setPunctualityRating, 28)}
            </View>

            {}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Communication
                </Text>
                <Text className="text-sm text-gray-600">
                  {communicationRating > 0 ? `${communicationRating}/5` : '-'}
                </Text>
              </View>
              {renderStars(communicationRating, setCommunicationRating, 28)}
            </View>

            {}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Value for Money
                </Text>
                <Text className="text-sm text-gray-600">
                  {valueRating > 0 ? `${valueRating}/5` : '-'}
                </Text>
              </View>
              {renderStars(valueRating, setValueRating, 28)}
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Review Title (Optional)
            </Text>

            <TextInput className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900" placeholder="Summarize your experience..." placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} maxLength={100} />

            <Text className="text-xs text-gray-500 mt-2">
              {title.length}/100 characters
            </Text>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Your Review <Text className="text-red-500">*</Text>
            </Text>

            <TextInput className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900" placeholder="Share your experience with this service..." placeholderTextColor="#9ca3af" value={comment} onChangeText={setComment} multiline numberOfLines={6} textAlignVertical="top" style={{
            minHeight: 150
          }} maxLength={1000} />

            <Text className="text-xs text-gray-500 mt-2">
              {comment.length}/1000 characters (minimum 10)
            </Text>
          </View>

          {}
          <View className="bg-blue-50 rounded-2xl p-4 mb-6">
            <View className="flex-row items-start mb-2">
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <Text className="text-sm font-semibold text-blue-900 ml-2">
                Review Guidelines
              </Text>
            </View>

            <View className="ml-7 gap-2">
              <Text className="text-xs text-blue-700">
                • Be honest and constructive in your feedback
              </Text>
              <Text className="text-xs text-blue-700">
                • Focus on your experience with the service
              </Text>
              <Text className="text-xs text-blue-700">
                • Avoid offensive language or personal attacks
              </Text>
              <Text className="text-xs text-blue-700">
                • Reviews help others make informed decisions
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {}
      <View className="bg-white px-5 py-4 border-t border-gray-100">
        <TouchableOpacity onPress={handleSubmitReview} disabled={loading || rating === 0 || comment.length < 10} className={`py-4 rounded-xl ${loading || rating === 0 || comment.length < 10 ? 'bg-gray-300' : 'bg-pink-600'}`} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-bold text-base">
              Submit Review
            </Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>;
};
export default CreateReviewScreen;