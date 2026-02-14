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

const DoctorDashboardScreen = ({navigation}) => {
  const [doctor, setDoctor] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({total: 0, completed: 0, pending: 0});
  const [doctorSchedules, setDoctorSchedules] = useState([]);

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

        // Feature #10: Only show this doctor's appointments
        const appointmentsData = await AsyncStorage.getItem('appointments');
        if (appointmentsData) {
          const allAppointments = JSON.parse(appointmentsData);
          const today = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const todayApts = allAppointments.filter(
            apt => apt.doctorId === doctorData.id && apt.appointmentDate === today,
          );

          setTodayAppointments(todayApts);
          setStats({
            total: todayApts.length,
            completed: todayApts.filter(apt => apt.status === 'completed').length,
            pending: todayApts.filter(apt => apt.status === 'pending').length,
          });
        }

        // Feature #11: Load this doctor's schedules
        const schedulesData = await AsyncStorage.getItem('doctorSchedules');
        if (schedulesData) {
          const allSchedules = JSON.parse(schedulesData);
          const mySchedules = allSchedules.filter(s => s.doctorId === doctorData.id);
          setDoctorSchedules(mySchedules);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Feature #11: Delete schedule
  const handleDeleteSchedule = scheduleId => {
    Alert.alert('Delete Schedule', 'Are you sure you want to delete this schedule?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const schedulesData = await AsyncStorage.getItem('doctorSchedules');
            if (schedulesData) {
              const allSchedules = JSON.parse(schedulesData);
              const updated = allSchedules.filter(s => s.id !== scheduleId);
              await AsyncStorage.setItem('doctorSchedules', JSON.stringify(updated));
              loadData();
              Alert.alert('Deleted', 'Schedule has been removed.');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete schedule');
          }
        },
      },
    ]);
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

  // Feature #11: Group schedules by hospital
  const groupedSchedules = doctorSchedules.reduce((acc, sch) => {
    const key = sch.hospitalName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sch);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.doctorName}>{doctor?.fullName || 'Doctor'}</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PatientSearch')}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Search Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DoctorProfile')}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DoctorCalendar')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddSchedule')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Add Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionText}>Reset Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('BlockDate')}>
            <Text style={styles.actionIcon}>🚫</Text>
            <Text style={styles.actionText}>Block Date</Text>
          </TouchableOpacity>
        </View>

        {/* Feature #11: Schedule List */}
        <Text style={styles.sectionTitle}>My Schedules</Text>
        {Object.keys(groupedSchedules).length > 0 ? (
          Object.entries(groupedSchedules).map(([hospital, schedules]) => (
            <View key={hospital} style={styles.scheduleGroup}>
              <Text style={styles.scheduleHospital}>{hospital}</Text>
              {schedules.map(sch => (
                <View key={sch.id} style={styles.scheduleItem}>
                  <View style={styles.scheduleDetails}>
                    <Text style={styles.scheduleDay}>{sch.consultationDay}</Text>
                    <Text style={styles.scheduleTime}>{sch.timeStart} - {sch.timeEnd}</Text>
                    <Text style={styles.schedulePatients}>
                      Max: {sch.maxPatients} patients • {sch.currentBookings || 0} booked
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteScheduleBtn}
                    onPress={() => handleDeleteSchedule(sch.id)}>
                    <Text style={styles.deleteScheduleText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyScheduleState}>
            <Text style={styles.emptyScheduleText}>No schedules created yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddSchedule')}>
              <Text style={styles.addScheduleLink}>+ Add Schedule</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        {todayAppointments.length > 0 ? (
          todayAppointments.map(apt => (
            <TouchableOpacity
              key={apt.id}
              style={styles.appointmentCard}
              onPress={() => navigation.navigate('PatientDetails', {patientId: apt.patientId})}>
              <Text style={styles.patientName}>{apt.patientName} ({apt.patientId})</Text>
              <Text style={styles.appointmentInfo}>{apt.hospitalName}</Text>
              <Text style={styles.appointmentInfo}>{apt.appointmentTime}</Text>
              <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                <Text style={styles.statusText}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No appointments scheduled for today</Text>
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
    shadowOffset: {width: 0, height: 2},
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
  // Feature #11: Schedule styles
  scheduleGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleHospital: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scheduleTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  schedulePatients: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteScheduleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteScheduleText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyScheduleState: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyScheduleText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  addScheduleLink: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
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