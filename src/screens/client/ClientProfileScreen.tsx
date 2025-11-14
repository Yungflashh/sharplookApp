import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmationModal from '@/components/ConfirmationModal';
const ClientProfileScreen = () => {
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadUserData();
  }, []);
  const loadUserData = async () => {
    const userData = await getStoredUser();
    setUser(userData);
  };
  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      console.log('Delete account requested');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('❌ Delete account error:', error);
    } finally {
      setLoading(false);
    }
  };
  const menuItems = [{
    icon: 'person-outline',
    title: 'My Account',
    color: '#E91E63',
    onPress: () => console.log('My Account')
  }, {
    icon: 'help-circle-outline',
    title: 'Help and Support',
    color: '#E91E63',
    onPress: () => console.log('Help and Support')
  }, {
    icon: 'shield-checkmark-outline',
    title: 'Legal',
    color: '#E91E63',
    onPress: () => console.log('Legal')
  }];
  const dangerItems = [{
    icon: 'log-out-outline',
    title: 'Logout',
    color: '#FF0000',
    onPress: () => setShowLogoutModal(true)
  }, {
    icon: 'trash-outline',
    title: 'Delete Account',
    color: '#FF0000',
    onPress: () => setShowDeleteModal(true)
  }];
  return <SafeAreaView style={styles.container} edges={['top']}>
      {}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={60} color="#999" />
            </View>
          </View>
          <Text style={styles.userName}>
            {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Adenusi kayode'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || 'kayskidadenusi@gmail.com'}
          </Text>
        </View>

        {}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, {
            backgroundColor: item.color
          }]}>
                <Ionicons name={item.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>)}
        </View>

        {}
        <View style={styles.menuContainer}>
          {dangerItems.map((item, index) => <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, {
            backgroundColor: item.color
          }]}>
                <Ionicons name={item.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.menuTitle, {
            color: item.color
          }]}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>)}
        </View>
      </ScrollView>

      {}
      <ConfirmationModal visible={showLogoutModal} title="Logout" message="Are you sure you want to logout?" icon="log-out-outline" iconColor="#E91E63" confirmText="Yes, Logout" cancelText="Cancel" confirmColor="#E91E63" loading={loading} onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />

      {}
      <ConfirmationModal visible={showDeleteModal} title="Delete Account" message="Are you sure you want to delete your account? This action cannot be undone." icon="warning-outline" iconColor="#FF0000" confirmText="Delete" cancelText="Cancel" confirmColor="#FF0000" loading={loading} onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} />
    </SafeAreaView>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center'
  },
  profileHeader: {
    backgroundColor: '#E91E63',
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500'
  }
});
export default ClientProfileScreen;