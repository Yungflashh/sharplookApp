import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpdateModalProps {
  visible: boolean;
  latestVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
  onDismiss?: () => void;
}

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id6749508043'
    : 'https://play.google.com/store/apps/details?id=com.inuud.sharplook';

const UpdateModal = ({ visible, latestVersion, forceUpdate, updateMessage, onDismiss }: UpdateModalProps) => {
  const handleUpdate = () => {
    Linking.openURL(STORE_URL);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={forceUpdate ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Image
              source={require('@/assets/app-icon.jpg')}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name="arrow-up-circle" size={14} color="#fff" />
            <Text style={styles.badgeText}>v{latestVersion}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Update Available</Text>

          {/* Body */}
          <Text style={styles.body}>
            {updateMessage
              ? updateMessage
              : `A new version of LookReal is ready with improvements and bug fixes.${forceUpdate ? ' This update is required to continue using the app.' : ' Update now for the best experience.'}`}
          </Text>

          {/* Update button */}
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
            <Text style={styles.updateBtnText}>
              {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
            </Text>
          </TouchableOpacity>

          {/* Later button — only shown when update is not forced */}
          {!forceUpdate && onDismiss && (
            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#D73870',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appIcon: {
    width: 80,
    height: 80,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D73870',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  updateBtn: {
    width: '100%',
    backgroundColor: '#D73870',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterBtnText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UpdateModal;
