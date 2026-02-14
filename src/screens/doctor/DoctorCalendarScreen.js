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
import {Calendar} from 'react-native-calendars';

const DoctorCalendarScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = JSON.parse(currentDoctorData);

      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const allAppointments = JSON.parse(appointmentsData);
        const doctorAppointments = allAppointments.filter(
          apt => apt.doctorId === currentDoctor.id,
        );
        setAppointments(doctorAppointments);

        // Create marked dates
        const marked = {};
        doctorAppointments.forEach(apt => {
          const dateKey = convertToDateKey(apt.appointmentDate);
          marked[dateKey] = {marked: true, dotColor: '#667eea'};
        });
        setMarkedDates(marked);

        // Set today as selected
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const convertToDateKey = dateString => {
    // Convert "Feb 15, 2026" to "2026-02-15"
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getAppointmentsForDate = date => {
    const dateString = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return appointments.filter(apt => apt.appointmentDate === dateString);
  };

  const selectedDateAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Calendar
          onDayPress={day => setSelectedDate(day.dateString)}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              selected: true,
              selectedColor: '#667eea',
              marked: markedDates[selectedDate]?.marked,
            },
          }}
          theme={{
            selectedDayBackgroundColor: '#667eea',
            todayTextColor: '#667eea',
            dotColor: '#667eea',
            arrowColor: '#667eea',
          }}
        />

        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>
            Appointments on {new Date(selectedDate).toLocaleDateString()}
          </Text>

          {selectedDateAppointments.length > 0 ? (
            selectedDateAppointments.map(apt => (
              <TouchableOpacity
                key={apt.id}
                style={styles.appointmentCard}
                onPress={() =>
                  navigation.navigate('PatientDetails', {
                    patientId: apt.patientId,
                  })
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
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No appointments scheduled for this date
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.blockDateButton}
          onPress={() => navigation.navigate('BlockDate')}>
          <Text style={styles.blockDateButtonText}>🚫 Block Date</Text>
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
    paddingBottom: 40,
  },
  appointmentsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
    backgroundColor: '#fff3cd',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
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
  blockDateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  blockDateButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DoctorCalendarScreen;