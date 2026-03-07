import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; bg: string; accent: string }> = {
  success: { icon: 'checkmark-circle', bg: '#F0FFF4', accent: '#38A169' },
  error: { icon: 'close-circle', bg: '#FFF5F5', accent: '#E53E3E' },
  info: { icon: 'information-circle', bg: '#EBF8FF', accent: '#3182CE' },
  warning: { icon: 'warning', bg: '#FFFFF0', accent: '#D69E2E' },
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View style={[styles.toast, { backgroundColor: config.bg, borderLeftColor: config.accent, transform: [{ translateY }], opacity }]}>
      <Ionicons name={config.icon} size={22} color={config.accent} style={styles.toastIcon} />
      <View style={styles.toastText}>
        <Text style={[styles.toastTitle, { color: config.accent }]} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text> : null}
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </Animated.View>
  );
};

let _globalShowToast: ToastContextType['showToast'] | null = null;

export const toast = {
  success: (title: string, message?: string) => _globalShowToast?.('success', title, message),
  error: (title: string, message?: string) => _globalShowToast?.('error', title, message),
  info: (title: string, message?: string) => _globalShowToast?.('info', title, message),
  warning: (title: string, message?: string) => _globalShowToast?.('warning', title, message),
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 54;

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-2), { id, type, title, message, duration }]);
  }, []);

  useEffect(() => {
    _globalShowToast = showToast;
    return () => { _globalShowToast = null; };
  }, [showToast]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />)}
      </View>
    </ToastContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toastMessage: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
    lineHeight: 18,
  },
});
