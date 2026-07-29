import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, StatusBar } from 'react-native';
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

const CFG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; iconBg: string }> = {
  success: { icon: 'checkmark-circle',  iconBg: 'rgba(255,255,255,0.25)' },
  error:   { icon: 'close-circle',      iconBg: 'rgba(255,255,255,0.25)' },
  info:    { icon: 'information-circle', iconBg: 'rgba(255,255,255,0.25)' },
  warning: { icon: 'warning',            iconBg: 'rgba(255,255,255,0.25)' },
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.93)).current;
  const cfg = CFG[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true, tension: 100, friction: 12 }),
    ]).start();

    const timer = setTimeout(dismiss, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
      Animated.timing(scale,      { toValue: 0.93, duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }, { scale }] }]}>
      <View style={[styles.iconBubble, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={cfg.icon} size={15} color="#fff" />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.closeBtn}>
        <Ionicons name="close" size={13} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>

    </Animated.View>
  );
};

let _globalShowToast: ToastContextType['showToast'] | null = null;

export const toast = {
  success: (title: string, message?: string, duration?: number) => _globalShowToast?.('success', title, message, duration),
  error:   (title: string, message?: string, duration?: number) => _globalShowToast?.('error',   title, message, duration),
  info:    (title: string, message?: string, duration?: number) => _globalShowToast?.('info',    title, message, duration),
  warning: (title: string, message?: string, duration?: number) => _globalShowToast?.('warning', title, message, duration),
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 56;

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-1), { id, type, title, message, duration }]);
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
      {toasts.length > 0 && (
        <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E04079',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },

  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },

  textWrap: {
    flex: 1,
    marginRight: 6,
  },

  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  message: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    lineHeight: 15,
  },

  closeBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
});
