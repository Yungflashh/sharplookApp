import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { referralAPI } from '../api/api';

interface ReferralDetail {
  _id: string;
  referrer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  referee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    createdAt: string;
  };
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  referrerReward: number;
  refereeReward: number;
  referrerPaid: boolean;
  refereePaid: boolean;
  referrerPaidAt?: string;
  refereePaidAt?: string;
  firstBookingCompleted: boolean;
  firstBookingId?: {
    _id: string;
    service: string;
    scheduledDate: string;
    totalAmount: number;
    status: string;
  };
  requiresFirstBooking: boolean;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

const ReferralDetailScreen = ({ route, navigation }: any) => {
  const { referralId } = route.params;
  const [referral, setReferral] = useState<ReferralDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralDetail();
  }, []);

  const loadReferralDetail = async () => {
    try {
      setLoading(true);
      const response = await referralAPI.getReferralById(referralId);
      setReferral(response.data.referral);
    } catch (error: any) {
      console.error('Error loading referral detail:', error);
      Alert.alert('Error', 'Failed to load referral details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#eb278d" />
      </SafeAreaView>
    );
  }

  if (!referral) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.notFoundText}>Referral not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#eb278d', '#c71f73']} style={styles.header}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Header Title */}
          <Text style={styles.headerTitle}>Referral Details</Text>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Ionicons
              name={getStatusIcon(referral.status) as any}
              size={22}
              color={getStatusColor(referral.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(referral.status) }]}>
              {referral.status.toUpperCase()}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Referred User */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referred User</Text>
            <View style={styles.userCard}>
              {referral.referee.avatar ? (
                <Image source={{ uri: referral.referee.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {referral.referee.firstName[0]}{referral.referee.lastName[0]}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {referral.referee.firstName} {referral.referee.lastName}
                </Text>
                <Text style={styles.userEmail}>{referral.referee.email}</Text>
                <Text style={styles.userDate}>
                  Joined {formatDate(referral.referee.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Referral Code */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referral Code Used</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referral.referralCode}</Text>
            </View>
          </View>

          {/* Rewards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rewards</Text>
            <View style={styles.rewardCard}>
              <View style={styles.rewardItem}>
                <View style={styles.rewardHeader}>
                  <View style={styles.rewardIconContainer}>
                    <Ionicons name="gift" size={20} color="#eb278d" />
                  </View>
                  <Text style={styles.rewardTitle}>Your Reward</Text>
                </View>
                <Text style={styles.rewardAmount}>
                  {formatCurrency(referral.referrerReward)}
                </Text>
                {referral.referrerPaid ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.paidText}>
                      Paid on {formatDate(referral.referrerPaidAt!)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={styles.pendingText}>Pending payment</Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.rewardItem}>
                <View style={styles.rewardHeader}>
                  <View style={[styles.rewardIconContainer, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="person" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.rewardTitle}>Friend's Reward</Text>
                </View>
                <Text style={styles.rewardAmount}>
                  {formatCurrency(referral.refereeReward)}
                </Text>
                {referral.refereePaid ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.paidText}>
                      Paid on {formatDate(referral.refereePaidAt!)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={styles.pendingText}>Pending payment</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* First Booking */}
          {referral.requiresFirstBooking && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>First Booking Requirement</Text>
              {referral.firstBookingCompleted && referral.firstBookingId ? (
                <View style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={[styles.bookingIconContainer, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.bookingTitle}>Completed</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <View style={styles.bookingDetailRow}>
                      <Text style={styles.bookingLabel}>Service</Text>
                      <Text style={styles.bookingValue}>{referral.firstBookingId.service}</Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                      <Text style={styles.bookingLabel}>Date</Text>
                      <Text style={styles.bookingValue}>{formatDate(referral.firstBookingId.scheduledDate)}</Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                      <Text style={styles.bookingLabel}>Amount</Text>
                      <Text style={[styles.bookingValue, { color: '#eb278d', fontWeight: '700' }]}>
                        {formatCurrency(referral.firstBookingId.totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={[styles.bookingIconContainer, { backgroundColor: '#FFFBEB' }]}>
                      <Ionicons name="time" size={20} color="#F59E0B" />
                    </View>
                    <Text style={[styles.bookingTitle, { color: '#F59E0B' }]}>
                      Awaiting First Booking
                    </Text>
                  </View>
                  <Text style={styles.bookingNote}>
                    Rewards will be activated once {referral.referee.firstName} completes their
                    first booking.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Referral Created</Text>
                  <Text style={styles.timelineDate}>{formatDate(referral.createdAt)}</Text>
                </View>
              </View>

              {referral.firstBookingCompleted && (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>First Booking Completed</Text>
                    <Text style={styles.timelineDate}>
                      {referral.completedAt ? formatDate(referral.completedAt) : 'N/A'}
                    </Text>
                  </View>
                </View>
              )}

              {referral.status === 'completed' && (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Rewards Paid</Text>
                    <Text style={styles.timelineDate}>
                      {referral.completedAt ? formatDate(referral.completedAt) : 'N/A'}
                    </Text>
                  </View>
                </View>
              )}

              {referral.expiresAt && referral.status === 'pending' && (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: '#EF4444' }]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Expires On</Text>
                    <Text style={styles.timelineDate}>{formatDate(referral.expiresAt)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    marginTop: -70,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  avatarPlaceholder: {
    backgroundColor: '#eb278d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  codeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eb278d',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#eb278d',
    letterSpacing: 4,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardItem: {
    paddingVertical: 4,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rewardAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#eb278d',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidText: {
    fontSize: 13,
    color: '#10B981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 13,
    color: '#F59E0B',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  bookingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  bookingDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bookingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  bookingNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#eb278d',
    borderWidth: 3,
    borderColor: '#FDF2F8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default ReferralDetailScreen;