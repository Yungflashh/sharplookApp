import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, StatusBar, Image } from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { reviewAPI, handleAPIError } from '@/api/api';

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';

type NavProp   = NativeStackNavigationProp<RootStackParamList, 'CreateReview'>;
type RoutePropType = RouteProp<RootStackParamList, 'CreateReview'>;

const formatCompletedDate = (iso?: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};

const CreateReviewScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropType>();
  const insets     = useSafeAreaInsets();

  const { bookingId, vendorName, serviceName, vendorImage, vendorRole, completedAt } = route.params;

  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState('');
  const [recommend, setRecommend] = useState<'yes' | 'no' | null>(null);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Error', 'Please select a rating');
      return;
    }
    if (!comment || comment.trim().length < 10) {
      toast.error('Error', 'Please write a review (minimum 10 characters)');
      return;
    }
    try {
      setLoading(true);
      const response = await reviewAPI.createReview({
        bookingId,
        rating,
        comment: comment.trim(),
        recommend: recommend === 'yes' ? true : recommend === 'no' ? false : undefined,
      });
      if (response.success) {
        toast.success('Review Submitted', 'Thank you for your feedback!');
        navigation.goBack();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const completedLabel = formatCompletedDate(completedAt);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()} activeOpacity={0.75}
          style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
          <Ionicons name="arrow-back" size={19} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 }}>
          Leave a review
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}>

        {/* ── Vendor card ── */}
        <View style={{
          backgroundColor: WHITE, borderRadius: 18, padding: 14, marginBottom: 20,
          shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 }, elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Service / vendor image */}
            <View style={{
              width: 68, height: 68, borderRadius: 14, overflow: 'hidden', backgroundColor: BG,
            }}>
              {vendorImage
                ? <Image source={{ uri: vendorImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <LinearGradient colors={[PRIMARY, '#FF6BA8']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="sparkles" size={26} color={WHITE} />
                  </LinearGradient>
              }
            </View>

            <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
              {/* Vendor name + verified tick */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{vendorName}</Text>
                <Ionicons name="checkmark-circle" size={15} color={PRIMARY} />
              </View>

              {/* Role / service type */}
              {(vendorRole || serviceName) && (
                <Text style={{ fontSize: 12, color: GRAY, fontWeight: '500' }}>
                  {vendorRole || serviceName}
                </Text>
              )}

              {/* Completed date */}
              {completedLabel ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Ionicons name="checkmark-done-circle" size={13} color="#16A34A" />
                  <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '600' }}>
                    Completed {completedLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Star rating ── */}
        <View style={{
          backgroundColor: WHITE, borderRadius: 18, padding: 20, marginBottom: 16,
          alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 }, elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 4 }}>
            How would you rate this service?
          </Text>
          <Text style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
            Tap a star to select your rating
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                <Ionicons
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={s <= rating ? '#FBBF24' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 10 }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </Text>
          )}
        </View>

        {/* ── Share experience ── */}
        <View style={{
          backgroundColor: WHITE, borderRadius: 18, padding: 16, marginBottom: 16,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 }, elevation: 2,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 3 }}>
            Share your experience
          </Text>
          <Text style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
            What did you love? What could be better? (optional)
          </Text>

          <View style={{
            borderWidth: 1.5, borderColor: '#F3F4F6', borderRadius: 14,
            backgroundColor: '#FAFAFA', padding: 12,
          }}>
            <TextInput
              value={comment}
              onChangeText={t => setComment(t.slice(0, 200))}
              placeholder="Write something about your experience..."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ fontSize: 14, color: TEXT, minHeight: 90 }}
            />
          </View>
          <Text style={{ fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 6 }}>
            {comment.length}/200
          </Text>
        </View>

        {/* ── Recommend ── */}
        <View style={{
          backgroundColor: WHITE, borderRadius: 18, padding: 16, marginBottom: 10,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 }, elevation: 2,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 16 }}>
            Would you recommend this vendor?
          </Text>

          {([
            { value: 'yes', label: 'Yes, I would recommend' },
            { value: 'no',  label: "No, I wouldn't recommend" },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setRecommend(opt.value)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 13, paddingHorizontal: 4,
                borderBottomWidth: opt.value === 'yes' ? 1 : 0,
                borderBottomColor: '#F3F4F6',
              }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: recommend === opt.value ? PRIMARY : '#D1D5DB',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {recommend === opt.value && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY }} />
                )}
              </View>
              <Text style={{
                fontSize: 14, color: TEXT,
                fontWeight: recommend === opt.value ? '700' : '400',
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Submit button ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: WHITE,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 16) + 4,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
      }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={rating === 0 || loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: rating === 0 ? '#F3F4F6' : PRIMARY,
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
          }}>
          {loading
            ? <ActivityIndicator color={WHITE} />
            : <>
                <Text style={{
                  fontSize: 15, fontWeight: '700',
                  color: rating === 0 ? MUTED : WHITE,
                }}>
                  Submit Review
                </Text>
                {rating > 0 && (
                  <Ionicons name="chevron-forward" size={16} color={WHITE} />
                )}
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreateReviewScreen;
