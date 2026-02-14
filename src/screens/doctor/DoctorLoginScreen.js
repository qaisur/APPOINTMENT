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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DoctorLoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const doctorsData = await AsyncStorage.getItem('doctors');

      if (doctorsData) {
        const doctors = JSON.parse(doctorsData);
        const doctor = doctors.find(
          d => d.email === email && d.password === password,
        );

        if (doctor) {
          await AsyncStorage.setItem('currentDoctor', JSON.stringify(doctor));
          navigation.replace('DoctorDashboard');
        } else {
          Alert.alert('Error', 'Invalid credentials');
        }
      } else {
        // First time - create demo account
        const newDoctor = {
          id: 'DOC001',
          email: email,
          password: password,
          fullName: 'Dr. Sarah Wilson',
          specialization: 'Pediatrician',
          qualifications: 'MBBS, MD',
          experience: '10 years',
          photo: null,
          specialties: [],
          createdAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem('doctors', JSON.stringify([newDoctor]));
        await AsyncStorage.setItem('currentDoctor', JSON.stringify(newDoctor));

        Alert.alert(
          'Welcome!',
          'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('DoctorDashboard'),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    }
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
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="doctor@example.com"
              value={email}
              onChangeText={setEmail}
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
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <View style={styles.demoInfo}>
            <Text style={styles.demoText}>
              First time? Enter any email/password to create account
            </Text>
          </View>
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
    marginBottom: 40,
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
    marginBottom: 40,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfo: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },
  demoText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

export default DoctorLoginScreen;