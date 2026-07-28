import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Animated,
  TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  icon = 'alert-circle-outline',
  iconColor = '#E04079',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = '#E04079',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { bottom } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // icon background — 12% opacity of the icon color
  const iconBg = `${iconColor}1F`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel} disabled={loading}>
        <Animated.View style={[ss.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[ss.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: bottom + 20 }]}>
        {/* Handle */}
        <View style={ss.handle} />

        {/* Icon */}
        <View style={[ss.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={32} color={iconColor} />
        </View>

        {/* Text */}
        <Text style={ss.title}>{title}</Text>
        <Text style={ss.message}>{message}</Text>

        {/* Buttons */}
        <View style={ss.btnRow}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={loading}
            style={ss.cancelBtn}
            activeOpacity={0.75}
          >
            <Text style={ss.cancelTxt}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            disabled={loading}
            style={[ss.confirmBtn, { backgroundColor: confirmColor }]}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={ss.confirmTxt}>{confirmText}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const ss = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 22,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cancelTxt: {
    fontSize: 14, fontWeight: '700', color: '#6B7280',
  },
  confirmBtn: {
    flex: 1, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmTxt: {
    fontSize: 14, fontWeight: '700', color: '#fff',
  },
});

export default ConfirmationModal;
