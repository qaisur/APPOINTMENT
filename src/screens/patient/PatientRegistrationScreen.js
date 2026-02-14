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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const PatientRegistrationScreen = ({navigation}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: null,
    age: '',
    sex: 'Male',
    phone: '',
    password: '',
    currentProblem: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const calculateAge = date => {
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (selectedDate) {
      const age = calculateAge(selectedDate);
      setFormData({
        ...formData,
        dateOfBirth: selectedDate,
        age: age.toString(),
      });
    }
  };

  const formatDate = date => {
    if (!date) return 'Select Date of Birth';
    const options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    return date.toLocaleDateString('en-US', options);
  };

  const validatePhone = phone => {
    // Must be 11 digits and start with 01
    const phoneRegex = /^01\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = password => {
    // 4-6 characters, alphanumeric
    if (password.length < 4 || password.length > 6) {
      return false;
    }
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(password);
  };

  const generateRegNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, '0');
    return `PAT${year}-${random}`;
  };

  const handleRegister = async () => {
    // Validation
    if (
      !formData.fullName ||
      !formData.dateOfBirth ||
      !formData.phone ||
      !formData.password ||
      !formData.currentProblem
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validatePhone(formData.phone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Phone number must be 11 digits and start with 01\nExample: 01712345678',
      );
      return;
    }

    if (!validatePassword(formData.password)) {
      Alert.alert(
        'Invalid Password',
        'Password must be 4-6 characters and alphanumeric (letters and/or numbers only)\nExamples: 1234, abc1, pass12',
      );
      return;
    }

    try {
      const regNumber = generateRegNumber();

      const newPatient = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth.toLocaleDateString(),
        age: formData.age,
        sex: formData.sex,
        phone: formData.phone,
        password: formData.password,
        currentProblem: formData.currentProblem,
        regNumber,
        createdAt: new Date().toISOString(),
      };

      const patientsData = await AsyncStorage.getItem('patients');
      const patients = patientsData ? JSON.parse(patientsData) : [];

      patients.push(newPatient);
      await AsyncStorage.setItem('patients', JSON.stringify(patients));

      await AsyncStorage.setItem('currentPatient', JSON.stringify(newPatient));

      Alert.alert(
        'Registration Successful!',
        `Your registration number is:\n\n${regNumber}\n\nPlease save this number for future login.`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('ScheduleSelection'),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Patient Registration</Text>
        <Text style={styles.subHeaderText}>Create your account</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={text => setFormData({...formData, fullName: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{formatDate(formData.dateOfBirth)}</Text>
          </TouchableOpacity>
          {formData.age !== '' && (
            <Text style={styles.ageText}>Age: {formData.age} years (auto-calculated)</Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.dateOfBirth || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sex *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData({...formData, sex: 'Male'})}>
              <View
                style={[
                  styles.radio,
                  formData.sex === 'Male' && styles.radioSelected,
                ]}>
                {formData.sex === 'Male' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Male</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData({...formData, sex: 'Female'})}>
              <View
                style={[
                  styles.radio,
                  formData.sex === 'Female' && styles.radioSelected,
                ]}>
                {formData.sex === 'Female' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Female</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData({...formData, sex: 'Other'})}>
              <View
                style={[
                  styles.radio,
                  formData.sex === 'Other' && styles.radioSelected,
                ]}>
                {formData.sex === 'Other' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Other</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number * (11 digits, starts with 01)</Text>
          <TextInput
            style={styles.input}
            placeholder="01712345678"
            value={formData.phone}
            onChangeText={text => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Create Password * (4-6 characters, alphanumeric)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1234 or abc1"
            value={formData.password}
            onChangeText={text => setFormData({...formData, password: text})}
            secureTextEntry
            maxLength={6}
          />
          <Text style={styles.hint}>Must be 4-6 characters (letters and/or numbers)</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Problem *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your current health concern..."
            value={formData.currentProblem}
            onChangeText={text =>
              setFormData({...formData, currentProblem: text})
            }
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          activeOpacity={0.8}>
          <Text style={styles.registerButtonText}>Register & Continue</Text>
        </TouchableOpacity>
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
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
  textArea: {
    minHeight: 100,
    paddingTop: 15,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 15,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#667eea',
  },
  ageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#667eea',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#667eea',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
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
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PatientRegistrationScreen;