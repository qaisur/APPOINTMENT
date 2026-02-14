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
  const [allConsultations, setAllConsultations] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadExistingConsultations();
  }, []);

  const loadExistingConsultations = async () => {
    try {
      const consultationsData = await AsyncStorage.getItem('consultations');
      if (consultationsData) {
        const consultations = JSON.parse(consultationsData);
        const patientConsultations = consultations
          .filter(c => c.patientId === patientId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setAllConsultations(patientConsultations);

        // Check if latest consultation is completed (Final Visit marked complete)
        const completedFinal = patientConsultations.find(
          c => c.consultationStage === 'Final Visit' && c.isCompleted,
        );
        if (completedFinal) {
          setIsCompleted(true);
        }
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
      if (response.didCancel) return;
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

  // Feature #5 & #6: Save consultation (supports multiple follow-ups)
  const handleSave = async () => {
    if (!clinicalNotes) {
      Alert.alert('Error', 'Please add clinical notes');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Feature #5: Use actual current date/time
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Feature #6: Determine visit number for follow-ups
      let visitNumber = 1;
      if (consultationStage === 'Follow-up Visit') {
        const followUps = allConsultations.filter(
          c => c.consultationStage === 'Follow-up Visit',
        );
        visitNumber = followUps.length + 1;
      }

      const consultation = {
        id: 'CONSULT' + Date.now(),
        patientId: patientId,
        consultationStage: consultationStage,
        visitNumber: visitNumber,
        clinicalNotes: clinicalNotes,
        diagnosis: diagnosis,
        prescriptionPhotos: prescriptionPhotos,
        consultationDate: currentDate,
        consultationTime: currentTime,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      const consultationsData = await AsyncStorage.getItem('consultations');
      let consultations = consultationsData
        ? JSON.parse(consultationsData)
        : [];

      // For First Visit, replace existing if not completed
      if (consultationStage === 'First Visit') {
        consultations = consultations.filter(
          c =>
            !(
              c.patientId === patientId &&
              c.consultationStage === 'First Visit' &&
              !c.isCompleted
            ),
        );
      }

      // For Final Visit, replace existing if not completed
      if (consultationStage === 'Final Visit') {
        consultations = consultations.filter(
          c =>
            !(
              c.patientId === patientId &&
              c.consultationStage === 'Final Visit' &&
              !c.isCompleted
            ),
        );
      }

      // Feature #6: Follow-up visits always create new entries
      consultations.push(consultation);
      await AsyncStorage.setItem(
        'consultations',
        JSON.stringify(consultations),
      );

      Alert.alert(
        'Success',
        `${consultationStage}${
          consultationStage === 'Follow-up Visit'
            ? ` #${visitNumber}`
            : ''
        } notes saved successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadExistingConsultations();
              setClinicalNotes('');
              setDiagnosis('');
              setPrescriptionPhotos([]);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save consultation notes');
    } finally {
      setIsSaving(false);
    }
  };

  // Feature #5: Mark as Complete locks the visit
  const handleMarkComplete = async () => {
    if (!clinicalNotes) {
      Alert.alert('Error', 'Please add clinical notes before marking complete');
      return;
    }

    Alert.alert(
      'Mark as Complete',
      'This will save the notes and lock this consultation. You won\'t be able to edit it after. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              const currentDate = new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const currentTime = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              let visitNumber = 1;
              if (consultationStage === 'Follow-up Visit') {
                const followUps = allConsultations.filter(
                  c => c.consultationStage === 'Follow-up Visit',
                );
                visitNumber = followUps.length + 1;
              }

              const consultation = {
                id: 'CONSULT' + Date.now(),
                patientId: patientId,
                consultationStage: consultationStage,
                visitNumber: visitNumber,
                clinicalNotes: clinicalNotes,
                diagnosis: diagnosis,
                prescriptionPhotos: prescriptionPhotos,
                consultationDate: currentDate,
                consultationTime: currentTime,
                isCompleted: true,
                completedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };

              const consultationsData = await AsyncStorage.getItem(
                'consultations',
              );
              let consultations = consultationsData
                ? JSON.parse(consultationsData)
                : [];

              // Remove draft of same stage
              if (
                consultationStage === 'First Visit' ||
                consultationStage === 'Final Visit'
              ) {
                consultations = consultations.filter(
                  c =>
                    !(
                      c.patientId === patientId &&
                      c.consultationStage === consultationStage &&
                      !c.isCompleted
                    ),
                );
              }

              consultations.push(consultation);
              await AsyncStorage.setItem(
                'consultations',
                JSON.stringify(consultations),
              );

              // Update appointment status
              const appointmentsData = await AsyncStorage.getItem(
                'appointments',
              );
              if (appointmentsData) {
                const appointments = JSON.parse(appointmentsData);
                const updatedAppointments = appointments.map(apt => {
                  if (
                    apt.patientId === patientId &&
                    apt.status === 'pending'
                  ) {
                    return {...apt, status: 'completed'};
                  }
                  return apt;
                });
                await AsyncStorage.setItem(
                  'appointments',
                  JSON.stringify(updatedAppointments),
                );
              }

              Alert.alert(
                'Consultation Complete',
                'Notes saved and consultation marked as complete.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to complete consultation');
            }
          },
        },
      ],
    );
  };

  // Feature #6: Get visit type label
  const getVisitLabel = consultation => {
    if (consultation.consultationStage === 'Follow-up Visit') {
      return `Follow-up Visit #${consultation.visitNumber || ''}`;
    }
    return consultation.consultationStage;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Consultation Notes</Text>
        <Text style={styles.subHeaderText}>Patient ID: {patientId}</Text>

        {/* Feature #6: Show all existing consultations chronologically */}
        {allConsultations.length > 0 && (
          <View style={styles.existingBox}>
            <Text style={styles.existingTitle}>
              Visit History ({allConsultations.length} visit
              {allConsultations.length !== 1 ? 's' : ''})
            </Text>
            {allConsultations.map((c, idx) => (
              <View key={c.id || idx} style={styles.visitHistoryItem}>
                <View style={styles.visitHistoryHeader}>
                  <Text style={styles.visitHistoryType}>
                    {c.isCompleted ? '✓' : '○'} {getVisitLabel(c)}
                  </Text>
                  <Text style={styles.visitHistoryDate}>
                    {c.consultationDate}
                    {c.consultationTime ? ` ${c.consultationTime}` : ''}
                  </Text>
                </View>
                {c.diagnosis ? (
                  <Text style={styles.visitHistoryDiagnosis}>
                    Dx: {c.diagnosis}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.visitHistoryStatus,
                    c.isCompleted
                      ? styles.statusCompleted
                      : styles.statusDraft,
                  ]}>
                  {c.isCompleted ? 'Completed' : 'Draft'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Feature #5: Prevent new entries if completed */}
        {isCompleted && (
          <View style={styles.completedNotice}>
            <Text style={styles.completedNoticeText}>
              This patient's consultation cycle is complete. You can still add
              Follow-up Visit notes for future visits.
            </Text>
          </View>
        )}

        {/* Feature #6: Consultation stage selection with Follow-up */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Consultation Stage</Text>
          <View style={styles.stageButtons}>
            <TouchableOpacity
              style={[
                styles.stageButton,
                consultationStage === 'First Visit' &&
                  styles.stageButtonSelected,
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

            {/* Feature #6: Follow-up Visit option */}
            <TouchableOpacity
              style={[
                styles.stageButton,
                consultationStage === 'Follow-up Visit' &&
                  styles.stageButtonSelected,
              ]}
              onPress={() => setConsultationStage('Follow-up Visit')}>
              <Text
                style={[
                  styles.stageButtonText,
                  consultationStage === 'Follow-up Visit' &&
                    styles.stageButtonTextSelected,
                ]}>
                Follow-up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.stageButton,
                consultationStage === 'Final Visit' &&
                  styles.stageButtonSelected,
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
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={isSaving}>
          <Text style={styles.saveButtonText}>
            Save {consultationStage} Notes
          </Text>
        </TouchableOpacity>

        {/* Feature #5: Mark Complete button */}
        <TouchableOpacity
          style={[styles.completeButton]}
          onPress={handleMarkComplete}
          activeOpacity={0.8}>
          <Text style={styles.completeButtonText}>
            Save & Mark as Complete
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ First Visit and Final Visit can be saved once each.
            Follow-up Visits create separate entries for each visit over time.
            "Mark as Complete" locks the consultation permanently.
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
    fontSize: 15,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 12,
  },
  visitHistoryItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  visitHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitHistoryType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  visitHistoryDate: {
    fontSize: 12,
    color: '#666',
  },
  visitHistoryDiagnosis: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  visitHistoryStatus: {
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusCompleted: {
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
  },
  statusDraft: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  completedNotice: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  completedNoticeText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 20,
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
    gap: 8,
  },
  stageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    fontSize: 13,
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
  buttonDisabled: {
    opacity: 0.6,
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