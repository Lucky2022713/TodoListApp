import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import InputRow from '../components/InputRow';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function LoginRegisterScreen({ navigation }) {
  const { token, setToken } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Register form state
  const [name, setName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [cPass, setCPass] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [rEmailFocused, setREmailFocused] = useState(false);
  const [rPassFocused, setRPassFocused] = useState(false);
  const [cPassFocused, setCPassFocused] = useState(false);

  const [loading, setLoading] = useState(false);

  // Refs for next-field focusing
  const refs = {
    rE: useRef(null),
    rP: useRef(null),
    cP: useRef(null),
    lE: useRef(null),
    lP: useRef(null),
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Enter email & password');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        return Alert.alert('Login Failed', data.message || 'Unknown error');
      }

      const { token: jwtToken } = data;
      if (!jwtToken) {
        return Alert.alert('Error', 'No token received from server');
      }

      setToken(jwtToken);
      navigation.replace('Drawer');
    } catch (err) {
      setLoading(false);
      console.error('Login error:', err);
      Alert.alert(
        'Network Error',
        `Unable to connect to server at ${API_URL}\nEnsure backend is running.`
      );
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      return Alert.alert('Error', 'Please enter your full name.');
    }
    if (!rEmail.trim()) {
      return Alert.alert('Error', 'Please enter your email.');
    }
    if (rPass.length < 6) {
      return Alert.alert('Error', 'Password must be ≥ 6 characters.');
    }
    if (rPass !== cPass) {
      return Alert.alert('Error', 'Passwords do not match.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: rEmail.trim().toLowerCase(),
          password: rPass,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        return Alert.alert('Registration Failed', data.message || 'Unknown error');
      }

      Alert.alert('Success', 'Registered! You can now log in.');
      // Reset registration fields
      setName('');
      setREmail('');
      setRPass('');
      setCPass('');
      setShowRegister(false);
    } catch (err) {
      setLoading(false);
      console.error('Register error:', err);
      Alert.alert(
        'Network Error',
        `Unable to connect to server at ${API_URL}\nEnsure backend is running.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{showRegister ? 'Register' : 'Login'}</Text>
            <Text style={styles.subtitle}>
              {showRegister ? 'Create a new account' : 'Please sign in to continue'}
            </Text>

            {showRegister ? (
              <>
                <Text style={styles.label}>Full Name</Text>
                <InputRow
                  icon="user"
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Name"
                  focused={nameFocused}
                  setFocused={setNameFocused}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.rE.current?.focus()}
                  autoCapitalize="words"
                  style={styles.input}
                />

                <Text style={styles.label}>Email</Text>
                <InputRow
                  ref={refs.rE}
                  icon="envelope"
                  value={rEmail}
                  onChangeText={setREmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  focused={rEmailFocused}
                  setFocused={setREmailFocused}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.rP.current?.focus()}
                  style={styles.input}
                />

                <Text style={styles.label}>Password</Text>
                <InputRow
                  ref={refs.rP}
                  icon="lock"
                  value={rPass}
                  onChangeText={setRPass}
                  placeholder="Password"
                  secureTextEntry
                  focused={rPassFocused}
                  setFocused={setRPassFocused}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.cP.current?.focus()}
                  style={styles.input}
                />

                <Text style={styles.label}>Confirm Password</Text>
                <InputRow
                  ref={refs.cP}
                  icon="lock"
                  value={cPass}
                  onChangeText={setCPass}
                  placeholder="Confirm Password"
                  secureTextEntry
                  focused={cPassFocused}
                  setFocused={setCPassFocused}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleRegister}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Register</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowRegister(false)}>
                  <Text style={styles.toggleText}>
                    Already have an account?{' '}
                    <Text style={styles.toggleLink}>Login here</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <InputRow
                  ref={refs.lE}
                  icon="envelope"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  focused={emailFocused}
                  setFocused={setEmailFocused}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.lP.current?.focus()}
                  style={styles.input}
                />

                <Text style={styles.label}>Password</Text>
                <InputRow
                  ref={refs.lP}
                  icon="lock"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  focused={passwordFocused}
                  setFocused={setPasswordFocused}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleLogin}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowRegister(true)}>
                  <Text style={styles.toggleText}>
                    Don’t have an account?{' '}
                    <Text style={styles.toggleLink}>Register here</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <StatusBar style="light" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 36,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
    marginTop: 10,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#333',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  toggleText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
  },
  toggleLink: {
    color: '#fff',
    fontWeight: '700',
  },
});
