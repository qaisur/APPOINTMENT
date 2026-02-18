import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, Image, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const INITIAL_SHOW_COUNT = 3; // #5: Show last 3 initially

const PatientDetailsScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // #5: Show more state
  const [showAllConsultations, setShowAllConsultations] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);

  // #1: Prescription preview
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxPhotos, setRxPhotos] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { loadPatientData(); });
    return unsubscribe;
  }, [navigation]);

  const loadPatientData = async () => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = currentDoctorData ? JSON.parse(currentDoctorData) : null;

      const patientsData = await AsyncStorage.getItem('patients');
      if (patientsData) {
        setPatient(JSON.parse(patientsData).find(p => p.regNumber === patientId));
      }

      const historiesData = await AsyncStorage.getItem('medicalHistories');
      if (historiesData) {
        setMedicalHistory(JSON.parse(historiesData).find(h => h.patientId === patientId));
      }

      const consultationsData = await AsyncStorage.getItem('consultations');
      if (consultationsData) {
        setConsultations(
          JSON.parse(consultationsData)
            .filter(c => c.patientId === patientId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
      }

      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        let all = JSON.parse(appointmentsData).filter(a => a.patientId === patientId);
        if (currentDoctor) all = all.filter(a => a.doctorId === currentDoctor.id);
        setAppointments(all.sort((a, b) => new Date(b.bookedAt || 0) - new Date(a.bookedAt || 0)));
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const getDetailedAge = () => {
    if (patient?.ageDetailed) return patient.ageDetailed;
    if (patient?.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      let months = today.getMonth() - dob.getMonth();
      let days = today.getDate() - dob.getDate();
      if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
      if (months < 0) { years--; months += 12; }
      const parts = [];
      if (years > 0) parts.push(`${years}y`);
      if (months > 0) parts.push(`${months}m`);
      if (days > 0) parts.push(`${days}d`);
      return parts.join(' ') || '0 days';
    }
    return patient?.age ? `${patient.age} years` : 'N/A';
  };

  // #1: Open prescription preview
  const openRxPreview = photos => {
    const normalized = photos.map(p => {
      if (typeof p === 'string') return {uri: p};
      if (p?.uri) return p;
      return null;
    }).filter(Boolean);
    setRxPhotos(normalized);
    setShowRxModal(true);
  };

  // #5: Sliced lists
  const visibleConsultations = showAllConsultations ? consultations : consultations.slice(0, INITIAL_SHOW_COUNT);
  const visibleAppointments = showAllAppointments ? appointments : appointments.slice(0, INITIAL_SHOW_COUNT);

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Loading patient data...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Info Card */}
        <View style={styles.patientCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{patient.fullName?.charAt(0)?.toUpperCase() || 'P'}</Text>
          </View>
          <Text style={styles.patientName}>{patient.fullName}</Text>
          <Text style={styles.regText}>{patient.regNumber}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Age</Text><Text style={styles.infoValue}>{getDetailedAge()}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Sex</Text><Text style={styles.infoValue}>{patient.sex}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>DOB</Text><Text style={styles.infoValue}>{patient.dateOfBirth}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{patient.phone}</Text></View>
          </View>

          {patient.currentProblem && (
            <View style={styles.problemBox}>
              <Text style={styles.problemLabel}>Current Problem</Text>
              <Text style={styles.problemText}>{patient.currentProblem}</Text>
            </View>
          )}
        </View>

        {/* Medical History */}
        {medicalHistory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical History</Text>
            <View style={styles.historyGrid}>
              {medicalHistory.gestationPeriod && <View style={styles.histItem}><Text style={styles.histLabel}>Gestation</Text><Text style={styles.histValue}>{medicalHistory.gestationPeriod}</Text></View>}
              {medicalHistory.birthWeight && <View style={styles.histItem}><Text style={styles.histLabel}>Birth Weight</Text><Text style={styles.histValue}>{medicalHistory.birthWeight}</Text></View>}
              {medicalHistory.deliveryType && <View style={styles.histItem}><Text style={styles.histLabel}>Delivery</Text><Text style={styles.histValue}>{medicalHistory.deliveryType}</Text></View>}
              {medicalHistory.headControl && <View style={styles.histItem}><Text style={styles.histLabel}>Head Control</Text><Text style={styles.histValue}>{medicalHistory.headControl}</Text></View>}
              {medicalHistory.sitting && <View style={styles.histItem}><Text style={styles.histLabel}>Sitting</Text><Text style={styles.histValue}>{medicalHistory.sitting}</Text></View>}
              {medicalHistory.walking && <View style={styles.histItem}><Text style={styles.histLabel}>Walking</Text><Text style={styles.histValue}>{medicalHistory.walking}</Text></View>}
            </View>
            {medicalHistory.allergies && <><Text style={styles.textLabel}>Allergies</Text><Text style={styles.textValue}>{medicalHistory.allergies}</Text></>}
            {medicalHistory.chronicConditions && <><Text style={styles.textLabel}>Chronic Conditions</Text><Text style={styles.textValue}>{medicalHistory.chronicConditions}</Text></>}
          </View>
        )}

        {/* #2: Add Consultation Notes - between info and history */}
        <TouchableOpacity
          style={styles.addNotesButton}
          onPress={() => navigation.navigate('ConsultationNotes', {patientId})}
          activeOpacity={0.8}>
          <Text style={styles.addNotesIcon}>📝</Text>
          <Text style={styles.addNotesText}>Add Consultation Notes</Text>
        </TouchableOpacity>

        {/* Consultation History - #5: show last 3, rest scrollable */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation History ({consultations.length})</Text>
          {visibleConsultations.length > 0 ? (
            <>
              {visibleConsultations.map((c, idx) => (
                <View key={c.id || idx} style={styles.consultCard}>
                  <View style={styles.consultHeader}>
                    <Text style={styles.consultDate}>{c.consultationDate} {c.consultationTime || ''}</Text>
                    <Text style={[styles.consultStatus, c.isCompleted ? styles.statusDone : styles.statusDraft]}>
                      {c.isCompleted ? '✓ Complete' : '○ Draft'}
                    </Text>
                  </View>
                  {c.diagnosis ? <View style={styles.consultField}><Text style={styles.fieldLabel}>Dx:</Text><Text style={styles.fieldValue}>{c.diagnosis}</Text></View> : null}
                  {c.clinicalNotes ? <View style={styles.consultField}><Text style={styles.fieldLabel}>Notes:</Text><Text style={styles.fieldValue} numberOfLines={3}>{c.clinicalNotes}</Text></View> : null}
                  {/* #1: Fixed prescription button */}
                  {c.prescriptionPhotos && c.prescriptionPhotos.length > 0 && (
                    <TouchableOpacity style={styles.rxBtn} onPress={() => openRxPreview(c.prescriptionPhotos)}>
                      <Text style={styles.rxBtnText}>📷 View Prescription ({c.prescriptionPhotos.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {/* #5: Show more button */}
              {consultations.length > INITIAL_SHOW_COUNT && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllConsultations(!showAllConsultations)}>
                  <Text style={styles.showMoreText}>
                    {showAllConsultations ? '▲ Show Less' : `▼ Show All ${consultations.length} Consultations`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No consultation records yet</Text></View>
          )}
        </View>

        {/* Appointments - #5: show last 3, rest scrollable */}
        {appointments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointments ({appointments.length})</Text>
            {visibleAppointments.map(apt => (
              <View key={apt.id} style={[styles.aptItem,
                apt.status === 'missed' && styles.aptMissed,
                apt.status === 'void' && styles.aptVoid,
              ]}>
                <Text style={styles.aptDate}>{apt.appointmentDate} at {apt.appointmentTime}</Text>
                <Text style={styles.aptHospital}>{apt.hospitalName}</Text>
                <Text style={[styles.aptStatus,
                  apt.status === 'completed' && {color: '#4caf50'},
                  apt.status === 'cancelled' && {color: '#dc3545'},
                  apt.status === 'pending' && {color: '#ff9800'},
                  apt.status === 'missed' && {color: '#dc3545'},
                  apt.status === 'void' && {color: '#999'},
                ]}>{(apt.status || 'pending').charAt(0).toUpperCase() + (apt.status || 'pending').slice(1)}</Text>
                {apt.status === 'missed' && <Text style={styles.missedMsg}>⚠️ This appointment was missed</Text>}
                {apt.status === 'void' && <Text style={styles.voidMsg}>This appointment was voided (no consultation recorded)</Text>}
              </View>
            ))}
            {appointments.length > INITIAL_SHOW_COUNT && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllAppointments(!showAllAppointments)}>
                <Text style={styles.showMoreText}>
                  {showAllAppointments ? '▲ Show Less' : `▼ Show All ${appointments.length} Appointments`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* #1: Prescription Preview Modal */}
      <Modal visible={showRxModal} animationType="slide">
        <SafeAreaView style={styles.rxModal}>
          <View style={styles.rxModalHeader}>
            <Text style={styles.rxModalTitle}>Prescription Photos ({rxPhotos.length})</Text>
            <TouchableOpacity onPress={() => setShowRxModal(false)}>
              <Text style={styles.rxModalClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.rxModalBody}>
            {rxPhotos.length > 0 ? rxPhotos.map((photo, idx) => (
              <View key={idx} style={styles.rxPhotoItem}>
                <Text style={styles.rxPhotoLabel}>Photo {idx + 1}</Text>
                <Image source={{uri: photo.uri}} style={styles.rxPhotoImage} resizeMode="contain" />
              </View>
            )) : (
              <View style={styles.noRxBox}><Text style={styles.noRxText}>No photos available</Text></View>
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
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {fontSize: 16, color: '#666'},
  // Patient Card
  patientCard: {backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4},
  avatarCircle: {width: 70, height: 70, borderRadius: 35, backgroundColor: '#667eea', justifyContent: 'center', alignItems: 'center', marginBottom: 12},
  avatarText: {fontSize: 30, fontWeight: 'bold', color: '#fff'},
  patientName: {fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4},
  regText: {fontSize: 14, color: '#667eea', fontWeight: '600', marginBottom: 15},
  infoGrid: {flexDirection: 'row', flexWrap: 'wrap', width: '100%', gap: 8},
  infoItem: {backgroundColor: '#f8f9ff', borderRadius: 8, padding: 10, width: '48%'},
  infoLabel: {fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 3},
  infoValue: {fontSize: 14, color: '#333', fontWeight: '600'},
  problemBox: {width: '100%', backgroundColor: '#fff3cd', borderRadius: 8, padding: 12, marginTop: 12},
  problemLabel: {fontSize: 11, color: '#856404', fontWeight: '600', marginBottom: 4},
  problemText: {fontSize: 14, color: '#856404'},
  // Add Notes button
  addNotesButton: {backgroundColor: '#667eea', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, elevation: 4, shadowColor: '#667eea', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8},
  addNotesIcon: {fontSize: 22, marginRight: 10},
  addNotesText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  // Sections
  section: {backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 15},
  sectionTitle: {fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15},
  historyGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10},
  histItem: {backgroundColor: '#f8f9ff', borderRadius: 8, padding: 10, width: '48%'},
  histLabel: {fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 3},
  histValue: {fontSize: 14, color: '#333'},
  textLabel: {fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4, marginTop: 8},
  textValue: {fontSize: 14, color: '#333', lineHeight: 20},
  // Consultation cards
  consultCard: {backgroundColor: '#f8f9ff', borderRadius: 12, marginBottom: 10, padding: 14},
  consultHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  consultDate: {fontSize: 12, color: '#666', fontWeight: '600'},
  consultStatus: {fontSize: 11, fontWeight: '600'},
  statusDone: {color: '#4caf50'},
  statusDraft: {color: '#ff9800'},
  consultField: {marginBottom: 6},
  fieldLabel: {fontSize: 12, fontWeight: '700', color: '#667eea', marginBottom: 2},
  fieldValue: {fontSize: 13, color: '#333', lineHeight: 19},
  rxBtn: {backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 6},
  rxBtnText: {fontSize: 13, color: '#1976d2', fontWeight: '600'},
  // #5: Show more
  showMoreBtn: {padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e0e0e0', marginTop: 5},
  showMoreText: {color: '#667eea', fontWeight: '600', fontSize: 14},
  // Appointments
  aptItem: {backgroundColor: '#f8f9ff', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#667eea'},
  aptMissed: {borderLeftColor: '#dc3545', backgroundColor: '#fff5f5'},
  aptVoid: {borderLeftColor: '#999', backgroundColor: '#f9f9f9'},
  aptDate: {fontSize: 14, fontWeight: '600', color: '#333'},
  aptHospital: {fontSize: 13, color: '#666', marginTop: 3},
  aptStatus: {fontSize: 12, fontWeight: '600', marginTop: 5},
  missedMsg: {fontSize: 12, color: '#dc3545', marginTop: 5, fontStyle: 'italic'},
  voidMsg: {fontSize: 12, color: '#999', marginTop: 5, fontStyle: 'italic'},
  emptyBox: {padding: 20, alignItems: 'center'},
  emptyText: {fontSize: 14, color: '#999'},
  // Rx Modal
  rxModal: {flex: 1, backgroundColor: '#000'},
  rxModalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a'},
  rxModalTitle: {fontSize: 18, fontWeight: 'bold', color: '#fff'},
  rxModalClose: {color: '#fff', fontSize: 15, fontWeight: '600', padding: 5},
  rxModalBody: {padding: 10, paddingBottom: 40},
  rxPhotoItem: {marginBottom: 20},
  rxPhotoLabel: {fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8},
  rxPhotoImage: {width: SCREEN_WIDTH - 20, height: SCREEN_WIDTH * 1.4, borderRadius: 8, backgroundColor: '#333'},
  noRxBox: {padding: 60, alignItems: 'center'},
  noRxText: {fontSize: 16, color: '#fff'},
});

export default PatientDetailsScreen;