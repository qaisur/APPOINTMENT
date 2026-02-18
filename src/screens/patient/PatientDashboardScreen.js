import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal, TextInput, Image, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAST_INITIAL_COUNT = 5; // #8: Show last 5 past appointments

const PatientDashboardScreen = ({navigation}) => {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  // Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // #4: Doctor profile
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);

  // #8: Show more for past
  const [showAllPast, setShowAllPast] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      if (!currentPatientData) return;
      const patientData = JSON.parse(currentPatientData);
      setPatient(patientData);

      const aptsData = await AsyncStorage.getItem('appointments');
      if (aptsData) {
        let all = JSON.parse(aptsData).filter(apt => apt.patientId === patientData.regNumber);

        // #7: Check for missed & void appointments on app open
        const now = new Date();
        let updated = false;

        for (let i = 0; i < all.length; i++) {
          const apt = all[i];
          if (apt.status !== 'pending') continue;

          // Parse appointment date
          const aptDate = new Date(apt.appointmentDate);
          if (isNaN(aptDate.getTime())) continue;

          // Check if appointment date has passed
          const todayStr = now.toISOString().split('T')[0];
          const aptDateStr = aptDate.toISOString().split('T')[0];

          if (aptDateStr < todayStr) {
            // Past date - check if doctor added consultation
            const consultData = await AsyncStorage.getItem('consultations');
            const consults = consultData ? JSON.parse(consultData) : [];
            const hasConsult = consults.some(
              c => c.patientId === apt.patientId &&
                new Date(c.createdAt).toISOString().split('T')[0] === aptDateStr,
            );

            if (hasConsult) {
              all[i] = {...apt, status: 'completed'};
            } else {
              // #7: Check if end of consultation window passed
              const endTimeMinutes = parseTimeToMinutes(apt.appointmentEndTime || '11:59 PM');
              const aptEndDate = new Date(aptDate);
              aptEndDate.setHours(Math.floor(endTimeMinutes / 60), endTimeMinutes % 60);

              if (now > aptEndDate) {
                // #7: Mark as void if no consultation by end of time slot
                all[i] = {...apt, status: 'void'};
              } else {
                all[i] = {...apt, status: 'missed'};
              }
            }
            updated = true;
          } else if (aptDateStr === todayStr) {
            // Same day - check if appointment time passed
            const startMinutes = parseTimeToMinutes(apt.appointmentTime);
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const endMinutes = parseTimeToMinutes(apt.appointmentEndTime || apt.appointmentTime);

            if (nowMinutes > endMinutes + 60) {
              // More than 1 hour past end time
              const consultData = await AsyncStorage.getItem('consultations');
              const consults = consultData ? JSON.parse(consultData) : [];
              const hasConsult = consults.some(c => c.patientId === apt.patientId);

              if (!hasConsult) {
                all[i] = {...apt, status: 'missed'};
                updated = true;
              }
            }
          }
        }

        if (updated) {
          // Save updated statuses back
          const allAptsData = await AsyncStorage.getItem('appointments');
          const allApts = allAptsData ? JSON.parse(allAptsData) : [];
          const updatedAll = allApts.map(orig => {
            const match = all.find(a => a.id === orig.id);
            return match || orig;
          });
          await AsyncStorage.setItem('appointments', JSON.stringify(updatedAll));
        }

        setAppointments(all);

        // #6: Schedule local notifications for upcoming appointments
        scheduleReminders(all.filter(a => a.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const parseTimeToMinutes = timeStr => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // #6: Schedule reminders (local - shown when app is open or via local notification)
  const scheduleReminders = async upcomingApts => {
    try {
      const reminders = [];
      const now = new Date();

      for (const apt of upcomingApts) {
        const aptDate = new Date(apt.appointmentDate);
        if (isNaN(aptDate.getTime())) continue;

        const startMinutes = parseTimeToMinutes(apt.appointmentTime);
        aptDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

        const diffMs = aptDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Show alert if within 5 hours
        if (diffHours > 0 && diffHours <= 5) {
          const hoursLeft = Math.floor(diffHours);
          const minsLeft = Math.floor((diffHours - hoursLeft) * 60);
          reminders.push({
            id: apt.id,
            message: `Reminder: Your appointment with ${apt.doctorName} at ${apt.hospitalName} is in ${hoursLeft}h ${minsLeft}m (${apt.appointmentTime})`,
          });
        }
      }

      // Store reminders and show if any
      if (reminders.length > 0) {
        const shownKey = `reminders_shown_${new Date().toISOString().split('T')[0]}`;
        const shownData = await AsyncStorage.getItem(shownKey);
        const shown = shownData ? JSON.parse(shownData) : [];

        for (const rem of reminders) {
          if (!shown.includes(rem.id)) {
            Alert.alert('⏰ Appointment Reminder', rem.message);
            shown.push(rem.id);
          }
        }
        await AsyncStorage.setItem(shownKey, JSON.stringify(shown));
      }
    } catch (e) {
      console.log('Reminder error:', e);
    }
  };

  const getStatusStyle = status => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'completed': return styles.statusComplete;
      case 'cancelled': return styles.statusCancelled;
      case 'missed': return styles.statusMissed;
      case 'void': return styles.statusVoid;
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
              const updated = JSON.parse(data).map(a => a.id === appointmentId ? {...a, status: 'cancelled'} : a);
              await AsyncStorage.setItem('appointments', JSON.stringify(updated));
              loadData();
            }
          } catch (e) { Alert.alert('Error', 'Failed to cancel'); }
        },
      },
    ]);
  };

  const handleDoctorTap = async doctorId => {
    try {
      const doctorsData = await AsyncStorage.getItem('doctors');
      if (doctorsData) {
        const doc = JSON.parse(doctorsData).find(d => d.id === doctorId);
        if (doc) { setSelectedDoctorProfile(doc); setShowDoctorProfile(true); }
        else Alert.alert('Info', 'Doctor profile not available');
      }
    } catch (e) { console.error('Error:', e); }
  };

  const handlePasswordReset = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) { Alert.alert('Error', 'Fill all fields'); return; }
    if (currentPassword !== patient.password) { Alert.alert('Error', 'Current password incorrect'); return; }
    if (newPassword !== confirmNewPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (newPassword.length < 4 || newPassword.length > 6 || !/^[a-zA-Z0-9]+$/.test(newPassword)) {
      Alert.alert('Error', 'Password must be 4-6 alphanumeric'); return;
    }
    try {
      const data = await AsyncStorage.getItem('patients');
      if (data) {
        const patients = JSON.parse(data).map(p => p.regNumber === patient.regNumber ? {...p, password: newPassword} : p);
        await AsyncStorage.setItem('patients', JSON.stringify(patients));
        const updatedPatient = {...patient, password: newPassword};
        await AsyncStorage.setItem('currentPatient', JSON.stringify(updatedPatient));
        setPatient(updatedPatient);
        setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
        Alert.alert('Success', 'Password updated!');
      }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const formatBookedAt = bookedAt => {
    if (!bookedAt) return '';
    const d = new Date(bookedAt);
    return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) +
      ' at ' + d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  };

  const upcomingApts = appointments.filter(a => a.status === 'pending');
  const pastApts = appointments.filter(a => ['completed', 'cancelled', 'missed', 'void'].includes(a.status));
  const visiblePast = showAllPast ? pastApts : pastApts.slice(0, PAST_INITIAL_COUNT); // #8

  const renderAptCard = (apt, showActions = false) => (
    <View key={apt.id} style={[styles.aptCard, apt.status === 'missed' && styles.aptCardMissed, apt.status === 'void' && styles.aptCardVoid]}>
      <TouchableOpacity onPress={() => handleDoctorTap(apt.doctorId)}>
        <Text style={styles.doctorNameLink}>{apt.doctorName || 'Doctor'}</Text>
        <Text style={styles.tapHint}>Tap to view doctor profile</Text>
      </TouchableOpacity>
      <Text style={styles.aptInfo}>{apt.hospitalName}</Text>
      <Text style={styles.aptInfo}>{apt.appointmentDate} at {apt.appointmentTime}</Text>
      {apt.bookedAt && <Text style={styles.bookedAtText}>Booked: {formatBookedAt(apt.bookedAt)}</Text>}
      <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
        <Text style={styles.statusText}>{(apt.status || 'pending').charAt(0).toUpperCase() + (apt.status || 'pending').slice(1)}</Text>
      </View>
      {/* #7: Missed appointment message */}
      {apt.status === 'missed' && (
        <View style={styles.missedBox}>
          <Text style={styles.missedText}>⚠️ You missed this appointment.</Text>
          <TouchableOpacity style={styles.rebookBtn} onPress={() => navigation.navigate('ScheduleSelection')}>
            <Text style={styles.rebookText}>Book New Appointment</Text>
          </TouchableOpacity>
        </View>
      )}
      {apt.status === 'void' && (
        <Text style={styles.voidText}>This appointment was voided — no consultation was recorded by the doctor.</Text>
      )}
      {showActions && apt.status === 'pending' && (
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
            <Text style={styles.quickLabel}>Book Apt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.quickIcon}>🔑</Text>
            <Text style={styles.quickLabel}>Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MedicalHistory')}>
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* #6: Upcoming reminder banner */}
        {upcomingApts.length > 0 && (
          <View style={styles.reminderBanner}>
            <Text style={styles.reminderIcon}>⏰</Text>
            <Text style={styles.reminderText}>
              You have {upcomingApts.length} upcoming appointment{upcomingApts.length > 1 ? 's' : ''}.
              Reminders will appear 5 & 3 hours before.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcomingApts.length > 0 ? (
          upcomingApts.map(apt => renderAptCard(apt, true))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('ScheduleSelection')}>
              <Text style={styles.bookBtnText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {pastApts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Appointments</Text>
            {visiblePast.map(apt => renderAptCard(apt, false))}
            {/* #8: Show more for past */}
            {pastApts.length > PAST_INITIAL_COUNT && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllPast(!showAllPast)}>
                <Text style={styles.showMoreText}>
                  {showAllPast ? '▲ Show Less' : `▼ Show All ${pastApts.length} Past Appointments`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* #9: Bottom bar with extra padding for gesture nav */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.removeItem('currentPatient');
          navigation.replace('Welcome');
        }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Doctor Profile Modal */}
      <Modal visible={showDoctorProfile} transparent animationType="fade">
        <View style={styles.profileOverlay}>
          <View style={styles.profileCard}>
            <View style={styles.profilePhotoSection}>
              {selectedDoctorProfile?.photo ? (
                <Image source={{uri: selectedDoctorProfile.photo}} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}><Text style={styles.profilePhotoText}>👨‍⚕️</Text></View>
              )}
            </View>
            <Text style={styles.profileName}>{selectedDoctorProfile?.fullName}</Text>
            <Text style={styles.profileSpec}>{selectedDoctorProfile?.specialization}</Text>
            <View style={styles.profileDivider} />
            <View style={styles.profileDetails}>
              {selectedDoctorProfile?.qualifications && <View style={styles.profileRow}><Text style={styles.profileLabel}>Qualifications</Text><Text style={styles.profileValue}>{selectedDoctorProfile.qualifications}</Text></View>}
              {selectedDoctorProfile?.experience && <View style={styles.profileRow}><Text style={styles.profileLabel}>Experience</Text><Text style={styles.profileValue}>{selectedDoctorProfile.experience}</Text></View>}
              {selectedDoctorProfile?.email && <View style={styles.profileRow}><Text style={styles.profileLabel}>Email</Text><Text style={styles.profileValue}>{selectedDoctorProfile.email}</Text></View>}
              {selectedDoctorProfile?.phone && <View style={styles.profileRow}><Text style={styles.profileLabel}>Phone</Text><Text style={styles.profileValue}>{selectedDoctorProfile.phone}</Text></View>}
              {selectedDoctorProfile?.specialties?.length > 0 && <View style={styles.profileRow}><Text style={styles.profileLabel}>Expertise</Text><Text style={styles.profileValue}>{selectedDoctorProfile.specialties.join(', ')}</Text></View>}
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
            <TouchableOpacity style={styles.pwSaveBtn} onPress={handlePasswordReset}><Text style={styles.pwSaveBtnText}>Update</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}>
              <Text style={styles.pwCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// #9: Platform-aware bottom padding
const BOTTOM_PADDING = Platform.OS === 'android' ? 8 : 0;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 10},
  header: {marginBottom: 18},
  welcomeText: {fontSize: 15, color: '#666'},
  patientName: {fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 4},
  regNumber: {fontSize: 14, color: '#667eea', marginTop: 3},
  ageText: {fontSize: 13, color: '#4caf50', marginTop: 3, fontWeight: '600'},
  quickRow: {flexDirection: 'row', gap: 10, marginBottom: 18},
  quickBtn: {flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4},
  quickIcon: {fontSize: 24, marginBottom: 4},
  quickLabel: {fontSize: 11, color: '#333', fontWeight: '600', textAlign: 'center'},
  // #6: Reminder banner
  reminderBanner: {backgroundColor: '#e3f2fd', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196f3'},
  reminderIcon: {fontSize: 22, marginRight: 10},
  reminderText: {fontSize: 13, color: '#1565c0', flex: 1, lineHeight: 19},
  sectionTitle: {fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 8},
  // Appointment cards
  aptCard: {backgroundColor: '#f8f9ff', padding: 14, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  aptCardMissed: {borderLeftColor: '#dc3545', backgroundColor: '#fff5f5'},
  aptCardVoid: {borderLeftColor: '#999', backgroundColor: '#f9f9f9'},
  doctorNameLink: {fontWeight: '700', color: '#667eea', fontSize: 16, textDecorationLine: 'underline'},
  tapHint: {fontSize: 10, color: '#999', marginBottom: 6},
  aptInfo: {fontSize: 14, color: '#666', marginBottom: 3},
  bookedAtText: {fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 3},
  statusBadge: {paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8},
  statusPending: {backgroundColor: '#fff3cd'},
  statusComplete: {backgroundColor: '#d4edda'},
  statusCancelled: {backgroundColor: '#f8d7da'},
  statusMissed: {backgroundColor: '#ffcdd2'},
  statusVoid: {backgroundColor: '#e0e0e0'},
  statusText: {fontSize: 11, fontWeight: '600', color: '#333'},
  // #7: Missed/Void messages
  missedBox: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffcdd2', borderRadius: 8, padding: 10, marginTop: 10},
  missedText: {fontSize: 13, color: '#dc3545', fontWeight: '600', marginBottom: 8},
  rebookBtn: {backgroundColor: '#667eea', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start'},
  rebookText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  voidText: {fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 8},
  aptActions: {flexDirection: 'row', gap: 10, marginTop: 12},
  cancelBtn: {flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#dc3545', paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  cancelBtnText: {color: '#dc3545', fontWeight: '600', fontSize: 13},
  rescheduleBtn: {flex: 1, backgroundColor: '#667eea', paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  rescheduleBtnText: {color: '#fff', fontWeight: '600', fontSize: 13},
  emptyState: {backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', marginBottom: 15},
  emptyText: {fontSize: 15, color: '#666', marginBottom: 12},
  bookBtn: {backgroundColor: '#667eea', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10},
  bookBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  // #8: Show more
  showMoreBtn: {padding: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, marginBottom: 10},
  showMoreText: {color: '#667eea', fontWeight: '600', fontSize: 14},
  // #9: Bottom bar with gesture nav padding
  bottomBar: {padding: 10, paddingBottom: 10 + BOTTOM_PADDING, backgroundColor: '#f5f7fa', borderTopWidth: 1, borderTopColor: '#e0e0e0'},
  logoutBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, padding: 12, alignItems: 'center'},
  logoutText: {color: '#dc3545', fontSize: 14, fontWeight: '600'},
  // Doctor profile
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
  // Password
  pwModal: {backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '88%', alignItems: 'center'},
  pwTitle: {fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 18},
  pwInput: {backgroundColor: '#f5f7fa', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, width: '100%', marginBottom: 12, color: '#333'},
  pwSaveBtn: {backgroundColor: '#667eea', borderRadius: 10, padding: 15, width: '100%', alignItems: 'center', marginBottom: 10},
  pwSaveBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  pwCancelText: {color: '#666', fontSize: 14, padding: 8},
});

export default PatientDashboardScreen;