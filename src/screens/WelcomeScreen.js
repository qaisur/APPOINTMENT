import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

const WelcomeScreen = ({navigation}) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.title}>MediConnect</Text>
          <Text style={styles.subtitle}>Your Healthcare Companion</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PatientLogin')}>
          <Text style={styles.emoji}>👤</Text>
          <Text style={styles.buttonTitle}>I'm a Patient</Text>
          <Text style={styles.buttonSubtitle}>Book appointments and manage health records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('DoctorLogin')}>
          <Text style={styles.emoji}>👨‍⚕️</Text>
          <Text style={styles.buttonTitle}>I'm a Doctor</Text>
          <Text style={styles.buttonSubtitle}>Manage schedules and patient consultations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.adminButton]}
          onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={styles.emoji}>⚙️</Text>
          <Text style={styles.buttonTitle}>Admin Panel</Text>
          <Text style={styles.buttonSubtitle}>Manage users and system settings</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Secure • Private • Easy to Use</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default WelcomeScreen;