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
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDashboardScreen = ({navigation}) => {
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({totalDoctors: 0, totalPatients: 0});

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState('patient'); // 'patient' or 'doctor'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Patient search modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const doctorsData = await AsyncStorage.getItem('doctors');
      const doctorsList = doctorsData ? JSON.parse(doctorsData) : [];
      setDoctors(doctorsList);

      const patientsData = await AsyncStorage.getItem('patients');
      const patientsList = patientsData ? JSON.parse(patientsData) : [];

      setStats({
        totalDoctors: doctorsList.length,
        totalPatients: patientsList.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleDeleteDoctor = async doctorId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this doctor account?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedDoctors = doctors.filter(d => d.id !== doctorId);
              await AsyncStorage.setItem('doctors', JSON.stringify(updatedDoctors));
              setDoctors(updatedDoctors);
              Alert.alert('Success', 'Doctor account deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete doctor account');
            }
          },
        },
      ],
    );
  };

  // Password reset handler
  const handlePasswordReset = async () => {
    if (!resetIdentifier || !resetNewPassword || !resetConfirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (resetNewPassword.length < 4 || resetNewPassword.length > 6) {
      Alert.alert('Error', 'Password must be 4-6 characters');
      return;
    }
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(resetNewPassword)) {
      Alert.alert('Error', 'Password must be alphanumeric only');
      return;
    }

    try {
      if (resetType === 'patient') {
        const patientsData = await AsyncStorage.getItem('patients');
        if (!patientsData) {
          Alert.alert('Error', 'No patients found');
          return;
        }
        const patients = JSON.parse(patientsData);
        const query = resetIdentifier.trim();
        const idx = patients.findIndex(
          p =>
            p.regNumber.toUpperCase() === query.toUpperCase() ||
            p.phone === query,
        );
        if (idx === -1) {
          Alert.alert('Error', 'Patient not found with this registration number or phone');
          return;
        }
        patients[idx].password = resetNewPassword;
        await AsyncStorage.setItem('patients', JSON.stringify(patients));
        Alert.alert(
          'Success',
          `Password reset for ${patients[idx].fullName}\nNew Password: ${resetNewPassword}`,
        );
      } else {
        const doctorsData = await AsyncStorage.getItem('doctors');
        if (!doctorsData) {
          Alert.alert('Error', 'No doctors found');
          return;
        }
        const docList = JSON.parse(doctorsData);
        const query = resetIdentifier.trim().toLowerCase();
        const idx = docList.findIndex(
          d =>
            d.username?.toLowerCase() === query ||
            d.email?.toLowerCase() === query,
        );
        if (idx === -1) {
          Alert.alert('Error', 'Doctor not found with this username or email');
          return;
        }
        docList[idx].password = resetNewPassword;
        await AsyncStorage.setItem('doctors', JSON.stringify(docList));
        Alert.alert(
          'Success',
          `Password reset for ${docList[idx].fullName}\nNew Password: ${resetNewPassword}`,
        );
      }
      setShowResetModal(false);
      setResetIdentifier('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password');
    }
  };

  // Patient search handler
  const handlePatientSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const patientsData = await AsyncStorage.getItem('patients');
      if (!patientsData) {
        setSearchResults([]);
        setHasSearched(true);
        return;
      }
      const patients = JSON.parse(patientsData);
      const q = searchQuery.toLowerCase().trim();
      const results = patients.filter(
        p =>
          p.fullName.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.regNumber.toLowerCase().includes(q),
      );
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', onPress: () => navigation.replace('Welcome')},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main scrollable content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>System Management</Text>
        </View>

        {/* Stats - compact */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalDoctors}</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAlt]}>
            <Text style={styles.statNumber}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </View>

        {/* Quick Actions - compact grid */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateUser')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Create Doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowSearchModal(true)}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Search Patient</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setResetType('patient');
              setShowResetModal(true);
            }}>
            <Text style={styles.actionIcon}>🔑</Text>
            <Text style={styles.actionLabel}>Reset Patient PW</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setResetType('doctor');
              setShowResetModal(true);
            }}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionLabel}>Reset Doctor PW</Text>
          </TouchableOpacity>
        </View>

        {/* Doctors List */}
        <Text style={styles.sectionTitle}>Registered Doctors</Text>

        {doctors.length > 0 ? (
          doctors.map(doctor => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.fullName}</Text>
                <Text style={styles.doctorDetail}>
                  User: {doctor.username} • {doctor.specialization}
                </Text>
                <Text style={styles.doctorDetail}>
                  {doctor.email || ''} {doctor.phone ? `• ${doctor.phone}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteDoctor(doctor.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No doctors registered yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Always visible logout at bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Password Reset Modal */}
      <Modal visible={showResetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Reset {resetType === 'patient' ? 'Patient' : 'Doctor'} Password
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>
                {resetType === 'patient'
                  ? 'Registration Number or Phone'
                  : 'Username or Email'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={
                  resetType === 'patient'
                    ? 'PAT2026-00123 or 01712345678'
                    : 'username or doctor@email.com'
                }
                value={resetIdentifier}
                onChangeText={setResetIdentifier}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>New Password (4-6 chars)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter new password"
                value={resetNewPassword}
                onChangeText={setResetNewPassword}
                secureTextEntry
                maxLength={6}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Confirm Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Re-enter password"
                value={resetConfirmPassword}
                onChangeText={setResetConfirmPassword}
                secureTextEntry
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handlePasswordReset}>
              <Text style={styles.modalSaveBtnText}>Reset Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowResetModal(false);
                setResetIdentifier('');
                setResetNewPassword('');
                setResetConfirmPassword('');
              }}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Patient Search Modal */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>Search Patient</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={[styles.modalInput, {flex: 1}]}
                placeholder="Name, phone, or reg number..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                onSubmitEditing={handlePatientSearch}
              />
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={handlePatientSearch}>
                <Text style={styles.searchBtnText}>🔍</Text>
              </TouchableOpacity>
            </View>

            {hasSearched && (
              <Text style={styles.resultCount}>
                {searchResults.length} result(s) found
              </Text>
            )}

            <FlatList
              data={searchResults}
              keyExtractor={item => item.regNumber}
              style={styles.searchList}
              renderItem={({item}) => (
                <View style={styles.searchResultCard}>
                  <Text style={styles.searchResultName}>{item.fullName}</Text>
                  <Text style={styles.searchResultDetail}>
                    Reg: {item.regNumber} • Phone: {item.phone}
                  </Text>
                  <Text style={styles.searchResultDetail}>
                    Age: {item.ageDetailed || `${item.age} yrs`} • Sex:{' '}
                    {item.sex} • DOB: {item.dateOfBirth}
                  </Text>
                  {item.currentProblem && (
                    <Text style={styles.searchResultProblem}>
                      Problem: {item.currentProblem}
                    </Text>
                  )}
                </View>
              )}
              ListEmptyComponent={
                hasSearched ? (
                  <Text style={styles.emptySearchText}>
                    No patients found matching your search
                  </Text>
                ) : null
              }
            />

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowSearchModal(false);
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}>
              <Text style={styles.modalCancelBtnText}>Close</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 18,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardAlt: {
    backgroundColor: '#764ba2',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  // Compact action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 12,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  doctorInfo: {
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 3,
  },
  doctorDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
  // Bottom bar - always visible
  bottomBar: {
    padding: 12,
    backgroundColor: '#f5f7fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 14,
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
    fontSize: 14,
    color: '#333',
  },
  modalSaveBtn: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  modalSaveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    padding: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#666',
    fontSize: 14,
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchBtn: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    fontSize: 18,
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  searchList: {
    maxHeight: 350,
  },
  searchResultCard: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 3,
  },
  searchResultDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  searchResultProblem: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    marginTop: 3,
  },
  emptySearchText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});

export default AdminDashboardScreen;