import React from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | undefined;

interface KycGateModalProps {
  visible: boolean;
  action: 'booking' | 'withdrawal';
  kycStatus: KycStatus;
  onClose: () => void;
  onGoToKyc: () => void;
}

const CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; colors: [string, string]; title: string }> = {
  not_submitted: { icon: 'shield-outline',    colors: ['#EF4444', '#DC2626'], title: 'KYC Required'         },
  pending:       { icon: 'time-outline',       colors: ['#F59E0B', '#D97706'], title: 'Verification Pending' },
  rejected:      { icon: 'close-circle-outline', colors: ['#EF4444', '#DC2626'], title: 'KYC Rejected'       },
};

const KycGateModal: React.FC<KycGateModalProps> = ({
  visible, action, kycStatus, onClose, onGoToKyc,
}) => {
  const actionLabel = action === 'booking' ? 'accept bookings' : 'withdraw funds';
  const status = kycStatus || 'not_submitted';
  const cfg = CONFIG[status] ?? CONFIG.not_submitted;

  const message: Record<string, string> = {
    not_submitted: `You need to upload your identity documents and have them approved before you can ${actionLabel}. This keeps our clients safe.`,
    pending:       `Your identity documents are under review. Once our team approves them you'll be able to ${actionLabel}. This usually takes up to 24 hours.`,
    rejected:      `Your KYC documents were rejected. Please re-upload valid documents to ${actionLabel}.`,
  };

  const buttonLabel: Record<string, string> = {
    not_submitted: 'Upload Documents Now',
    pending:       'View Verification Status',
    rejected:      'Re-upload Documents',
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 24, padding: 28,
          width: '100%', maxWidth: 360,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
            android: { elevation: 12 },
          }),
        }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient
              colors={cfg.colors}
              style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={cfg.icon} size={34} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={{
            fontSize: 20, fontWeight: '800', color: '#111827',
            textAlign: 'center', marginBottom: 10, letterSpacing: -0.3,
          }}>
            {cfg.title}
          </Text>

          <Text style={{
            fontSize: 14, color: '#6B7280', textAlign: 'center',
            lineHeight: 22, marginBottom: 28,
          }}>
            {message[status]}
          </Text>

          <TouchableOpacity onPress={onGoToKyc} activeOpacity={0.85} style={{ marginBottom: 12 }}>
            <LinearGradient
              colors={['#E04079', '#FF5B96']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                {buttonLabel[status]}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{
            paddingVertical: 13, borderRadius: 14,
            backgroundColor: '#F3F4F6', alignItems: 'center',
          }}>
            <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 15 }}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default KycGateModal;
