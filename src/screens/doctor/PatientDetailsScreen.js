import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientDetailsScreen = ({navigation, route}) => {
  const {patientId} = route.params;
  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [consultations, setConsultations] = useState({
    firstVisit: null,
    finalVisit: null,
  });
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  const loadPatientData = useCallback(async () => {
    try {
      const patientsData = await AsyncStorage.getItem('patients');
      if (patientsData) {
        const patients = JSON.parse(patientsData);
        const patientData = patients.find(p => p.regNumber === patientId);
        setPatient(patientData);
      }

      const historiesData = await AsyncStorage.getItem('medicalHistories');
      if (historiesData) {
        const histories = JSON.parse(historiesData);
        const history = histories.find(h => h.patientId === patientId);
        setMedicalHistory(history);
      }

      // Load consultations
      const consultationsData = await AsyncStorage.getItem('consultations');
      if (consultationsData) {
        const allConsultations = JSON.parse(consultationsData);
        const patientConsultations = allConsultations.filter(
          c => c.patientId === patientId,
        );

        const firstVisit = patientConsultations.find(
          c => c.consultationStage === 'First Visit',
        );
        const finalVisit = patientConsultations.find(
          c => c.consultationStage === 'Final Visit',
        );

        setConsultations({firstVisit, finalVisit});
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  const handleViewPrescription = photos => {
    setSelectedPrescription(photos);
    setShowPrescriptionModal(true);
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{patient.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration No:</Text>
            <Text style={styles.infoValue}>{patient.regNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{patient.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sex:</Text>
            <Text style={styles.infoValue}>{patient.sex}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{patient.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth:</Text>
            <Text style={styles.infoValue}>{patient.dateOfBirth}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Current Problem</Text>
          <Text style={styles.problemText}>{patient.currentProblem}</Text>
        </View>

        {medicalHistory && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👶 Birth History</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gestation Period:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.gestationPeriod || 'Not provided'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Birth Weight:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.birthWeight || 'Not provided'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivery Type:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.deliveryType}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                🚼 Motor Development Milestones
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Head Control:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.headControl || 'Not provided'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sitting:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.sitting || 'Not provided'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Walking:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.walking || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏥 Clinical Information</Text>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Known Allergies:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.allergies || 'None reported'}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Chronic Conditions:</Text>
                <Text style={styles.infoValue}>
                  {medicalHistory.chronicConditions || 'None reported'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Side-by-Side Consultation History */}
        {(consultations.firstVisit || consultations.finalVisit) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📋 Consultation History (Comparison)
            </Text>

            <View style={styles.comparisonContainer}>
              {/* First Visit Column */}
              <View style={styles.visitColumn}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitHeaderText}>First Visit</Text>
                  {consultations.firstVisit && (
                    <Text style={styles.visitDate}>
                      {consultations.firstVisit.consultationDate}
                    </Text>
                  )}
                </View>

                {consultations.firstVisit ? (
                  <>
                    <View style={styles.visitContent}>
                      <Text style={styles.visitLabel}>Clinical Notes:</Text>
                      <Text style={styles.visitText}>
                        {consultations.firstVisit.clinicalNotes}
                      </Text>
                    </View>

                    <View style={styles.visitContent}>
                      <Text style={styles.visitLabel}>Diagnosis:</Text>
                      <Text style={styles.visitText}>
                        {consultations.firstVisit.diagnosis || 'N/A'}
                      </Text>
                    </View>

                    {consultations.firstVisit.prescriptionPhotos &&
                      consultations.firstVisit.prescriptionPhotos.length >
                        0 && (
                        <TouchableOpacity
                          style={styles.prescriptionButton}
                          onPress={() =>
                            handleViewPrescription(
                              consultations.firstVisit.prescriptionPhotos,
                            )
                          }>
                          <Text style={styles.prescriptionButtonText}>
                            📄 View Prescription (
                            {consultations.firstVisit.prescriptionPhotos.length})
                          </Text>
                        </TouchableOpacity>
                      )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>Not available</Text>
                )}
              </View>

              {/* Final Visit Column */}
              <View style={styles.visitColumn}>
                <View style={[styles.visitHeader, styles.visitHeaderFinal]}>
                  <Text style={styles.visitHeaderText}>Final Visit</Text>
                  {consultations.finalVisit && (
                    <Text style={styles.visitDate}>
                      {consultations.finalVisit.consultationDate}
                    </Text>
                  )}
                </View>

                {consultations.finalVisit ? (
                  <>
                    <View style={styles.visitContent}>
                      <Text style={styles.visitLabel}>Clinical Notes:</Text>
                      <Text style={styles.visitText}>
                        {consultations.finalVisit.clinicalNotes}
                      </Text>
                    </View>

                    <View style={styles.visitContent}>
                      <Text style={styles.visitLabel}>Diagnosis:</Text>
                      <Text style={styles.visitText}>
                        {consultations.finalVisit.diagnosis || 'N/A'}
                      </Text>
                    </View>

                    {consultations.finalVisit.prescriptionPhotos &&
                      consultations.finalVisit.prescriptionPhotos.length > 0 && (
                        <TouchableOpacity
                          style={styles.prescriptionButton}
                          onPress={() =>
                            handleViewPrescription(
                              consultations.finalVisit.prescriptionPhotos,
                            )
                          }>
                          <Text style={styles.prescriptionButtonText}>
                            📄 View Prescription (
                            {consultations.finalVisit.prescriptionPhotos.length}
                            )
                          </Text>
                        </TouchableOpacity>
                      )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>Not available</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.consultButton}
          onPress={() =>
            navigation.navigate('ConsultationNotes', {patientId: patientId})
          }
          activeOpacity={0.8}>
          <Text style={styles.consultButtonText}>Add/Edit Consultation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Prescription Photo Modal */}
      <Modal
        visible={showPrescriptionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrescriptionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Prescription Photos</Text>
            <ScrollView>
              {selectedPrescription?.map((photo, index) => (
                <View key={index} style={styles.prescriptionItem}>
                  <Text style={styles.prescriptionNumber}>
                    Photo {index + 1}
                  </Text>
                  <View style={styles.prescriptionPlaceholder}>
                    <Text style={styles.prescriptionPlaceholderText}>
                      📄 Prescription Image
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPrescriptionModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoBlock: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  problemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  visitColumn: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 12,
  },
  visitHeader: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  visitHeaderFinal: {
    backgroundColor: '#4caf50',
  },
  visitHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  visitDate: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    marginTop: 3,
  },
  visitContent: {
    marginBottom: 12,
  },
  visitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  visitText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  noDataText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  prescriptionButton: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  prescriptionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  consultButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  prescriptionItem: {
    marginBottom: 20,
  },
  prescriptionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 10,
  },
  prescriptionPlaceholder: {
    backgroundColor: '#f8f9ff',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  prescriptionPlaceholderText: {
    fontSize: 16,
    color: '#667eea',
  },
  closeButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PatientDetailsScreen;