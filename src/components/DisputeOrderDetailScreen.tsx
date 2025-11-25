import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type DisputeDetailRouteProp = RouteProp<RootStackParamList, 'DisputeOrderDetail'>;
type DisputeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DisputeOrderDetail'>;

interface DisputeData {
  _id: string;
  disputeNumber: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  isEscalated: boolean;
  customerResponded: boolean;
  sellerResponded: boolean;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    avatar?: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  order: {
    _id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    items: Array<{
      product: {
        _id: string;
        name: string;
        images: string[];
      };
      quantity: number;
      price: number;
    }>;
    deliveryType: string;
    createdAt: string;
  };
  evidence: Array<{
    _id: string;
    uploadedBy: string;
    fileUrl: string;
    fileType: string;
    description: string;
    uploadedAt: string;
  }>;
  messages: Array<{
    _id: string;
    sender: string;
    senderType: 'customer' | 'seller' | 'admin';
    message: string;
    timestamp: string;
  }>;
}

const DisputeOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<DisputeDetailNavigationProp>();
  const route = useRoute<DisputeDetailRouteProp>();
  const { disputeorderId, userType } = route.params;

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  useEffect(() => {
    fetchDisputeDetails();
  }, [disputeorderId]);

  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getDisputeById(disputeorderId);

      console.log('=== Dispute Detail Response Debug ===');
      console.log('response.data:', response.data);

      if (response.success || response.data) {
        const disputeData = response.data?.dispute || response.data;
        setDispute(disputeData);
        console.log('✅ Loaded dispute:', disputeData.disputeNumber);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Fetch dispute error:', apiError);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !dispute) return;

    try {
      setSendingMessage(true);
      const response = await orderAPI.sendDisputeMessage(dispute._id, {
        message: message.trim(),
      });

      if (response.success) {
        setMessage('');
        fetchDisputeDetails(); 
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          name: `evidence_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadEvidence = async () => {
    if (!selectedFile || !evidenceDescription.trim() || !dispute) {
      Alert.alert('Required', 'Please provide both a file and description');
      return;
    }

    try {
      setUploadingEvidence(true);

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || selectedFile.type,
      } as any);
      formData.append('description', evidenceDescription.trim());

      const response = await orderAPI.uploadDisputeEvidence(dispute._id, formData);

      if (response.success) {
        Alert.alert('Success', 'Evidence uploaded successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowEvidenceForm(false);
              setSelectedFile(null);
              setEvidenceDescription('');
              fetchDisputeDetails();
            },
          },
        ]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setUploadingEvidence(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'closed':
        return '#6b7280';
      case 'escalated':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">
            Loading dispute details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return null;
  }

  const messages = Array.isArray(dispute.messages) ? dispute.messages : [];
  const evidence = Array.isArray(dispute.evidence) ? dispute.evidence : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">Dispute Details</Text>
              <Text className="text-sm text-white/90">#{dispute.disputeNumber}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            {}
            <View
              className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 text-lg font-bold">Dispute Status</Text>
                <View
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: `${getStatusColor(dispute.status)}15` }}
                >
                  <Text
                    className="text-sm font-bold capitalize"
                    style={{ color: getStatusColor(dispute.status) }}
                  >
                    {dispute.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <View className="flex-1 bg-gray-50 rounded-2xl p-3 mr-2">
                  <Text className="text-gray-500 text-xs font-semibold mb-1">Priority</Text>
                  <View className="flex-row items-center">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getPriorityColor(dispute.priority) }}
                    />
                    <Text
                      className="text-sm font-bold capitalize"
                      style={{ color: getPriorityColor(dispute.priority) }}
                    >
                      {dispute.priority}
                    </Text>
                  </View>
                </View>

                <View className="flex-1 bg-gray-50 rounded-2xl p-3 ml-2">
                  <Text className="text-gray-500 text-xs font-semibold mb-1">Created</Text>
                  <Text className="text-gray-900 text-xs font-bold">
                    {new Date(dispute.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              {dispute.isEscalated && (
                <View className="bg-red-50 border border-red-200 rounded-2xl p-3 flex-row items-center">
                  <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
                  <Text className="text-red-700 text-sm font-bold ml-2">
                    Escalated to Admin Review
                  </Text>
                </View>
              )}
            </View>

            {}
            <View
              className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Ionicons name="document-text" size={20} color="#f97316" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Issue Details</Text>
              </View>

              <View className="bg-orange-50 rounded-2xl p-4 mb-3">
                <Text className="text-orange-900 text-xs font-bold mb-1">REASON</Text>
                <Text className="text-orange-800 text-base font-bold">
                  {getReasonLabel(dispute.reason)}
                </Text>
              </View>

              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-gray-500 text-xs font-bold mb-2">DESCRIPTION</Text>
                <Text className="text-gray-900 text-sm leading-6">{dispute.description}</Text>
              </View>
            </View>

            {}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('OrderDetail', {
                  orderId: dispute.order._id,
                  userType,
                })
              }
              activeOpacity={0.7}
              className="mb-4"
            >
              <View
                className="bg-white rounded-3xl p-5"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Ionicons name="receipt" size={20} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 text-lg font-bold">Linked Order</Text>
                      <Text className="text-gray-500 text-xs">#{dispute.order.orderNumber}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>

                <View className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-3">
                  <View>
                    <Text className="text-gray-500 text-xs font-semibold mb-1">Total Amount</Text>
                    <Text className="text-gray-900 text-lg font-bold">
                      {formatPrice(dispute.order.totalAmount)}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: `${getStatusColor(dispute.order.status)}15`,
                    }}
                  >
                    <Text
                      className="text-xs font-bold capitalize"
                      style={{ color: getStatusColor(dispute.order.status) }}
                    >
                      {dispute.order.status}
                    </Text>
                  </View>
                </View>

                {dispute.order.items && dispute.order.items.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-gray-500 text-xs font-semibold mb-2">
                      {dispute.order.items.length} Item(s)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {dispute.order.items.map((item, index) => (
                        <View key={index} className="mr-3">
                          <Image
                            source={{
                              uri:
                                item.product?.images?.[0] ||
                                'https://via.placeholder.com/150',
                            }}
                            className="w-16 h-16 rounded-xl"
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {}
            <View
              className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <Ionicons name="people" size={20} color="#a855f7" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Parties Involved</Text>
              </View>

              {}
              <View className="bg-blue-50 rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-blue-900 text-xs font-bold">CUSTOMER</Text>
                  {dispute.customerResponded && (
                    <View className="bg-green-500 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold">Responded</Text>
                    </View>
                  )}
                </View>
                <Text className="text-blue-900 text-base font-bold mb-1">
                  {dispute.customer.fullName}
                </Text>
                <Text className="text-blue-700 text-xs">{dispute.customer.email}</Text>
                {dispute.customer.phone && (
                  <Text className="text-blue-700 text-xs">{dispute.customer.phone}</Text>
                )}
              </View>

              {}
              <View className="bg-purple-50 rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-purple-900 text-xs font-bold">SELLER</Text>
                  {dispute.sellerResponded && (
                    <View className="bg-green-500 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold">Responded</Text>
                    </View>
                  )}
                </View>
                <Text className="text-purple-900 text-base font-bold mb-1">
                  {dispute.seller.vendorProfile?.businessName || dispute.seller.fullName}
                </Text>
                <Text className="text-purple-700 text-xs">{dispute.seller.email}</Text>
                {dispute.seller.phone && (
                  <Text className="text-purple-700 text-xs">{dispute.seller.phone}</Text>
                )}
              </View>
            </View>

            {}
            {evidence.length > 0 && (
              <View
                className="bg-white rounded-3xl p-5 mb-4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="folder-open" size={20} color="#10b981" />
                  </View>
                  <Text className="text-gray-900 text-lg font-bold">Evidence</Text>
                </View>

                {evidence.map((item, index) => (
                  <View
                    key={item._id}
                    className={`bg-gray-50 rounded-2xl p-4 ${
                      index < evidence.length - 1 ? 'mb-3' : ''
                    }`}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Ionicons
                            name={
                              item.fileType.includes('image')
                                ? 'image'
                                : item.fileType.includes('pdf')
                                ? 'document'
                                : 'attach'
                            }
                            size={16}
                            color="#6b7280"
                          />
                          <Text className="text-gray-600 text-xs font-bold ml-2">
                            {item.fileType.toUpperCase()}
                          </Text>
                        </View>
                        <Text className="text-gray-900 text-sm mb-1">{item.description}</Text>
                        <Text className="text-gray-400 text-xs">
                          {formatDate(item.uploadedAt)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          
                          Alert.alert('View Evidence', 'File: ' + item.fileUrl);
                        }}
                        className="ml-2"
                      >
                        <Ionicons name="eye" size={20} color="#eb278d" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {}
            {dispute.status !== 'resolved' &&
              dispute.status !== 'closed' &&
              !showEvidenceForm && (
                <TouchableOpacity
                  onPress={() => setShowEvidenceForm(true)}
                  activeOpacity={0.8}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    className="py-4 rounded-2xl"
                    style={{
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="cloud-upload" size={22} color="#fff" />
                      <Text className="text-white text-base font-bold ml-2">
                        Upload Evidence
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}

            {}
            {showEvidenceForm && (
              <View
                className="bg-white rounded-3xl p-5 mb-4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center mb-5">
                  <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="cloud-upload" size={20} color="#10b981" />
                  </View>
                  <Text className="text-gray-900 text-lg font-bold">Upload Evidence</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 text-sm font-bold mb-3">Select File</Text>
                  <View className="flex-row" style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={handlePickImage}
                      className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image" size={24} color="#3b82f6" />
                      <Text className="text-blue-700 text-xs font-bold mt-2">Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePickFile}
                      className="flex-1 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document" size={24} color="#a855f7" />
                      <Text className="text-purple-700 text-xs font-bold mt-2">Document</Text>
                    </TouchableOpacity>
                  </View>

                  {selectedFile && (
                    <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mt-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-green-900 text-xs font-bold">
                            Selected File
                          </Text>
                          <Text className="text-green-700 text-sm" numberOfLines={1}>
                            {selectedFile.name}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedFile(null)}>
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                <View className="mb-5">
                  <Text className="text-gray-700 text-sm font-bold mb-2">Description *</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-4 rounded-2xl text-gray-900 border border-gray-200"
                    placeholder="Describe this evidence..."
                    placeholderTextColor="#9ca3af"
                    value={evidenceDescription}
                    onChangeText={setEvidenceDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    style={{ minHeight: 100 }}
                  />
                </View>

                <View className="flex-row" style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowEvidenceForm(false);
                      setSelectedFile(null);
                      setEvidenceDescription('');
                    }}
                    className="flex-1 border-2 border-gray-300 py-4 rounded-2xl"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-700 text-center font-bold text-base">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleUploadEvidence}
                    disabled={!selectedFile || !evidenceDescription.trim() || uploadingEvidence}
                    className="flex-1"
                    activeOpacity={0.8}
                    style={{
                      opacity:
                        !selectedFile || !evidenceDescription.trim() || uploadingEvidence
                          ? 0.5
                          : 1,
                    }}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      className="py-4 rounded-2xl"
                      style={{
                        shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      {uploadingEvidence ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white text-center font-bold text-base">
                          Upload
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {}
            <View
              className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="chatbubbles" size={20} color="#eb278d" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Communication</Text>
              </View>

              {messages.length === 0 ? (
                <View className="bg-gray-50 rounded-2xl p-8 items-center">
                  <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
                  <Text className="text-gray-400 text-sm mt-3">No messages yet</Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center">
                    Start the conversation to resolve this dispute
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {messages.map((msg) => {
                    const isMyMessage =
                      userType === 'customer'
                        ? msg.senderType === 'customer'
                        : msg.senderType === 'seller';

                    return (
                      <View
                        key={msg._id}
                        className={`${isMyMessage ? 'items-end' : 'items-start'}`}
                      >
                        <View
                          className={`max-w-[80%] rounded-2xl p-4 ${
                            isMyMessage
                              ? 'bg-pink-500'
                              : msg.senderType === 'admin'
                              ? 'bg-orange-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          {msg.senderType === 'admin' && (
                            <View className="flex-row items-center mb-2">
                              <Ionicons name="shield-checkmark" size={14} color="#f97316" />
                              <Text className="text-orange-700 text-xs font-bold ml-1">
                                ADMIN
                              </Text>
                            </View>
                          )}
                          <Text
                            className={`text-sm leading-5 ${
                              isMyMessage ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {msg.message}
                          </Text>
                          <Text
                            className={`text-xs mt-2 ${
                              isMyMessage ? 'text-white/70' : 'text-gray-400'
                            }`}
                          >
                            {formatDate(msg.timestamp)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {}
        {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
          <View
            className="bg-white border-t border-gray-200 px-4 py-3"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className="flex-1">
                <TextInput
                  className="bg-gray-100 px-4 py-3 rounded-2xl text-gray-900"
                  placeholder="Type your message..."
                  placeholderTextColor="#9ca3af"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={1000}
                  style={{ maxHeight: 100 }}
                />
              </View>
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
                activeOpacity={0.7}
                style={{ opacity: !message.trim() || sendingMessage ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DisputeOrderDetailScreen;