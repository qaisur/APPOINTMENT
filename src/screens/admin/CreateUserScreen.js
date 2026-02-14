import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateUserScreen = ({navigation}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    specialization: '',
    qualifications: '',
    email: '',
    phone: '',
  });

  const validatePassword = password => {
    // 4-6 characters, alphanumeric
    if (password.length < 4 || password.length > 6) {
      return false;
    }
    // Check if alphanumeric (letters and/or numbers)
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(password);
  };

  const handleCreateDoctor = async () => {
    // Validation
    if (
      !formData.fullName ||
      !formData.username ||
      !formData.password ||
      !formData.specialization
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validatePassword(formData.password)) {
      Alert.alert(
        'Invalid Password',
        'Password must be 4-6 characters and alphanumeric (letters and/or numbers only)',
      );
      return;
    }

    try {
      // Check if username already exists
      const doctorsData = await AsyncStorage.getItem('doctors');
      const doctors = doctorsData ? JSON.parse(doctorsData) : [];

      const usernameExists = doctors.some(
        d => d.username === formData.username,
      );

      if (usernameExists) {
        Alert.alert('Error', 'Username already exists. Choose another one.');
        return;
      }

      // Create new doctor
      const newDoctor = {
        id: 'DOC' + Date.now(),
        fullName: formData.fullName,
        username: formData.username,
        password: formData.password,
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        email: formData.email,
        phone: formData.phone,
        photo: null,
        specialties: [],
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
      };

      doctors.push(newDoctor);
      await AsyncStorage.setItem('doctors', JSON.stringify(doctors));

      Alert.alert(
        'Success!',
        `Doctor account created successfully!\n\nUsername: ${formData.username}\nPassword: ${formData.password}\n\nPlease share these credentials with the doctor.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create doctor account');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Create Doctor Account</Text>
          <Text style={styles.subHeaderText}>
            Fill in the details to create a new doctor account
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Dr. John Doe"
            value={formData.fullName}
            onChangeText={text => setFormData({...formData, fullName: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username * (for login)</Text>
          <TextInput
            style={styles.input}
            placeholder="johndoe"
            value={formData.username}
            onChangeText={text =>
              setFormData({...formData, username: text.toLowerCase()})
            }
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Password * (4-6 characters, alphanumeric)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="abc123"
            value={formData.password}
            onChangeText={text => setFormData({...formData, password: text})}
            maxLength={6}
          />
          <Text style={styles.hint}>
            Examples: 1234, abc1, pass12 (4-6 chars only)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Specialization *</Text>
          <TextInput
            style={styles.input}
            placeholder="Pediatrician"
            value={formData.specialization}
            onChangeText={text =>
              setFormData({...formData, specialization: text})
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Qualifications</Text>
          <TextInput
            style={styles.input}
            placeholder="MBBS, MD"
            value={formData.qualifications}
            onChangeText={text =>
              setFormData({...formData, qualifications: text})
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="doctor@example.com"
            value={formData.email}
            onChangeText={text => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone (11 digits starting with 01)</Text>
          <TextInput
            style={styles.input}
            placeholder="01712345678"
            value={formData.phone}
            onChangeText={text => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateDoctor}
          activeOpacity={0.8}>
          <Text style={styles.createButtonText}>Create Doctor Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ After creating the account, share the username and password with
            the doctor securely.
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 25,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#4caf50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});

export default CreateUserScreen;