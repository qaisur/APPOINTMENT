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

const PatientDashboardScreen = ({navigation}) => {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

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
      default:
        return styles.statusPending;
    }
  };

  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'pending',
  );
  const pastAppointments = appointments.filter(
    apt => apt.status === 'completed',
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.patientName}>{patient?.fullName || 'Patient'}</Text>
          <Text style={styles.regNumber}>{patient?.regNumber}</Text>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map(apt => (
            <View key={apt.id} style={styles.appointmentCard}>
              <Text style={styles.doctorName}>Dr. Sarah Wilson</Text>
              <Text style={styles.appointmentInfo}>
                🏥 {apt.hospitalName}
              </Text>
              <Text style={styles.appointmentInfo}>
                📅 {apt.appointmentDate} at {apt.appointmentTime}
              </Text>
              <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                <Text style={styles.statusText}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No upcoming appointments
            </Text>
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
                <Text style={styles.doctorName}>Dr. Sarah Wilson</Text>
                <Text style={styles.appointmentInfo}>
                  🏥 {apt.hospitalName}
                </Text>
                <Text style={styles.appointmentInfo}>
                  📅 {apt.appointmentDate} at {apt.appointmentTime}
                </Text>
                <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              </View>
            ))}
          </>
        )}

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
    marginBottom: 30,
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
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
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