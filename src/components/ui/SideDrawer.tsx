import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}
interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userImage?: string;
  menuItems: MenuItem[];
  onLogout: () => void;
}
const SideDrawer: React.FC<SideDrawerProps> = ({
  visible,
  onClose,
  userName,
  userEmail,
  userImage,
  menuItems,
  onLogout
}) => {
  return <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawerContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                {userImage ? <Image source={{
                uri: userImage
              }} style={styles.profileImage} /> : <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileInitials}>
                      {userName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>}
              </View>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileEmail}>{userEmail}</Text>
            </View>

            {}
            <View style={styles.menuSection}>
              {menuItems.map(item => <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => {
              item.onPress();
              onClose();
            }}>
                  <Ionicons name={item.icon} size={24} color="#666" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>)}
            </View>

            {}
            <TouchableOpacity style={styles.logoutButton} onPress={() => {
            onLogout();
            onClose();
          }}>
              <Ionicons name="log-out-outline" size={24} color="#E91E63" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {}
            <Text style={styles.versionText}>SharpLook v1.0.0</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>;
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  backdrop: {
    flex: 1
  },
  drawerContent: {
    width: '80%',
    backgroundColor: '#fff',
    paddingTop: 50
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  profileImageContainer: {
    marginBottom: 16
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  profileEmail: {
    fontSize: 14,
    color: '#666'
  },
  menuSection: {
    paddingVertical: 20
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  logoutText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
    marginLeft: 16
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20
  }
});
export default SideDrawer;