import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  SafeAreaView, Modal, Image, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ConsultationNotesScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionPhotos, setPrescriptionPhotos] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // #1: Prescription preview modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => { loadExistingConsultations(); }, []);

  const loadExistingConsultations = async () => {
    try {
      const data = await AsyncStorage.getItem('consultations');
      if (data) {
        const all = JSON.parse(data);
        setAllConsultations(
          all.filter(c => c.patientId === patientId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // #4: Compress photo - use lower quality and max dimensions
  const handleSelectPhoto = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.6, // #4: Compressed but readable
      maxWidth: 1200, // #4: Good resolution for text/handwriting
      maxHeight: 1600,
      selectionLimit: 5,
    }, response => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets) {
        const photos = response.assets.map(a => ({
          uri: a.uri,
          width: a.width,
          height: a.height,
          fileSize: a.fileSize,
          fileName: a.fileName,
        }));
        setPrescriptionPhotos([...prescriptionPhotos, ...photos]);
      }
    });
  };

  const handleRemovePhoto = index => {
    setPrescriptionPhotos(prescriptionPhotos.filter((_, i) => i !== index));
  };

  // #3: Clinical notes now optional
  const handleSaveAndComplete = async () => {
    // #3: No mandatory field check - all optional
    if (!clinicalNotes.trim() && !diagnosis.trim() && prescriptionPhotos.length === 0) {
      Alert.alert('Empty', 'Please add at least some notes, diagnosis, or a prescription photo.');
      return;
    }

    Alert.alert('Save Consultation', 'Save notes with current date/time stamp?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Save',
        onPress: async () => {
          if (isSaving) return;
          setIsSaving(true);
          try {
            const now = new Date();
            // #1: Store full photo objects (not just URI string) for proper display
            const photoData = prescriptionPhotos.map(p =>
              typeof p === 'string' ? {uri: p} : p,
            );

            const consultation = {
              id: 'CONSULT' + Date.now(),
              patientId,
              clinicalNotes: clinicalNotes.trim(),
              diagnosis: diagnosis.trim(),
              prescriptionPhotos: photoData,
              consultationDate: now.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              }),
              consultationTime: now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit',
              }),
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

            Alert.alert('Saved', 'Consultation notes saved!', [
              {text: 'OK', onPress: () => navigation.goBack()},
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to save');
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  };

  // #1: Fix prescription preview - handle both string URIs and photo objects
  const openPrescriptionPreview = photos => {
    const normalized = photos.map(p => {
      if (typeof p === 'string') return {uri: p};
      if (p.uri) return p;
      return {uri: ''};
    }).filter(p => p.uri);
    setPreviewPhotos(normalized);
    setCurrentPhotoIndex(0);
    setShowPrescriptionModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Consultation Notes</Text>
        <Text style={styles.subHeaderText}>Patient ID: {patientId}</Text>

        {/* #2: Input fields ABOVE visit history */}
        <View style={styles.inputSection}>
          {/* Clinical Notes - #3: Optional */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clinical Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Patient presents with..."
              value={clinicalNotes}
              onChangeText={setClinicalNotes}
              multiline numberOfLines={6} textAlignVertical="top"
            />
          </View>

          {/* Diagnosis */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diagnosis <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              placeholder="Provisional/Final diagnosis..."
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>

          {/* Prescription Photos - #4: compressed */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prescription Photos <Text style={styles.optional}>(optional)</Text></Text>
            <TouchableOpacity style={styles.photoUpload} onPress={handleSelectPhoto}>
              <Text style={styles.uploadIcon}>📸</Text>
              <Text style={styles.uploadText}>Tap to upload prescription</Text>
              <Text style={styles.uploadHint}>Auto-compressed for optimal size & readability</Text>
            </TouchableOpacity>

            {prescriptionPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {prescriptionPhotos.map((photo, index) => {
                  const uri = typeof photo === 'string' ? photo : photo.uri;
                  return (
                    <View key={index} style={styles.photoItem}>
                      {uri ? (
                        <Image source={{uri}} style={styles.photoThumb} />
                      ) : (
                        <Text style={styles.photoPlaceholder}>📄 {index + 1}</Text>
                      )}
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(index)}>
                        <Text style={styles.removePhotoText}>✕</Text>
                      </TouchableOpacity>
                      {photo.fileSize && (
                        <Text style={styles.photoSize}>
                          {(photo.fileSize / 1024).toFixed(0)}KB
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveAndComplete}
            activeOpacity={0.8} disabled={isSaving}>
            <Text style={styles.saveButtonText}>Save & Mark as Complete</Text>
          </TouchableOpacity>
        </View>

        {/* Visit History - #2: Now BELOW input fields */}
        {allConsultations.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>
              Visit History ({allConsultations.length})
            </Text>
            {allConsultations.map((c, idx) => (
              <View key={c.id || idx} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {c.consultationDate} {c.consultationTime || ''}
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

                {c.clinicalNotes ? (
                  <View style={styles.historyField}>
                    <Text style={styles.histFieldLabel}>Clinical Notes:</Text>
                    <Text style={styles.histFieldValue} numberOfLines={3}>{c.clinicalNotes}</Text>
                  </View>
                ) : null}

                {/* #1: Fixed prescription view */}
                {c.prescriptionPhotos && c.prescriptionPhotos.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewRxBtn}
                    onPress={() => openPrescriptionPreview(c.prescriptionPhotos)}>
                    <Text style={styles.viewRxText}>
                      📷 View Prescription ({c.prescriptionPhotos.length} photo{c.prescriptionPhotos.length > 1 ? 's' : ''})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            All fields are optional. Fill what's available and save.
            Each consultation is saved with a date/time stamp.
          </Text>
        </View>
      </ScrollView>

      {/* #1: Fixed Prescription Preview Modal */}
      <Modal visible={showPrescriptionModal} animationType="slide">
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              Prescription {currentPhotoIndex + 1}/{previewPhotos.length}
            </Text>
            <TouchableOpacity onPress={() => setShowPrescriptionModal(false)}>
              <Text style={styles.previewClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.previewBody}>
            {previewPhotos.length > 0 ? (
              previewPhotos.map((photo, idx) => (
                <View key={idx} style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Photo {idx + 1}</Text>
                  <Image
                    source={{uri: photo.uri}}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              ))
            ) : (
              <View style={styles.noPhotoBox}>
                <Text style={styles.noPhotoText}>No prescription photos available</Text>
                <Text style={styles.noPhotoHint}>Photos may have been deleted or are unavailable</Text>
              </View>
            )}
          </ScrollView>

          {/* Navigation buttons */}
          {previewPhotos.length > 1 && (
            <View style={styles.previewNav}>
              <TouchableOpacity
                style={[styles.navBtn, currentPhotoIndex === 0 && styles.navBtnDisabled]}
                disabled={currentPhotoIndex === 0}
                onPress={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}>
                <Text style={styles.navBtnText}>← Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, currentPhotoIndex >= previewPhotos.length - 1 && styles.navBtnDisabled]}
                disabled={currentPhotoIndex >= previewPhotos.length - 1}
                onPress={() => setCurrentPhotoIndex(Math.min(previewPhotos.length - 1, currentPhotoIndex + 1))}>
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
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
  // #2: Input section
  inputSection: {marginBottom: 20},
  inputGroup: {marginBottom: 18},
  label: {fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8},
  optional: {fontSize: 12, color: '#999', fontWeight: '400'},
  input: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, padding: 15, fontSize: 15, color: '#333'},
  textArea: {minHeight: 120, paddingTop: 15},
  textAreaSmall: {minHeight: 80, paddingTop: 15},
  // Photo upload
  photoUpload: {borderWidth: 2, borderStyle: 'dashed', borderColor: '#667eea', borderRadius: 15, padding: 25, alignItems: 'center', backgroundColor: '#f8f9ff'},
  uploadIcon: {fontSize: 36, marginBottom: 8},
  uploadText: {color: '#667eea', fontSize: 14, fontWeight: '600'},
  uploadHint: {color: '#999', fontSize: 11, marginTop: 4},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12},
  photoItem: {width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: '#e0e0e0'},
  photoThumb: {width: 80, height: 80, borderRadius: 10},
  photoPlaceholder: {width: 80, height: 80, textAlign: 'center', textAlignVertical: 'center', fontSize: 14, color: '#666'},
  removePhotoBtn: {position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center'},
  removePhotoText: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
  photoSize: {position: 'absolute', bottom: 2, left: 2, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4},
  // Save
  saveButton: {backgroundColor: '#4caf50', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 5},
  saveButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  buttonDisabled: {opacity: 0.6},
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
  viewRxBtn: {backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 6},
  viewRxText: {fontSize: 13, color: '#1976d2', fontWeight: '600'},
  infoBox: {backgroundColor: '#fff3cd', borderRadius: 12, padding: 15, borderLeftWidth: 4, borderLeftColor: '#ffc107'},
  infoText: {fontSize: 13, color: '#856404', lineHeight: 20},
  // #1: Prescription preview modal
  previewModal: {flex: 1, backgroundColor: '#000'},
  previewHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a'},
  previewTitle: {fontSize: 18, fontWeight: 'bold', color: '#fff'},
  previewClose: {color: '#fff', fontSize: 15, fontWeight: '600', padding: 5},
  previewBody: {padding: 10, paddingBottom: 40},
  previewItem: {marginBottom: 20},
  previewLabel: {fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8},
  previewImage: {width: SCREEN_WIDTH - 20, height: SCREEN_WIDTH * 1.4, borderRadius: 8, backgroundColor: '#333'},
  noPhotoBox: {padding: 60, alignItems: 'center'},
  noPhotoText: {fontSize: 16, color: '#fff', marginBottom: 8},
  noPhotoHint: {fontSize: 13, color: '#999'},
  previewNav: {flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#1a1a1a'},
  navBtn: {backgroundColor: '#667eea', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8},
  navBtnDisabled: {opacity: 0.4},
  navBtnText: {color: '#fff', fontWeight: '600', fontSize: 14},
});

export default ConsultationNotesScreen;