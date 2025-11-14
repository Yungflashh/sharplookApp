import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  iconColor = '#E91E63',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = '#E91E63',
  loading = false,
  onConfirm,
  onCancel
}) => {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {}
          <View style={[styles.iconContainer, {
          backgroundColor: `${iconColor}15`
        }]}>
            <Ionicons name={icon} size={48} color={iconColor} />
          </View>

          {}
          <Text style={styles.title}>{title}</Text>

          {}
          <Text style={styles.message}>{message}</Text>

          {}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirmButton, {
            backgroundColor: confirmColor
          }]} onPress={onConfirm} disabled={loading} activeOpacity={0.7}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmButtonText}>{confirmText}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
};
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center'
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  confirmButton: {
    backgroundColor: '#E91E63'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666'
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
export default ConfirmationModal;