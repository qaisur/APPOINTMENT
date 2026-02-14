import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDashboardScreen = ({navigation}) => {
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load doctors
      const doctorsData = await AsyncStorage.getItem('doctors');
      const doctorsList = doctorsData ? JSON.parse(doctorsData) : [];
      setDoctors(doctorsList);

      // Load patients for stats
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
              await AsyncStorage.setItem(
                'doctors',
                JSON.stringify(updatedDoctors),
              );
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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        onPress: () => navigation.replace('Welcome'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>System Management</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalDoctors}</Text>
            <Text style={styles.statLabel}>Total Doctors</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAlt]}>
            <Text style={styles.statNumber}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
        </View>

        {/* Create Doctor Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            navigation.navigate('CreateUser');
            // Reload data when coming back
            const unsubscribe = navigation.addListener('focus', () => {
              loadData();
            });
            return unsubscribe;
          }}
          activeOpacity={0.8}>
          <Text style={styles.createButtonIcon}>➕</Text>
          <Text style={styles.createButtonText}>Create Doctor Account</Text>
        </TouchableOpacity>

        {/* Doctors List */}
        <Text style={styles.sectionTitle}>Registered Doctors</Text>

        {doctors.length > 0 ? (
          doctors.map(doctor => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.fullName}</Text>
                <Text style={styles.doctorDetail}>
                  Username: {doctor.username}
                </Text>
                <Text style={styles.doctorDetail}>
                  Specialization: {doctor.specialization}
                </Text>
                <Text style={styles.doctorDetail}>
                  Email: {doctor.email || 'N/A'}
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
            <Text style={styles.emptyStateSubtext}>
              Create the first doctor account
            </Text>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
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
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  statCardAlt: {
    backgroundColor: '#764ba2',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  createButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#4caf50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#fff',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  doctorInfo: {
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  doctorDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
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

export default AdminDashboardScreen;