import React, {useState, useEffect} from 'react';
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
import {launchImageLibrary} from 'react-native-image-picker';

const ConsultationNotesScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [consultationStage, setConsultationStage] = useState('First Visit');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionPhotos, setPrescriptionPhotos] = useState([]);
  const [existingConsultations, setExistingConsultations] = useState({
    firstVisit: null,
    finalVisit: null,
  });

  useEffect(() => {
    loadExistingConsultations();
  }, []);

  const loadExistingConsultations = async () => {
    try {
      const consultationsData = await AsyncStorage.getItem('consultations');
      if (consultationsData) {
        const consultations = JSON.parse(consultationsData);
        const patientConsultations = consultations.filter(
          c => c.patientId === patientId,
        );

        const firstVisit = patientConsultations.find(
          c => c.consultationStage === 'First Visit',
        );
        const finalVisit = patientConsultations.find(
          c => c.consultationStage === 'Final Visit',
        );

        setExistingConsultations({firstVisit, finalVisit});
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const handleSelectPhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 5,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert('Error', 'Failed to select image');
        return;
      }
      if (response.assets) {
        const photos = response.assets.map(asset => asset.uri);
        setPrescriptionPhotos([...prescriptionPhotos, ...photos]);
      }
    });
  };

  const handleRemovePhoto = index => {
    const newPhotos = prescriptionPhotos.filter((_, i) => i !== index);
    setPrescriptionPhotos(newPhotos);
  };

  const handleSave = async () => {
    if (!clinicalNotes) {
      Alert.alert('Error', 'Please add clinical notes');
      return;
    }

    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const consultation = {
        id: 'CONSULT' + Date.now(),
        patientId: patientId,
        consultationStage: consultationStage,
        clinicalNotes: clinicalNotes,
        diagnosis: diagnosis,
        prescriptionPhotos: prescriptionPhotos,
        consultationDate: currentDate,
        createdAt: new Date().toISOString(),
      };

      const consultationsData = await AsyncStorage.getItem('consultations');
      let consultations = consultationsData ? JSON.parse(consultationsData) : [];

      // Remove existing consultation of same stage for this patient
      consultations = consultations.filter(
        c =>
          !(
            c.patientId === patientId &&
            c.consultationStage === consultationStage
          ),
      );

      consultations.push(consultation);
      await AsyncStorage.setItem(
        'consultations',
        JSON.stringify(consultations),
      );

      Alert.alert(
        'Success',
        `${consultationStage} notes saved successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save consultation notes');
    }
  };

  const handleMarkComplete = async () => {
    Alert.alert(
      'Mark as Complete',
      'Are you sure you want to mark this consultation as complete?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Complete',
          onPress: async () => {
            await handleSave();
            // Update appointment status
            try {
              const appointmentsData = await AsyncStorage.getItem(
                'appointments',
              );
              if (appointmentsData) {
                const appointments = JSON.parse(appointmentsData);
                const updatedAppointments = appointments.map(apt => {
                  if (apt.patientId === patientId) {
                    return {...apt, status: 'completed'};
                  }
                  return apt;
                });
                await AsyncStorage.setItem(
                  'appointments',
                  JSON.stringify(updatedAppointments),
                );
              }
            } catch (error) {
              console.error('Error updating appointment:', error);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Consultation Notes</Text>
        <Text style={styles.subHeaderText}>Patient ID: {patientId}</Text>

        {/* Show existing consultations summary */}
        {(existingConsultations.firstVisit ||
          existingConsultations.finalVisit) && (
          <View style={styles.existingBox}>
            <Text style={styles.existingTitle}>Existing Consultations:</Text>
            {existingConsultations.firstVisit && (
              <Text style={styles.existingText}>
                ✓ First Visit - {existingConsultations.firstVisit.consultationDate}
              </Text>
            )}
            {existingConsultations.finalVisit && (
              <Text style={styles.existingText}>
                ✓ Final Visit - {existingConsultations.finalVisit.consultationDate}
              </Text>
            )}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Consultation Stage</Text>
          <View style={styles.stageButtons}>
            <TouchableOpacity
              style={[
                styles.stageButton,
                consultationStage === 'First Visit' && styles.stageButtonSelected,
              ]}
              onPress={() => setConsultationStage('First Visit')}>
              <Text
                style={[
                  styles.stageButtonText,
                  consultationStage === 'First Visit' &&
                    styles.stageButtonTextSelected,
                ]}>
                First Visit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.stageButton,
                consultationStage === 'Final Visit' && styles.stageButtonSelected,
              ]}
              onPress={() => setConsultationStage('Final Visit')}>
              <Text
                style={[
                  styles.stageButtonText,
                  consultationStage === 'Final Visit' &&
                    styles.stageButtonTextSelected,
                ]}>
                Final Visit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Clinical Notes *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Patient presents with..."
            value={clinicalNotes}
            onChangeText={setClinicalNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Diagnosis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provisional/Final diagnosis..."
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prescription Photos</Text>
          <TouchableOpacity
            style={styles.photoUpload}
            onPress={handleSelectPhoto}>
            <Text style={styles.uploadIcon}>📸</Text>
            <Text style={styles.uploadText}>Tap to upload prescription</Text>
          </TouchableOpacity>

          {prescriptionPhotos.length > 0 && (
            <View style={styles.photoGrid}>
              {prescriptionPhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Text style={styles.photoPlaceholder}>📄 {index + 1}</Text>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}>
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>
            Save {consultationStage} Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleMarkComplete}
          activeOpacity={0.8}>
          <Text style={styles.completeButtonText}>Mark as Complete</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Both First Visit and Final Visit will be saved separately and
            can be compared side-by-side in patient history
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  existingBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  existingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  existingText: {
    fontSize: 13,
    color: '#2e7d32',
    marginBottom: 3,
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
  stageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  stageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  stageButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  stageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stageButtonTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 15,
  },
  photoUpload: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#667eea',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
  },
  uploadIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  uploadText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoPlaceholder: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  completeButtonText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
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

export default ConsultationNotesScreen;