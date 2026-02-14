import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Calendar} from 'react-native-calendars';

const ScheduleSelectionScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterSchedulesByDate(selectedDate);
    }
  }, [selectedDate, allSchedules]);

  const loadSchedules = async () => {
    try {
      const schedulesData = await AsyncStorage.getItem('doctorSchedules');
      if (schedulesData) {
        setAllSchedules(JSON.parse(schedulesData));
      } else {
        // Demo schedules
        const demoSchedules = [
          {
            id: 'SCH001',
            doctorId: 'DOC001',
            doctorName: 'Dr. Sarah Wilson',
            hospitalName: 'City General Hospital',
            hospitalAddress: '123 Medical Center Drive',
            consultationDay: 'Saturday',
            timeStart: '02:00 PM',
            timeEnd: '04:00 PM',
            maxPatients: 15,
            currentBookings: 7,
          },
          {
            id: 'SCH002',
            doctorId: 'DOC001',
            doctorName: 'Dr. Sarah Wilson',
            hospitalName: 'City General Hospital',
            hospitalAddress: '123 Medical Center Drive',
            consultationDay: 'Monday',
            timeStart: '06:00 AM',
            timeEnd: '08:00 AM',
            maxPatients: 10,
            currentBookings: 3,
          },
          {
            id: 'SCH003',
            doctorId: 'DOC001',
            doctorName: 'Dr. Sarah Wilson',
            hospitalName: "Children's Care Clinic",
            hospitalAddress: '456 Pediatric Avenue',
            consultationDay: 'Wednesday',
            timeStart: '04:00 PM',
            timeEnd: '07:00 PM',
            maxPatients: 25,
            currentBookings: 7,
          },
        ];
        await AsyncStorage.setItem(
          'doctorSchedules',
          JSON.stringify(demoSchedules),
        );
        setAllSchedules(demoSchedules);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load schedules');
    }
  };

  const getDayName = dateString => {
    const date = new Date(dateString);
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()];
  };

  const filterSchedulesByDate = dateString => {
    const dayName = getDayName(dateString);

    // Filter schedules that match the selected day
    const filtered = allSchedules.filter(
      schedule => schedule.consultationDay === dayName,
    );

    setAvailableSchedules(filtered);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSchedule) {
      Alert.alert('Error', 'Please select a hospital/schedule');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      const currentPatient = JSON.parse(currentPatientData);

      const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const appointment = {
        id: 'APT' + Date.now(),
        patientId: currentPatient.regNumber,
        patientName: currentPatient.fullName,
        scheduleId: selectedSchedule.id,
        doctorId: selectedSchedule.doctorId,
        doctorName: selectedSchedule.doctorName || 'Dr. Sarah Wilson',
        hospitalName: selectedSchedule.hospitalName,
        consultationDay: selectedSchedule.consultationDay,
        appointmentDate: formattedDate,
        appointmentTime: selectedSchedule.timeStart,
        status: 'pending',
        bookedAt: new Date().toISOString(),
      };

      const appointmentsData = await AsyncStorage.getItem('appointments');
      const appointments = appointmentsData ? JSON.parse(appointmentsData) : [];
      appointments.push(appointment);
      await AsyncStorage.setItem('appointments', JSON.stringify(appointments));

      // Update schedule bookings count
      const updatedSchedules = allSchedules.map(sch => {
        if (sch.id === selectedSchedule.id) {
          return {...sch, currentBookings: sch.currentBookings + 1};
        }
        return sch;
      });
      await AsyncStorage.setItem(
        'doctorSchedules',
        JSON.stringify(updatedSchedules),
      );

      navigation.navigate('BookingConfirmation', {
        appointment,
        schedule: selectedSchedule,
      });
    } catch (error) {
      Alert.alert('Error', 'Booking failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Book Appointment</Text>
        <Text style={styles.subHeaderText}>
          Step 1: Select a date, then choose a hospital
        </Text>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={day => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: '#667eea',
              },
            }}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              selectedDayBackgroundColor: '#667eea',
              todayTextColor: '#667eea',
              arrowColor: '#667eea',
            }}
          />
        </View>

        {selectedDate ? (
          <>
            <View style={styles.selectedDateBox}>
              <Text style={styles.selectedDateText}>
                📅 Selected: {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.selectedDayText}>
                Day: {getDayName(selectedDate)}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Available Hospitals on {getDayName(selectedDate)}
            </Text>

            {availableSchedules.length > 0 ? (
              availableSchedules.map(schedule => (
                <TouchableOpacity
                  key={schedule.id}
                  style={[
                    styles.scheduleCard,
                    selectedSchedule?.id === schedule.id &&
                      styles.scheduleCardSelected,
                  ]}
                  onPress={() => setSelectedSchedule(schedule)}
                  activeOpacity={0.7}>
                  <Text style={styles.doctorName}>
                    👨‍⚕️ {schedule.doctorName || 'Dr. Sarah Wilson'}
                  </Text>
                  <Text style={styles.hospitalName}>
                    🏥 {schedule.hospitalName}
                  </Text>
                  <Text style={styles.scheduleInfo}>
                    📍 {schedule.hospitalAddress}
                  </Text>
                  <Text style={styles.scheduleInfo}>
                    🕐 {schedule.timeStart} - {schedule.timeEnd}
                  </Text>
                  <View style={styles.availability}>
                    <Text style={styles.availabilityText}>
                      {schedule.maxPatients - schedule.currentBookings}/
                      {schedule.maxPatients} slots available
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noScheduleBox}>
                <Text style={styles.noScheduleText}>
                  ❌ No consultations available on {getDayName(selectedDate)}
                </Text>
                <Text style={styles.noScheduleSubtext}>
                  Please select a different date
                </Text>
              </View>
            )}

            {availableSchedules.length > 0 && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmBooking}
                activeOpacity={0.8}>
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              👆 Please select a date from the calendar above
            </Text>
          </View>
        )}
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateBox: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  selectedDayText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  scheduleCardSelected: {
    borderColor: '#667eea',
    backgroundColor: '#f8f9ff',
  },
  doctorName: {
    fontWeight: '700',
    color: '#667eea',
    fontSize: 16,
    marginBottom: 5,
  },
  hospitalName: {
    fontWeight: '700',
    color: '#333',
    fontSize: 16,
    marginBottom: 8,
  },
  scheduleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  availability: {
    backgroundColor: '#4caf50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  availabilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noScheduleBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffcdd2',
  },
  noScheduleText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  noScheduleSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  instructionBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  instructionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ScheduleSelectionScreen;