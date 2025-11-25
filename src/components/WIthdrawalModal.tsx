import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { walletAPI, handleAPIError } from '@/api/api';

interface WithdrawalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

interface Bank {
  name: string;
  code: string;
}


const FALLBACK_NIGERIAN_BANKS: Bank[] = [
  { name: '🧪 Test Bank (For Testing Only)', code: '001' }, 
  { name: 'Access Bank', code: '044' },
  { name: 'GTBank', code: '058' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'FCMB', code: '214' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Ecobank', code: '050' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
];

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); 
  const [banks, setBanks] = useState<Bank[]>(FALLBACK_NIGERIAN_BANKS);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  
  useEffect(() => {
    if (visible) {
      fetchBanks();
    }
  }, [visible]);

  
  useEffect(() => {
    if (bankCode && accountNumber.length === 10) {
      verifyAccount();
    } else {
      setAccountName('');
      setAccountVerified(false);
    }
  }, [bankCode, accountNumber]);

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      console.log('🏦 Fetching bank list...');

      const response = await walletAPI.getBankList('nigeria');

      if (response.success && response.data?.banks) {
        console.log(`✅ Loaded ${response.data.banks.length} banks`);
        setBanks(response.data.banks);
      } else {
        console.log('⚠️ Using fallback bank list');
        setBanks(FALLBACK_NIGERIAN_BANKS);
      }
    } catch (error) {
      console.error('❌ Failed to fetch banks, using fallback:', error);
      setBanks(FALLBACK_NIGERIAN_BANKS);
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    try {
      setVerifyingAccount(true);
      setAccountName('');
      setAccountVerified(false);

      console.log('🔍 Verifying account:', { bankCode, accountNumber });

      const response = await walletAPI.verifyBankAccount({
        accountNumber,
        bankCode,
      });

      if (response.success && response.data?.accountName) {
        console.log('✅ Account verified:', response.data.accountName);
        setAccountName(response.data.accountName);
        setAccountVerified(true);
      } else {
        Alert.alert(
          'Verification Failed',
          'Could not verify account details. Please check and try again.'
        );
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Account verification error:', apiError);
      Alert.alert('Verification Error', apiError.message);
    } finally {
      setVerifyingAccount(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString()}`;
  };

  const calculateFee = (withdrawalAmount: number): number => {
    return 100; 
  };

  const getNetAmount = (): number => {
    const withdrawalAmount = parseFloat(amount) || 0;
    return withdrawalAmount - calculateFee(withdrawalAmount);
  };

  const validateStep1 = (): boolean => {
    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount < 1000) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is ₦1,000');
      return false;
    }

    if (withdrawalAmount > currentBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your balance is ${formatCurrency(currentBalance)}`
      );
      return false;
    }

    if (!bankName || !bankCode) {
      Alert.alert('Bank Required', 'Please select your bank');
      return false;
    }

    if (accountNumber.length !== 10) {
      Alert.alert('Invalid Account', 'Account number must be 10 digits');
      return false;
    }

    if (!accountVerified) {
      Alert.alert(
        'Account Not Verified',
        'Please wait for account verification to complete'
      );
      return false;
    }

    if (!accountName.trim()) {
      Alert.alert('Account Name Required', 'Account verification failed');
      return false;
    }

    return true;
  };

  const handleBankSelect = (bank: Bank) => {
    setBankName(bank.name);
    setBankCode(bank.code);
    setShowBankModal(false);
    setBankSearchQuery('');
    
    setAccountNumber('');
    setAccountName('');
    setAccountVerified(false);
  };

  const getFilteredBanks = (): Bank[] => {
    if (!bankSearchQuery.trim()) {
      return banks;
    }
    return banks.filter((bank) =>
      bank.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
    );
  };

  const handleContinue = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleWithdrawal = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits');
      return;
    }

    try {
      setLoading(true);

      const response = await walletAPI.requestWithdrawal({
        amount: parseFloat(amount),
        bankName,
        bankCode,
        accountNumber,
        accountName: accountName.trim(),
        pin,
      });

      if (response.success) {
        Alert.alert(
          'Withdrawal Requested! 🎉',
          'Your withdrawal request has been submitted successfully. It will be processed within 24 hours.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                onSuccess();
              },
            },
          ]
        );
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Withdrawal Failed', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setBankName('');
    setBankCode('');
    setAccountNumber('');
    setAccountName('');
    setPin('');
    setAccountVerified(false);
    setStep(1);
    onClose();
  };

  return (
    <>
      {}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[90%]">
            {}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                {step === 2 && (
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    className="mr-3"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={24} color="#6b7280" />
                  </TouchableOpacity>
                )}
                <Text className="text-xl font-bold text-gray-900">
                  Withdraw Funds
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
              {step === 1 ? (
                <>
                  {}
                  <View className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-6">
                    <Text className="text-gray-600 text-sm mb-1">
                      Available Balance
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900">
                      {formatCurrency(currentBalance)}
                    </Text>
                  </View>

                  {}
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Withdrawal Amount
                  </Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-2">
                    <Text className="text-xl font-semibold text-gray-600 mr-2">
                      ₦
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="numeric"
                      className="flex-1 py-4 text-lg font-semibold text-gray-900"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <Text className="text-xs text-gray-500 mb-4">
                    Min: ₦1,000 • Fee: ₦100
                  </Text>

                  {}
                  {amount && parseFloat(amount) >= 1000 && (
                    <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6">
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-gray-600">Amount</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {formatCurrency(parseFloat(amount))}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-gray-600">
                          Withdrawal Fee
                        </Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          -₦100
                        </Text>
                      </View>
                      <View className="border-t border-yellow-300 pt-2 flex-row justify-between">
                        <Text className="text-sm font-bold text-gray-900">
                          You'll Receive
                        </Text>
                        <Text className="text-base font-bold text-pink-600">
                          {formatCurrency(getNetAmount())}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Bank Selection */}
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Select Bank
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowBankModal(true)}
                    disabled={loadingBanks}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-4 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    {loadingBanks ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="#eb278d" />
                        <Text className="text-sm text-gray-500 ml-2">
                          Loading banks...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text
                          className={`text-base ${
                            bankName ? 'text-gray-900 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          {bankName || 'Choose your bank...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Account Number */}
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Account Number
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={accountNumber}
                      onChangeText={(text) =>
                        setAccountNumber(text.replace(/[^0-9]/g, ''))
                      }
                      placeholder="0123456789"
                      keyboardType="numeric"
                      maxLength={10}
                      editable={!!bankCode}
                      className={`bg-gray-50 border ${
                        verifyingAccount
                          ? 'border-pink-300'
                          : accountVerified
                          ? 'border-green-300'
                          : 'border-gray-200'
                      } rounded-xl px-4 py-4 pr-12 text-base text-gray-900 mb-2`}
                      placeholderTextColor="#9ca3af"
                    />
                    {verifyingAccount && (
                      <View className="absolute right-4 top-4">
                        <ActivityIndicator size="small" color="#eb278d" />
                      </View>
                    )}
                    {accountVerified && !verifyingAccount && (
                      <View className="absolute right-4 top-4">
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </View>
                    )}
                  </View>
                  {!bankCode && (
                    <Text className="text-xs text-gray-500 mb-4">
                      Please select a bank first
                    </Text>
                  )}
                  {verifyingAccount && (
                    <Text className="text-xs text-pink-600 mb-4">
                      Verifying account details...
                    </Text>
                  )}

                  {/* Account Name Display */}
                  {accountName && accountVerified && (
                    <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <View className="flex-row items-center">
                        <Ionicons name="person-circle" size={24} color="#10b981" />
                        <View className="flex-1 ml-3">
                          <Text className="text-xs text-green-700 mb-1">
                            Account Name
                          </Text>
                          <Text className="text-base font-bold text-green-900">
                            {accountName}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Continue Button */}
                  <TouchableOpacity
                    onPress={handleContinue}
                    disabled={loading || verifyingAccount || !accountVerified}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        loading || verifyingAccount || !accountVerified
                          ? ['#d1d5db', '#9ca3af']
                          : ['#eb278d', '#f472b6']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-xl py-4 items-center"
                    >
                      <View className="flex-row items-center">
                        <Text className="text-white text-base font-bold mr-2">
                          Continue
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* PIN Entry Step */}
                  <View className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 mb-6">
                    <Text className="text-sm text-gray-600 mb-2">
                      Withdrawing
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900 mb-1">
                      {formatCurrency(parseFloat(amount))}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      To {bankName} - {accountNumber}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-800 mt-1">
                      {accountName}
                    </Text>
                  </View>

                  {/* PIN Input */}
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Enter Withdrawal PIN
                  </Text>
                  <TextInput
                    value={pin}
                    onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl text-center font-bold text-gray-900 mb-2 tracking-widest"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text className="text-xs text-gray-500 text-center mb-6">
                    Enter your 4-digit PIN to confirm withdrawal
                  </Text>

                  {/* Security Note */}
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <View className="flex-row items-start">
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color="#3b82f6"
                      />
                      <View className="flex-1 ml-3">
                        <Text className="text-sm font-semibold text-blue-900 mb-1">
                          Secure Withdrawal
                        </Text>
                        <Text className="text-xs text-blue-700">
                          Your withdrawal will be processed within 24 hours. Funds
                          will be sent to your verified bank account.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={handleWithdrawal}
                    disabled={pin.length !== 4 || loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        pin.length !== 4 || loading
                          ? ['#d1d5db', '#9ca3af']
                          : ['#eb278d', '#f472b6']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-xl py-4 items-center"
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="white"
                          />
                          <Text className="text-white text-base font-bold ml-2">
                            Confirm Withdrawal
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-900">Select Bank</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowBankModal(false);
                  setBankSearchQuery('');
                }}
                className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="px-6 py-3 border-b border-gray-100">
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  value={bankSearchQuery}
                  onChangeText={setBankSearchQuery}
                  placeholder="Search banks..."
                  className="flex-1 py-3 ml-2 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                />
                {bankSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setBankSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bank List */}
            <FlatList
              data={getFilteredBanks()}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                // Get bank initials (first 2-3 letters)
                const getInitials = (name: string) => {
                  const words = name.split(' ');
                  if (words.length === 1) return name.substring(0, 2).toUpperCase();
                  return words
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();
                };

                // Generate color based on bank name
                const getBankColor = (name: string) => {
                  const colors = [
                    { bg: 'bg-blue-100', text: 'text-blue-600' },
                    { bg: 'bg-purple-100', text: 'text-purple-600' },
                    { bg: 'bg-pink-100', text: 'text-pink-600' },
                    { bg: 'bg-green-100', text: 'text-green-600' },
                    { bg: 'bg-orange-100', text: 'text-orange-600' },
                    { bg: 'bg-red-100', text: 'text-red-600' },
                    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
                  ];
                  const index = name.charCodeAt(0) % colors.length;
                  return colors[index];
                };

                const bankColor = getBankColor(item.name);

                return (
                  <TouchableOpacity
                    onPress={() => handleBankSelect(item)}
                    className="px-6 py-4 border-b border-gray-50 flex-row items-center justify-between active:bg-gray-50"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`w-10 h-10 rounded-full ${bankColor.bg} items-center justify-center mr-3`}
                      >
                        <Text className={`text-sm font-bold ${bankColor.text}`}>
                          {getInitials(item.name)}
                        </Text>
                      </View>
                      <Text className="text-base text-gray-900 font-medium flex-1">
                        {item.name}
                      </Text>
                    </View>
                    {bankCode === item.code && (
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View className="py-12 items-center">
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-400 text-base mt-3">
                    No banks found
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">
                    Try a different search term
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default WithdrawalModal;