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

const MedicalHistoryScreen = ({navigation}) => {
  const [history, setHistory] = useState({
    gestationPeriod: '',
    birthWeight: '',
    deliveryType: 'Normal/Vaginal',
    headControl: '',
    sitting: '',
    walking: '',
    allergies: '',
    chronicConditions: '',
  });

  const handleSave = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      const currentPatient = JSON.parse(currentPatientData);

      const medicalHistory = {
        patientId: currentPatient.regNumber,
        ...history,
        isLocked: true,
        createdAt: new Date().toISOString(),
      };

      const historiesData = await AsyncStorage.getItem('medicalHistories');
      const histories = historiesData ? JSON.parse(historiesData) : [];
      histories.push(medicalHistory);
      await AsyncStorage.setItem('medicalHistories', JSON.stringify(histories));

      Alert.alert(
        'Success',
        'Medical history saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PatientDashboard'),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save medical history');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Medical History</Text>
        <Text style={styles.subHeaderText}>
          Help doctor understand your background
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👶 Birth History</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gestation Period</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 38 weeks"
              value={history.gestationPeriod}
              onChangeText={text =>
                setHistory({...history, gestationPeriod: text})
              }
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birth Weight</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3.2 kg"
              value={history.birthWeight}
              onChangeText={text => setHistory({...history, birthWeight: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setHistory({...history, deliveryType: 'Normal/Vaginal'})
                }>
                <View
                  style={[
                    styles.radio,
                    history.deliveryType === 'Normal/Vaginal' &&
                      styles.radioSelected,
                  ]}>
                  {history.deliveryType === 'Normal/Vaginal' && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Normal/Vaginal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setHistory({...history, deliveryType: 'Cesarean'})
                }>
                <View
                  style={[
                    styles.radio,
                    history.deliveryType === 'Cesarean' && styles.radioSelected,
                  ]}>
                  {history.deliveryType === 'Cesarean' && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Cesarean</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚼 Motor Development Milestones</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Head Control</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3 months"
              value={history.headControl}
              onChangeText={text => setHistory({...history, headControl: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sitting Independently</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 6 months"
              value={history.sitting}
              onChangeText={text => setHistory({...history, sitting: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Walking</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 12 months"
              value={history.walking}
              onChangeText={text => setHistory({...history, walking: text})}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Clinical Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Known Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any known allergies..."
              value={history.allergies}
              onChangeText={text => setHistory({...history, allergies: text})}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chronic Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any ongoing conditions..."
              value={history.chronicConditions}
              onChangeText={text =>
                setHistory({...history, chronicConditions: text})
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Medical History</Text>
        </TouchableOpacity>

        <Text style={styles.warning}>
          ⚠️ You cannot edit this after saving. Doctor can view and update if
          needed.
        </Text>
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
    marginBottom: 25,
  },
  section: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 15,
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 15,
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
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
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
    width: 22,
    height: 22,
    borderRadius: 11,
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
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#667eea',
  },
  radioLabel: {
    fontSize: 15,
    color: '#333',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default MedicalHistoryScreen;