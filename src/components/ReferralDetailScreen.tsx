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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!referral) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Referral not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.header}>
        <View style={styles.statusBadge}>
          <Ionicons
            name={getStatusIcon(referral.status) as any}
            size={24}
            color={getStatusColor(referral.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(referral.status) }]}>
            {referral.status.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Referee Info */}
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
                <Ionicons name="gift" size={24} color="#7C3AED" />
                <Text style={styles.rewardTitle}>Your Reward</Text>
              </View>
              <Text style={styles.rewardAmount}>
                {formatCurrency(referral.referrerReward)}
              </Text>
              {referral.referrerPaid ? (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.paidText}>
                    Paid on {formatDate(referral.referrerPaidAt!)}
                  </Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time" size={16} color="#F59E0B" />
                  <Text style={styles.pendingText}>Pending payment</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.rewardItem}>
              <View style={styles.rewardHeader}>
                <Ionicons name="person" size={24} color="#10B981" />
                <Text style={styles.rewardTitle}>Friend's Reward</Text>
              </View>
              <Text style={styles.rewardAmount}>
                {formatCurrency(referral.refereeReward)}
              </Text>
              {referral.refereePaid ? (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.paidText}>
                    Paid on {formatDate(referral.refereePaidAt!)}
                  </Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time" size={16} color="#F59E0B" />
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
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.bookingTitle}>Completed</Text>
                </View>
                <Text style={styles.bookingService}>
                  Service: {referral.firstBookingId.service}
                </Text>
                <Text style={styles.bookingDate}>
                  Date: {formatDate(referral.firstBookingId.scheduledDate)}
                </Text>
                <Text style={styles.bookingAmount}>
                  Amount: {formatCurrency(referral.firstBookingId.totalAmount)}
                </Text>
              </View>
            ) : (
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Ionicons name="time" size={24} color="#F59E0B" />
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
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Referral Created</Text>
                <Text style={styles.timelineDate}>{formatDate(referral.createdAt)}</Text>
              </View>
            </View>

            {referral.firstBookingCompleted && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
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
                <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
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
                <View style={[styles.timelineDot, { backgroundColor: '#EF4444' }]} />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    marginTop: -80,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C3AED',
    letterSpacing: 4,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rewardItem: {
    paddingVertical: 8,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rewardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidText: {
    fontSize: 14,
    color: '#10B981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    color: '#F59E0B',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  bookingService: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  bookingNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
    marginRight: 16,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default ReferralDetailScreen;