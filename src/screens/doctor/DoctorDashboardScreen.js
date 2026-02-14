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

const DoctorDashboardScreen = ({navigation}) => {
  const [doctor, setDoctor] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      if (currentDoctorData) {
        const doctorData = JSON.parse(currentDoctorData);
        setDoctor(doctorData);

        const appointmentsData = await AsyncStorage.getItem('appointments');
        if (appointmentsData) {
          const allAppointments = JSON.parse(appointmentsData);
          const today = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const todayApts = allAppointments.filter(
            apt =>
              apt.doctorId === doctorData.id && apt.appointmentDate === today,
          );

          setTodayAppointments(todayApts);
          setStats({
            total: todayApts.length,
            completed: todayApts.filter(apt => apt.status === 'completed')
              .length,
            pending: todayApts.filter(apt => apt.status === 'pending').length,
          });
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.doctorName}>
            {doctor?.fullName || 'Doctor'}
          </Text>
          <Text style={styles.specialization}>{doctor?.specialization}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Today's Patients</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAlt]}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PatientSearch')}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Search Patient</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DoctorProfile')}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DoctorCalendar')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddSchedule')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Add Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.actionIcon}>🔑</Text>
            <Text style={styles.actionText}>Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BlockDate')}>
            <Text style={styles.actionIcon}>🚫</Text>
            <Text style={styles.actionText}>Block Date</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        {todayAppointments.length > 0 ? (
          todayAppointments.map(apt => (
            <TouchableOpacity
              key={apt.id}
              style={styles.appointmentCard}
              onPress={() =>
                navigation.navigate('PatientDetails', {patientId: apt.patientId})
              }>
              <Text style={styles.patientName}>
                {apt.patientName} ({apt.patientId})
              </Text>
              <Text style={styles.appointmentInfo}>
                🏥 {apt.hospitalName}
              </Text>
              <Text style={styles.appointmentInfo}>
                🕐 {apt.appointmentTime}
              </Text>
              <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                <Text style={styles.statusText}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No appointments scheduled for today
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem('currentDoctor');
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  doctorName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  specialization: {
    fontSize: 14,
    color: '#667eea',
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  actionText: {
    fontSize: 11,
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
  patientName: {
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
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
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

export default DoctorDashboardScreen;