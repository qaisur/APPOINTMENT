import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DoctorLoginScreen = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const doctorsData = await AsyncStorage.getItem('doctors');

      if (doctorsData) {
        const doctors = JSON.parse(doctorsData);
        // Login by username+password OR email+password
        const doctor = doctors.find(
          d =>
            (d.username === username.toLowerCase() ||
              d.email === username.toLowerCase()) &&
            d.password === password,
        );

        if (doctor) {
          await AsyncStorage.setItem('currentDoctor', JSON.stringify(doctor));
          navigation.replace('DoctorDashboard');
        } else {
          Alert.alert('Error', 'Invalid credentials');
        }
      } else {
        Alert.alert(
          'No Account Found',
          'No doctor accounts exist yet. Please contact the system administrator to create your account.',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    }
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/8801534919618').catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:qaisur@gmail.com').catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarIcon}>👨‍⚕️</Text>
          </View>
          <Text style={styles.title}>Doctor Login</Text>
          <Text style={styles.subtitle}>Access your dashboard</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username or email"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={6}
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Change #5: Contact admin info instead of demo account */}
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>
            If you are a doctor, please contact system admin
          </Text>
          <Text style={styles.contactName}>Dr. Qaisur Rabbi</Text>

          <TouchableOpacity
            style={styles.contactBtn}
            onPress={handleWhatsApp}
            activeOpacity={0.7}>
            <Text style={styles.contactBtnText}>
              💬 WhatsApp: +8801534919618
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, styles.contactBtnEmail]}
            onPress={handleEmail}
            activeOpacity={0.7}>
            <Text style={styles.contactBtnEmailText}>
              ✉️ Email: qaisur@gmail.com
            </Text>
          </TouchableOpacity>

          <Text style={styles.contactFooter}>
            for username and password. Thank you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#667eea',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Contact admin box
  contactBox: {
    backgroundColor: '#fff8e1',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    color: '#5d4037',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  contactBtn: {
    backgroundColor: '#25d366',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactBtnEmail: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  contactBtnEmailText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  contactFooter: {
    fontSize: 13,
    color: '#5d4037',
    textAlign: 'center',
    marginTop: 6,
  },
});

export default DoctorLoginScreen;