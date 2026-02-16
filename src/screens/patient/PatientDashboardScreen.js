import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal, TextInput, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientDashboardScreen = ({navigation}) => {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  // Password reset
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Change #4: Doctor profile banner
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { loadData(); });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      if (currentPatientData) {
        const patientData = JSON.parse(currentPatientData);
        setPatient(patientData);
        const aptsData = await AsyncStorage.getItem('appointments');
        if (aptsData) {
          const all = JSON.parse(aptsData);
          setAppointments(all.filter(apt => apt.patientId === patientData.regNumber));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getStatusStyle = status => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'completed': return styles.statusComplete;
      case 'cancelled': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };

  const handleCancelAppointment = appointmentId => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            const data = await AsyncStorage.getItem('appointments');
            if (data) {
              const all = JSON.parse(data);
              const updated = all.map(a => a.id === appointmentId ? {...a, status: 'cancelled'} : a);
              await AsyncStorage.setItem('appointments', JSON.stringify(updated));
              loadData();
              Alert.alert('Cancelled', 'Appointment cancelled.');
            }
          } catch (e) { Alert.alert('Error', 'Failed to cancel'); }
        },
      },
    ]);
  };

  // Change #4: Load and show doctor profile
  const handleDoctorTap = async doctorId => {
    try {
      const doctorsData = await AsyncStorage.getItem('doctors');
      if (doctorsData) {
        const doctors = JSON.parse(doctorsData);
        const doc = doctors.find(d => d.id === doctorId);
        if (doc) {
          setSelectedDoctorProfile(doc);
          setShowDoctorProfile(true);
        } else {
          Alert.alert('Info', 'Doctor profile not available');
        }
      }
    } catch (e) {
      console.error('Error loading doctor:', e);
    }
  };

  // Password reset
  const handlePasswordReset = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (currentPassword !== patient.password) { Alert.alert('Error', 'Current password is incorrect'); return; }
    if (newPassword !== confirmNewPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPassword.length < 4 || newPassword.length > 6 || !/^[a-zA-Z0-9]+$/.test(newPassword)) {
      Alert.alert('Error', 'Password must be 4-6 alphanumeric characters'); return;
    }
    try {
      const data = await AsyncStorage.getItem('patients');
      if (data) {
        const patients = JSON.parse(data);
        const updated = patients.map(p => p.regNumber === patient.regNumber ? {...p, password: newPassword} : p);
        await AsyncStorage.setItem('patients', JSON.stringify(updated));
        const updatedPatient = {...patient, password: newPassword};
        await AsyncStorage.setItem('currentPatient', JSON.stringify(updatedPatient));
        setPatient(updatedPatient);
        setShowPasswordModal(false);
        setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
        Alert.alert('Success', 'Password updated!');
      }
    } catch (e) { Alert.alert('Error', 'Failed to update'); }
  };

  // Change #5: Format booking date
  const formatBookedAt = bookedAt => {
    if (!bookedAt) return '';
    const d = new Date(bookedAt);
    return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) +
      ' at ' + d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  };

  const upcomingAppointments = appointments.filter(a => a.status === 'pending');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  // Appointment card renderer
  const renderAppointmentCard = (apt, showActions = false) => (
    <View key={apt.id} style={styles.aptCard}>
      {/* Change #4: Tappable doctor name */}
      <TouchableOpacity onPress={() => handleDoctorTap(apt.doctorId)}>
        <Text style={styles.doctorNameLink}>{apt.doctorName || 'Doctor'}</Text>
        <Text style={styles.tapHint}>Tap to view doctor profile</Text>
      </TouchableOpacity>
      <Text style={styles.aptInfo}>{apt.hospitalName}</Text>
      <Text style={styles.aptInfo}>{apt.appointmentDate} at {apt.appointmentTime}</Text>
      {/* Change #5: Show when booked */}
      {apt.bookedAt && (
        <Text style={styles.bookedAtText}>Booked: {formatBookedAt(apt.bookedAt)}</Text>
      )}
      <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
        <Text style={styles.statusText}>{apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}</Text>
      </View>
      {showActions && (
        <View style={styles.aptActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelAppointment(apt.id)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rescheduleBtn} onPress={() => {
            handleCancelAppointment(apt.id);
          }}>
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{flex: 1}}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.patientName}>{patient?.fullName || 'Patient'}</Text>
          <Text style={styles.regNumber}>{patient?.regNumber}</Text>
          {patient?.ageDetailed && <Text style={styles.ageText}>Age: {patient.ageDetailed}</Text>}
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ScheduleSelection')}>
            <Text style={styles.quickIcon}>📅</Text>
            <Text style={styles.quickLabel}>Book Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.quickIcon}>🔑</Text>
            <Text style={styles.quickLabel}>Change Password</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map(apt => renderAppointmentCard(apt, true))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('ScheduleSelection')}>
              <Text style={styles.bookBtnText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {pastAppointments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Appointments</Text>
            {pastAppointments.map(apt => renderAppointmentCard(apt, false))}
          </>
        )}
      </ScrollView>

      {/* Always visible logout */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.removeItem('currentPatient');
          navigation.replace('Welcome');
        }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Change #4: Doctor Profile Banner Modal */}
      <Modal visible={showDoctorProfile} transparent animationType="fade">
        <View style={styles.profileOverlay}>
          <View style={styles.profileCard}>
            {/* Doctor photo */}
            <View style={styles.profilePhotoSection}>
              {selectedDoctorProfile?.photo ? (
                <Image source={{uri: selectedDoctorProfile.photo}} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoText}>👨‍⚕️</Text>
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{selectedDoctorProfile?.fullName}</Text>
            <Text style={styles.profileSpec}>{selectedDoctorProfile?.specialization}</Text>

            <View style={styles.profileDivider} />

            <View style={styles.profileDetails}>
              {selectedDoctorProfile?.qualifications && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Qualifications</Text>
                  <Text style={styles.profileValue}>{selectedDoctorProfile.qualifications}</Text>
                </View>
              )}
              {selectedDoctorProfile?.experience && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Experience</Text>
                  <Text style={styles.profileValue}>{selectedDoctorProfile.experience}</Text>
                </View>
              )}
              {selectedDoctorProfile?.email && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Email</Text>
                  <Text style={styles.profileValue}>{selectedDoctorProfile.email}</Text>
                </View>
              )}
              {selectedDoctorProfile?.phone && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Phone</Text>
                  <Text style={styles.profileValue}>{selectedDoctorProfile.phone}</Text>
                </View>
              )}
              {selectedDoctorProfile?.specialties && selectedDoctorProfile.specialties.length > 0 && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Expertise</Text>
                  <Text style={styles.profileValue}>{selectedDoctorProfile.specialties.join(', ')}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.profileCloseBtn} onPress={() => setShowDoctorProfile(false)}>
              <Text style={styles.profileCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.profileOverlay}>
          <View style={styles.pwModal}>
            <Text style={styles.pwTitle}>Change Password</Text>
            <TextInput style={styles.pwInput} placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry maxLength={6} />
            <TextInput style={styles.pwInput} placeholder="New password (4-6 chars)" value={newPassword} onChangeText={setNewPassword} secureTextEntry maxLength={6} />
            <TextInput style={styles.pwInput} placeholder="Confirm new password" value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry maxLength={6} />
            <TouchableOpacity style={styles.pwSaveBtn} onPress={handlePasswordReset}>
              <Text style={styles.pwSaveBtnText}>Update Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}>
              <Text style={styles.pwCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 10},
  header: {marginBottom: 20},
  welcomeText: {fontSize: 16, color: '#666'},
  patientName: {fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 4},
  regNumber: {fontSize: 14, color: '#667eea', marginTop: 4},
  ageText: {fontSize: 13, color: '#4caf50', marginTop: 3, fontWeight: '600'},
  quickRow: {flexDirection: 'row', gap: 12, marginBottom: 22},
  quickBtn: {flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4},
  quickIcon: {fontSize: 26, marginBottom: 4},
  quickLabel: {fontSize: 12, color: '#333', fontWeight: '600', textAlign: 'center'},
  sectionTitle: {fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 8},
  // Appointment cards
  aptCard: {backgroundColor: '#f8f9ff', padding: 14, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  // Change #4: Doctor name as link
  doctorNameLink: {fontWeight: '700', color: '#667eea', fontSize: 16, textDecorationLine: 'underline'},
  tapHint: {fontSize: 10, color: '#999', marginBottom: 6},
  aptInfo: {fontSize: 14, color: '#666', marginBottom: 3},
  // Change #5: Booked at date
  bookedAtText: {fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 3},
  statusBadge: {paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8},
  statusPending: {backgroundColor: '#fff3cd'},
  statusComplete: {backgroundColor: '#d4edda'},
  statusCancelled: {backgroundColor: '#f8d7da'},
  statusText: {fontSize: 11, fontWeight: '600', color: '#333'},
  aptActions: {flexDirection: 'row', gap: 10, marginTop: 12},
  cancelBtn: {flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#dc3545', paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  cancelBtnText: {color: '#dc3545', fontWeight: '600', fontSize: 13},
  rescheduleBtn: {flex: 1, backgroundColor: '#667eea', paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  rescheduleBtnText: {color: '#fff', fontWeight: '600', fontSize: 13},
  emptyState: {backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', marginBottom: 15},
  emptyText: {fontSize: 15, color: '#666', marginBottom: 12},
  bookBtn: {backgroundColor: '#667eea', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10},
  bookBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  // Bottom
  bottomBar: {padding: 10, backgroundColor: '#f5f7fa', borderTopWidth: 1, borderTopColor: '#e0e0e0'},
  logoutBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, padding: 12, alignItems: 'center'},
  logoutText: {color: '#dc3545', fontSize: 14, fontWeight: '600'},
  // Change #4: Doctor Profile Modal
  profileOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center'},
  profileCard: {backgroundColor: '#fff', borderRadius: 22, padding: 25, width: '88%', alignItems: 'center', maxHeight: '85%'},
  profilePhotoSection: {marginBottom: 15},
  profilePhoto: {width: 100, height: 100, borderRadius: 50},
  profilePhotoPlaceholder: {width: 100, height: 100, borderRadius: 50, backgroundColor: '#667eea', justifyContent: 'center', alignItems: 'center'},
  profilePhotoText: {fontSize: 50},
  profileName: {fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center'},
  profileSpec: {fontSize: 15, color: '#667eea', fontWeight: '600', marginTop: 4, textAlign: 'center'},
  profileDivider: {width: '80%', height: 2, backgroundColor: '#e0e0e0', marginVertical: 16},
  profileDetails: {width: '100%'},
  profileRow: {marginBottom: 12, paddingHorizontal: 5},
  profileLabel: {fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2},
  profileValue: {fontSize: 15, color: '#333'},
  profileCloseBtn: {backgroundColor: '#667eea', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 18},
  profileCloseBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  // Password modal
  pwModal: {backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '88%', alignItems: 'center'},
  pwTitle: {fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 18},
  pwInput: {backgroundColor: '#f5f7fa', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, width: '100%', marginBottom: 12, color: '#333'},
  pwSaveBtn: {backgroundColor: '#667eea', borderRadius: 10, padding: 15, width: '100%', alignItems: 'center', marginBottom: 10},
  pwSaveBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  pwCancelText: {color: '#666', fontSize: 14, padding: 8},
});

export default PatientDashboardScreen;