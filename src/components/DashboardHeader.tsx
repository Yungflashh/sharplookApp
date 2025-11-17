import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface DashboardHeaderProps {
  userName: string;
  onMenuPress: () => void;
  onChatPress: () => void;
  onCartPress: () => void;
  onNotificationPress: () => void;
  cartItemCount?: number;
  unreadNotificationCount?: number;
}
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  onMenuPress,
  onChatPress,
  onCartPress,
  onNotificationPress,
  cartItemCount = 0,
  unreadNotificationCount = 0
}) => {
  return <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.rightIcons}>
          {}
          <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {unreadNotificationCount > 0 && <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onChatPress} style={styles.iconButton}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onCartPress} style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#333" />
            {cartItemCount > 0 && <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome to SharpLook</Text>
        <Text style={styles.userName}>{userName}</Text>
      </View>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12
  },
  iconButton: {
    padding: 8,
    position: 'relative'
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  welcomeSection: {
    marginTop: 16
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4
  }
});
export default DashboardHeader;