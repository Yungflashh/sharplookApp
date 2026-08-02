import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, Platform, StatusBar, Modal,
} from 'react-native';
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

const CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: '#22C55E' },
  error:   { icon: 'close-circle',     color: '#EF4444' },
  warning: { icon: 'warning',          color: '#F59E0B' },
  info:    { icon: 'information-circle', color: '#60A5FA' },
};

const { width: SW } = Dimensions.get('window');
const MAX_W = SW * 0.82;

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({
  toast,
  onDismiss,
}) => {
  const cfg       = CONFIG[toast.type];
  const dur       = toast.duration ?? 3200;
  const translateY = useRef(new Animated.Value(-110)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const dismissed  = useRef(false);

  useEffect(() => {
    // Drop in with bounce
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 13,
        stiffness: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(dismiss, dur);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: -110, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View style={[st.bubble, { transform: [{ translateY }], opacity }]}>
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.85}
        style={st.inner}
      >
        <View style={[st.dot, { backgroundColor: cfg.color }]}>
          <Ionicons name={cfg.icon} size={16} color="#fff" />
        </View>
        <View style={st.textWrap}>
          <Text style={st.title} numberOfLines={1}>{toast.title}</Text>
          {toast.message ? (
            <Text style={st.msg} numberOfLines={2}>{toast.message}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

let _globalShowToast: ToastContextType['showToast'] | null = null;

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    _globalShowToast?.('success', title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    _globalShowToast?.('error', title, message, duration),
  info: (title: string, message?: string, duration?: number) =>
    _globalShowToast?.('info', title, message, duration),
  warning: (title: string, message?: string, duration?: number) =>
    _globalShowToast?.('warning', title, message, duration),
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef     = useRef(0);
  const topOffset = Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24) + 12
    : 58;

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = ++idRef.current;
      setToasts(prev => [...prev.slice(-1), { id, type, title, message, duration }]);
    },
    []
  );

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
      <Modal
        visible={toasts.length > 0}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={[st.container, { top: topOffset }]} pointerEvents="box-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
};

const st = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },

  bubble: {
    alignSelf: 'center',
    maxWidth: MAX_W,
    minWidth: 180,
    backgroundColor: '#FFF5F9',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(224,64,121,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#E04079',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },

  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  textWrap: {
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.1,
  },
  msg: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
    lineHeight: 17,
  },
});
