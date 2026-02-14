import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientDashboardScreen = ({navigation}) => {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  // Feature #9: Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      if (currentPatientData) {
        const patientData = JSON.parse(currentPatientData);
        setPatient(patientData);

        const appointmentsData = await AsyncStorage.getItem('appointments');
        if (appointmentsData) {
          const allAppointments = JSON.parse(appointmentsData);
          const patientAppointments = allAppointments.filter(
            apt => apt.patientId === patientData.regNumber,
          );
          setAppointments(patientAppointments);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getStatusStyle = status => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'completed':
        return styles.statusComplete;
      case 'in-progress':
        return styles.statusInProgress;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  // Feature #3: Cancel appointment
  const handleCancelAppointment = appointmentId => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const appointmentsData = await AsyncStorage.getItem(
                'appointments',
              );
              if (appointmentsData) {
                const allAppointments = JSON.parse(appointmentsData);
                const updated = allAppointments.map(apt => {
                  if (apt.id === appointmentId) {
                    return {...apt, status: 'cancelled'};
                  }
                  return apt;
                });
                await AsyncStorage.setItem(
                  'appointments',
                  JSON.stringify(updated),
                );
                loadData();
                Alert.alert(
                  'Cancelled',
                  'Your appointment has been cancelled. You can book a new one.',
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ],
    );
  };

  // Feature #9: Patient password reset
  const handlePasswordReset = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (currentPassword !== patient.password) {
      Alert.alert('Error', 'Current password is incorrect');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 4 || newPassword.length > 6) {
      Alert.alert('Error', 'Password must be 4-6 characters');
      return;
    }

    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(newPassword)) {
      Alert.alert('Error', 'Password must be alphanumeric (letters and numbers only)');
      return;
    }

    try {
      const patientsData = await AsyncStorage.getItem('patients');
      if (patientsData) {
        const patients = JSON.parse(patientsData);
        const updatedPatients = patients.map(p => {
          if (p.regNumber === patient.regNumber) {
            return {...p, password: newPassword};
          }
          return p;
        });
        await AsyncStorage.setItem('patients', JSON.stringify(updatedPatients));

        // Update current patient session
        const updatedPatient = {...patient, password: newPassword};
        await AsyncStorage.setItem(
          'currentPatient',
          JSON.stringify(updatedPatient),
        );
        setPatient(updatedPatient);

        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        Alert.alert('Success', 'Your password has been updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update password');
    }
  };

  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'pending',
  );
  const pastAppointments = appointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled',
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.patientName}>
            {patient?.fullName || 'Patient'}
          </Text>
          <Text style={styles.regNumber}>{patient?.regNumber}</Text>
          {/* Feature #1: Show detailed age if available */}
          {patient?.ageDetailed && (
            <Text style={styles.ageDetailText}>
              Age: {patient.ageDetailed}
            </Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ScheduleSelection')}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionText}>Book Appointment</Text>
          </TouchableOpacity>

          {/* Feature #9: Password reset button */}
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.quickActionIcon}>🔑</Text>
            <Text style={styles.quickActionText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map(apt => (
            <View key={apt.id} style={styles.appointmentCard}>
              <Text style={styles.doctorName}>
                {apt.doctorName || 'Doctor'}
              </Text>
              <Text style={styles.appointmentInfo}>
                {apt.hospitalName}
              </Text>
              <Text style={styles.appointmentInfo}>
                {apt.appointmentDate} at {apt.appointmentTime}
              </Text>
              <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                <Text style={styles.statusText}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Text>
              </View>
              {/* Feature #3: Cancel & Reschedule buttons */}
              <View style={styles.appointmentActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancelAppointment(apt.id)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rescheduleBtn}
                  onPress={() => {
                    handleCancelAppointment(apt.id);
                    // After cancel, user can book new from ScheduleSelection
                  }}>
                  <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => navigation.navigate('ScheduleSelection')}>
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {pastAppointments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Appointments</Text>
            {pastAppointments.map(apt => (
              <View key={apt.id} style={styles.appointmentCard}>
                <Text style={styles.doctorName}>
                  {apt.doctorName || 'Doctor'}
                </Text>
                <Text style={styles.appointmentInfo}>
                  {apt.hospitalName}
                </Text>
                <Text style={styles.appointmentInfo}>
                  {apt.appointmentDate} at {apt.appointmentTime}
                </Text>
                <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                  <Text style={styles.statusText}>
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Feature #9: Password Reset Modal */}
        <Modal visible={showPasswordModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Password</Text>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Current Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  maxLength={6}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>
                  New Password (4-6 chars, alphanumeric)
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  maxLength={6}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handlePasswordReset}>
                <Text style={styles.modalSaveBtnText}>Update Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem('currentPatient');
            navigation.replace('Welcome');
          }}>
          <Text style={styles.logoutButtonText}>Logout</Text>
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
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  patientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  regNumber: {
    fontSize: 14,
    color: '#667eea',
    marginTop: 5,
  },
  ageDetailText: {
    fontSize: 13,
    color: '#4caf50',
    marginTop: 3,
    fontWeight: '600',
  },
  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  appointmentCard: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  doctorName: {
    fontWeight: '700',
    color: '#333',
    fontSize: 16,
    marginBottom: 5,
  },
  appointmentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusComplete: {
    backgroundColor: '#d4edda',
  },
  statusInProgress: {
    backgroundColor: '#d1ecf1',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  // Feature #3: Appointment action buttons
  appointmentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dc3545',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 13,
  },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescheduleBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 15,
  },
  bookButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Feature #9: Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '88%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f5f7fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  modalSaveBtn: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  modalSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    padding: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#666',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PatientDashboardScreen;