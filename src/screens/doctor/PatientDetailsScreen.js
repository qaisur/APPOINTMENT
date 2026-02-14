import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientDetailsScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadPatientData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPatientData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadPatientData = async () => {
    try {
      // Feature #10: Get current doctor for filtering
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = currentDoctorData
        ? JSON.parse(currentDoctorData)
        : null;

      // Load patient info
      const patientsData = await AsyncStorage.getItem('patients');
      if (patientsData) {
        const patients = JSON.parse(patientsData);
        const found = patients.find(p => p.regNumber === patientId);
        setPatient(found);
      }

      // Load medical history
      const historiesData = await AsyncStorage.getItem('medicalHistories');
      if (historiesData) {
        const histories = JSON.parse(historiesData);
        const patientHistory = histories.find(h => h.patientId === patientId);
        setMedicalHistory(patientHistory);
      }

      // Feature #6: Load all consultations chronologically
      const consultationsData = await AsyncStorage.getItem('consultations');
      if (consultationsData) {
        const allConsultations = JSON.parse(consultationsData);
        const patientConsultations = allConsultations
          .filter(c => c.patientId === patientId)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setConsultations(patientConsultations);
      }

      // Feature #10: Load appointments filtered by doctor
      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const allAppointments = JSON.parse(appointmentsData);
        let patientAppointments = allAppointments.filter(
          a => a.patientId === patientId,
        );
        if (currentDoctor) {
          patientAppointments = patientAppointments.filter(
            a => a.doctorId === currentDoctor.id,
          );
        }
        setAppointments(patientAppointments);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  // Feature #1: Calculate detailed age
  const getDetailedAge = () => {
    if (patient?.ageDetailed) return patient.ageDetailed;
    if (patient?.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      let months = today.getMonth() - dob.getMonth();
      let days = today.getDate() - dob.getDate();

      if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      const parts = [];
      if (years > 0) parts.push(`${years}y`);
      if (months > 0) parts.push(`${months}m`);
      if (days > 0) parts.push(`${days}d`);
      return parts.join(' ') || '0 days';
    }
    return patient?.age ? `${patient.age} years` : 'N/A';
  };

  // Feature #6: Get visit label
  const getVisitLabel = consultation => {
    if (consultation.consultationStage === 'Follow-up Visit') {
      return `Follow-up Visit #${consultation.visitNumber || ''}`;
    }
    return consultation.consultationStage;
  };

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Info Card */}
        <View style={styles.patientCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {patient.fullName?.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
          <Text style={styles.patientName}>{patient.fullName}</Text>
          <Text style={styles.regText}>{patient.regNumber}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              {/* Feature #1: Detailed age */}
              <Text style={styles.infoValue}>{getDetailedAge()}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Sex</Text>
              <Text style={styles.infoValue}>{patient.sex}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DOB</Text>
              <Text style={styles.infoValue}>{patient.dateOfBirth}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{patient.phone}</Text>
            </View>
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
              {medicalHistory.gestationPeriod && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Gestation</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.gestationPeriod}
                  </Text>
                </View>
              )}
              {medicalHistory.birthWeight && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Birth Weight</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.birthWeight}
                  </Text>
                </View>
              )}
              {medicalHistory.deliveryType && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Delivery</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.deliveryType}
                  </Text>
                </View>
              )}
              {medicalHistory.headControl && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Head Control</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.headControl}
                  </Text>
                </View>
              )}
              {medicalHistory.sitting && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Sitting</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.sitting}
                  </Text>
                </View>
              )}
              {medicalHistory.walking && (
                <View style={styles.historyItem}>
                  <Text style={styles.historyLabel}>Walking</Text>
                  <Text style={styles.historyValue}>
                    {medicalHistory.walking}
                  </Text>
                </View>
              )}
            </View>

            {medicalHistory.allergies && (
              <View style={styles.textSection}>
                <Text style={styles.textLabel}>Allergies</Text>
                <Text style={styles.textValue}>{medicalHistory.allergies}</Text>
              </View>
            )}
            {medicalHistory.chronicConditions && (
              <View style={styles.textSection}>
                <Text style={styles.textLabel}>Chronic Conditions</Text>
                <Text style={styles.textValue}>
                  {medicalHistory.chronicConditions}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Feature #6: Chronological Consultation History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Consultation History ({consultations.length})
          </Text>

          {consultations.length > 0 ? (
            consultations.map((c, idx) => (
              <View key={c.id || idx} style={styles.consultationCard}>
                <View style={styles.consultationHeader}>
                  <View style={styles.consultationTypeRow}>
                    <View
                      style={[
                        styles.visitTypeBadge,
                        c.consultationStage === 'First Visit' &&
                          styles.badgeFirst,
                        c.consultationStage === 'Follow-up Visit' &&
                          styles.badgeFollowup,
                        c.consultationStage === 'Final Visit' &&
                          styles.badgeFinal,
                      ]}>
                      <Text style={styles.visitTypeBadgeText}>
                        {getVisitLabel(c)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.completionBadge,
                        c.isCompleted
                          ? styles.completionDone
                          : styles.completionDraft,
                      ]}>
                      {c.isCompleted ? '✓ Complete' : '○ Draft'}
                    </Text>
                  </View>
                  <Text style={styles.consultationDate}>
                    {c.consultationDate}
                    {c.consultationTime ? ` at ${c.consultationTime}` : ''}
                  </Text>
                </View>

                <View style={styles.consultationBody}>
                  <Text style={styles.notesLabel}>Clinical Notes:</Text>
                  <Text style={styles.notesText}>{c.clinicalNotes}</Text>

                  {c.diagnosis ? (
                    <>
                      <Text style={styles.notesLabel}>Diagnosis:</Text>
                      <Text style={styles.notesText}>{c.diagnosis}</Text>
                    </>
                  ) : null}

                  {c.prescriptionPhotos && c.prescriptionPhotos.length > 0 && (
                    <Text style={styles.photoCount}>
                      📷 {c.prescriptionPhotos.length} prescription photo(s)
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyConsultation}>
              <Text style={styles.emptyText}>No consultation records yet</Text>
            </View>
          )}
        </View>

        {/* Appointments */}
        {appointments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointments</Text>
            {appointments.map(apt => (
              <View key={apt.id} style={styles.appointmentItem}>
                <Text style={styles.appointmentDate}>
                  {apt.appointmentDate} at {apt.appointmentTime}
                </Text>
                <Text style={styles.appointmentHospital}>
                  {apt.hospitalName}
                </Text>
                <Text
                  style={[
                    styles.appointmentStatus,
                    apt.status === 'completed' && {color: '#4caf50'},
                    apt.status === 'cancelled' && {color: '#dc3545'},
                    apt.status === 'pending' && {color: '#ff9800'},
                  ]}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('ConsultationNotes', {patientId: patientId})
          }
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Add Consultation Notes</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  // Patient Card
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  regText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 8,
  },
  infoItem: {
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    padding: 10,
    width: '48%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  problemBox: {
    width: '100%',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  problemLabel: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  problemText: {
    fontSize: 14,
    color: '#856404',
  },
  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  // Medical History
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  historyItem: {
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    padding: 10,
    width: '48%',
  },
  historyLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 3,
  },
  historyValue: {
    fontSize: 14,
    color: '#333',
  },
  textSection: {
    marginTop: 8,
  },
  textLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  textValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // Feature #6: Consultation cards
  consultationCard: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  consultationHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  consultationTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitTypeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  badgeFirst: {
    backgroundColor: '#e3f2fd',
  },
  badgeFollowup: {
    backgroundColor: '#fff3e0',
  },
  badgeFinal: {
    backgroundColor: '#fce4ec',
  },
  visitTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  completionBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  completionDone: {
    color: '#4caf50',
  },
  completionDraft: {
    color: '#ff9800',
  },
  consultationDate: {
    fontSize: 12,
    color: '#666',
  },
  consultationBody: {
    padding: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  emptyConsultation: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  // Appointments
  appointmentItem: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  appointmentHospital: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  // Buttons
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PatientDetailsScreen;