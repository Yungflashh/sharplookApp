import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loginUser } from '@/utils/authHelper';
import { Ionicons } from '@expo/vector-icons';
const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      email: '',
      password: ''
    };
    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }
    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      console.log(result);
      if (result.success) {
        Alert.alert('Success', 'Login successful!', [{
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{
                name: 'Main',
                params: {
                  isVendor: result.isVendor
                }
              }]
            });
          }
        }]);
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    // When Glitch creates the forgetPassword screen, it will be added.
      // navigation.navigate('ForgotPassword');
  };
  const handleRegister = () => {
    navigation.navigate("Auth", { screen: "Register" });
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        {}
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.subtitleText}>Please fill the details below</Text>

        {}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter E-mail Address</Text>
          <TextInput style={[styles.input, errors.email ? styles.inputError : null]} placeholder="" value={email} onChangeText={text => {
          setEmail(text);
          setErrors({
            ...errors,
            email: ''
          });
        }} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        {}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={[styles.passwordInput, errors.password ? styles.inputError : null]} placeholder="" value={password} onChangeText={text => {
            setPassword(text);
            setErrors({
              ...errors,
              password: ''
            });
          }} secureTextEntry={!showPassword} editable={!loading} />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#E91E63" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {}
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.rememberContainer} onPress={() => setRememberMe(!rememberMe)} disabled={loading}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={16} color="#E91E63" />}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {}
        <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Login</Text>}
        </TouchableOpacity>

        {}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don`t have an account? </Text>
          <TouchableOpacity onPress={handleRegister} disabled={loading}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>

       
      </ScrollView>
    </KeyboardAvoidingView>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logo: {
    width: 150,
    height: 80
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif'
  },
  subtitleText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40
  },
  inputContainer: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000'
  },
  inputError: {
    borderColor: '#E91E63'
  },
  passwordContainer: {
    position: 'relative'
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000'
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16
  },
  errorText: {
    color: '#E91E63',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E91E63',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#FFE4EC'
  },
  rememberText: {
    fontSize: 14,
    color: '#333333'
  },
  forgotText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500'
  },
  loginButton: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#E91E63',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  loginButtonDisabled: {
    backgroundColor: '#FFB3D4'
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  registerText: {
    fontSize: 14,
    color: '#666666'
  },
  registerLink: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600'
  },
  switchVendorContainer: {
    alignItems: 'center',
    paddingVertical: 12
  },
  switchVendorText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500'
  }
});
export default LoginScreen;