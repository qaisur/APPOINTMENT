import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, Modal, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';

const ConsultationNotesScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionPhotos, setPrescriptionPhotos] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Prescription preview modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState([]);

  useEffect(() => { loadExistingConsultations(); }, []);

  const loadExistingConsultations = async () => {
    try {
      const data = await AsyncStorage.getItem('consultations');
      if (data) {
        const all = JSON.parse(data);
        setAllConsultations(
          all.filter(c => c.patientId === patientId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSelectPhoto = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 5}, response => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets) {
        const photos = response.assets.map(a => a.uri);
        setPrescriptionPhotos([...prescriptionPhotos, ...photos]);
      }
    });
  };

  const handleRemovePhoto = index => {
    setPrescriptionPhotos(prescriptionPhotos.filter((_, i) => i !== index));
  };

  // Change #3: Single "Save & Mark as Complete" handler
  const handleSaveAndComplete = async () => {
    if (!clinicalNotes.trim()) {
      Alert.alert('Error', 'Please add clinical notes before saving');
      return;
    }

    Alert.alert(
      'Save Consultation',
      'This will save the notes with current date/time stamp. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Save',
          onPress: async () => {
            if (isSaving) return;
            setIsSaving(true);

            try {
              const now = new Date();
              const consultation = {
                id: 'CONSULT' + Date.now(),
                patientId,
                clinicalNotes: clinicalNotes.trim(),
                diagnosis: diagnosis.trim(),
                prescriptionPhotos,
                consultationDate: now.toLocaleDateString('en-US', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'}),
                consultationTime: now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}),
                isCompleted: true,
                completedAt: now.toISOString(),
                createdAt: now.toISOString(),
              };

              const data = await AsyncStorage.getItem('consultations');
              let consultations = data ? JSON.parse(data) : [];
              consultations.push(consultation);
              await AsyncStorage.setItem('consultations', JSON.stringify(consultations));

              // Update appointment status
              const aptsData = await AsyncStorage.getItem('appointments');
              if (aptsData) {
                const apts = JSON.parse(aptsData);
                const updated = apts.map(apt => {
                  if (apt.patientId === patientId && apt.status === 'pending') {
                    return {...apt, status: 'completed'};
                  }
                  return apt;
                });
                await AsyncStorage.setItem('appointments', JSON.stringify(updated));
              }

              Alert.alert('Saved', 'Consultation notes saved successfully!', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to save');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };

  // Quick look prescription
  const openPrescriptionPreview = photos => {
    setPreviewPhotos(photos);
    setShowPrescriptionModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Consultation Notes</Text>
        <Text style={styles.subHeaderText}>Patient ID: {patientId}</Text>

        {/* Visit History - Change #3: Show Dx, clinical notes, prescription quick look */}
        {allConsultations.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>
              Visit History ({allConsultations.length} visit{allConsultations.length !== 1 ? 's' : ''})
            </Text>
            {allConsultations.map((c, idx) => (
              <View key={c.id || idx} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {c.consultationDate}{c.consultationTime ? ` ${c.consultationTime}` : ''}
                  </Text>
                  <Text style={[styles.historyStatus, c.isCompleted ? styles.statusDone : styles.statusDraft]}>
                    {c.isCompleted ? '✓ Complete' : '○ Draft'}
                  </Text>
                </View>

                {c.diagnosis ? (
                  <View style={styles.historyField}>
                    <Text style={styles.histFieldLabel}>Dx:</Text>
                    <Text style={styles.histFieldValue}>{c.diagnosis}</Text>
                  </View>
                ) : null}

                <View style={styles.historyField}>
                  <Text style={styles.histFieldLabel}>Clinical Notes:</Text>
                  <Text style={styles.histFieldValue} numberOfLines={3}>{c.clinicalNotes}</Text>
                </View>

                {c.prescriptionPhotos && c.prescriptionPhotos.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewRxBtn}
                    onPress={() => openPrescriptionPreview(c.prescriptionPhotos)}>
                    <Text style={styles.viewRxText}>
                      📷 View Prescription ({c.prescriptionPhotos.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Clinical Notes Input */}
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

        {/* Diagnosis */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Diagnosis</Text>
          <TextInput
            style={[styles.input, styles.textAreaSmall]}
            placeholder="Provisional/Final diagnosis..."
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Prescription Photos */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prescription Photos</Text>
          <TouchableOpacity style={styles.photoUpload} onPress={handleSelectPhoto}>
            <Text style={styles.uploadIcon}>📸</Text>
            <Text style={styles.uploadText}>Tap to upload prescription</Text>
          </TouchableOpacity>

          {prescriptionPhotos.length > 0 && (
            <View style={styles.photoGrid}>
              {prescriptionPhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Text style={styles.photoPlaceholder}>📄 {index + 1}</Text>
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(index)}>
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Change #3: Single save button only */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSaveAndComplete}
          activeOpacity={0.8}
          disabled={isSaving}>
          <Text style={styles.saveButtonText}>Save & Mark as Complete</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Each consultation is saved as a separate entry with date/time stamp.
            Clinical notes, diagnosis, and prescription photos will all be recorded.
          </Text>
        </View>
      </ScrollView>

      {/* Prescription Preview Modal */}
      <Modal visible={showPrescriptionModal} animationType="slide">
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Prescription Photos</Text>
            <TouchableOpacity onPress={() => setShowPrescriptionModal(false)}>
              <Text style={styles.previewClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.previewBody}>
            {previewPhotos.map((photo, idx) => (
              <View key={idx} style={styles.previewItem}>
                <Text style={styles.previewLabel}>Photo {idx + 1}</Text>
                <Image source={{uri: photo}} style={styles.previewImage} resizeMode="contain" />
              </View>
            ))}
            {previewPhotos.length === 0 && (
              <Text style={styles.noPhotosText}>No prescription photos available</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 40},
  headerText: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5},
  subHeaderText: {fontSize: 14, color: '#666', marginBottom: 20},
  // Visit History
  historyBox: {backgroundColor: '#e8f5e9', padding: 15, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#4caf50'},
  historyTitle: {fontSize: 15, fontWeight: '700', color: '#2e7d32', marginBottom: 12},
  historyItem: {backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8},
  historyHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  historyDate: {fontSize: 12, color: '#666', fontWeight: '600'},
  historyStatus: {fontSize: 11, fontWeight: '600'},
  statusDone: {color: '#4caf50'},
  statusDraft: {color: '#ff9800'},
  historyField: {marginBottom: 6},
  histFieldLabel: {fontSize: 12, fontWeight: '700', color: '#667eea', marginBottom: 2},
  histFieldValue: {fontSize: 13, color: '#333', lineHeight: 19},
  viewRxBtn: {backgroundColor: '#e3f2fd', padding: 8, borderRadius: 8, alignItems: 'center', marginTop: 6},
  viewRxText: {fontSize: 13, color: '#1976d2', fontWeight: '600'},
  // Form
  inputGroup: {marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8},
  input: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, padding: 15, fontSize: 15, color: '#333'},
  textArea: {minHeight: 120, paddingTop: 15},
  textAreaSmall: {minHeight: 80, paddingTop: 15},
  photoUpload: {borderWidth: 2, borderStyle: 'dashed', borderColor: '#667eea', borderRadius: 15, padding: 30, alignItems: 'center', backgroundColor: '#f8f9ff'},
  uploadIcon: {fontSize: 40, marginBottom: 10},
  uploadText: {color: '#667eea', fontSize: 14, fontWeight: '600'},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15},
  photoItem: {width: 80, height: 80, borderRadius: 10, backgroundColor: '#667eea', justifyContent: 'center', alignItems: 'center', position: 'relative'},
  photoPlaceholder: {fontSize: 14, color: '#fff', fontWeight: '600'},
  removePhotoBtn: {position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center'},
  removePhotoText: {color: '#fff', fontSize: 14, fontWeight: 'bold'},
  // Save button
  saveButton: {backgroundColor: '#4caf50', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 20},
  saveButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  buttonDisabled: {opacity: 0.6},
  infoBox: {backgroundColor: '#fff3cd', borderRadius: 12, padding: 15, borderLeftWidth: 4, borderLeftColor: '#ffc107'},
  infoText: {fontSize: 13, color: '#856404', lineHeight: 20},
  // Prescription preview modal
  previewModal: {flex: 1, backgroundColor: '#f5f7fa'},
  previewHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#667eea'},
  previewTitle: {fontSize: 18, fontWeight: 'bold', color: '#fff'},
  previewClose: {color: '#fff', fontSize: 15, fontWeight: '600'},
  previewBody: {padding: 20},
  previewItem: {marginBottom: 20},
  previewLabel: {fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8},
  previewImage: {width: '100%', height: 400, borderRadius: 12, backgroundColor: '#e0e0e0'},
  noPhotosText: {textAlign: 'center', color: '#999', fontSize: 15, padding: 40},
});

export default ConsultationNotesScreen;