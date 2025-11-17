import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface ReviewCardProps {
  review: any;
}
const ReviewCard: React.FC<ReviewCardProps> = ({
  review
}) => {
  const reviewerData = review.reviewer || review.user || {};
  const firstName = reviewerData.firstName || 'Anonymous';
  const lastName = reviewerData.lastName || '';
  const avatar = reviewerData.avatar;
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const renderStars = (rating: number, size: number = 16) => {
    return <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color={star <= Math.round(rating) ? '#fbbf24' : '#d1d5db'} />)}
      </View>;
  };
  return <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mr-3">
            {avatar ? <Image source={{
            uri: avatar
          }} className="w-12 h-12 rounded-full" /> : <Text className="text-lg font-bold text-pink-600">
                {firstName.charAt(0)}
                {lastName.charAt(0) || ''}
              </Text>}
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">
              {firstName} {lastName}
            </Text>
            {review.createdAt && <Text className="text-xs text-gray-500">
                {formatDate(review.createdAt)}
              </Text>}
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          {renderStars(review.rating || 0, 18)}
          <Text className="text-sm font-bold text-gray-900 ml-1">
            {(review.rating || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      {}
      {review.title && <Text className="text-base font-bold text-gray-900 mb-2">
          {review.title}
        </Text>}

      {}
      {review.comment && <Text className="text-gray-700 mb-3">{review.comment}</Text>}

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
          {review.response.respondedAt && <Text className="text-xs text-blue-600 mt-2">
              {formatDate(review.response.respondedAt)}
            </Text>}
        </View>}

      {}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center">
            <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {review.helpfulCount || 0}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="thumbs-down-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {review.notHelpfulCount || 0}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-400">
          {(review.helpfulCount || 0) + (review.notHelpfulCount || 0)} votes
        </Text>
      </View>
    </View>;
};
export default ReviewCard;