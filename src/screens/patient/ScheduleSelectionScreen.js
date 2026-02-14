import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Calendar} from 'react-native-calendars';

const ScheduleSelectionScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [existingAppointment, setExistingAppointment] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Feature #4: Doctor selection
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  // Feature #3: Calculate max date (28 days from today)
  const getMaxDate = () => {
    const max = new Date();
    max.setDate(max.getDate() + 28);
    return max.toISOString().split('T')[0];
  };

  useEffect(() => {
    loadSchedules();
    loadDoctors();
    checkExistingAppointment();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterSchedulesByDate(selectedDate);
    }
  }, [selectedDate, allSchedules, selectedDoctor]);

  const checkExistingAppointment = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      if (!currentPatientData) return;
      const currentPatient = JSON.parse(currentPatientData);

      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        const pending = appointments.find(
          apt =>
            apt.patientId === currentPatient.regNumber &&
            apt.status === 'pending',
        );
        setExistingAppointment(pending || null);
      }
    } catch (error) {
      console.error('Error checking appointments:', error);
    }
  };

  // Feature #4: Load all doctors
  const loadDoctors = async () => {
    try {
      const doctorsData = await AsyncStorage.getItem('doctors');
      if (doctorsData) {
        setDoctors(JSON.parse(doctorsData));
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const schedulesData = await AsyncStorage.getItem('doctorSchedules');
      if (schedulesData) {
        setAllSchedules(JSON.parse(schedulesData));
      } else {
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

    let filtered = allSchedules.filter(
      schedule => schedule.consultationDay === dayName,
    );

    // Feature #4: Filter by selected doctor if chosen
    if (selectedDoctor) {
      filtered = filtered.filter(
        schedule => schedule.doctorId === selectedDoctor.id,
      );
    }

    setAvailableSchedules(filtered);
  };

  // Feature #3: Cancel existing appointment
  const handleCancelAppointment = async () => {
    try {
      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        const updatedAppointments = appointments.map(apt => {
          if (apt.id === existingAppointment.id) {
            return {...apt, status: 'cancelled'};
          }
          return apt;
        });
        await AsyncStorage.setItem(
          'appointments',
          JSON.stringify(updatedAppointments),
        );
        setExistingAppointment(null);
        setShowCancelConfirm(false);
        Alert.alert(
          'Appointment Cancelled',
          'Your appointment has been cancelled. You can now book a new one.',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  // Feature #3: Handle date selection with 28-day check
  const handleDayPress = day => {
    const selected = new Date(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selected - today) / (1000 * 60 * 60 * 24));

    if (diffDays > 28) {
      Alert.alert(
        'Booking Limit',
        'Appointment slots are not opened yet for those days. Please try to avail appointment maximum 28 days in advance. Thank you.',
      );
      return;
    }

    setSelectedDate(day.dateString);
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

    // Feature #3: Block if existing pending appointment
    if (existingAppointment) {
      Alert.alert(
        'Existing Appointment',
        'You already have a pending appointment. Please cancel it first before booking a new one.',
      );
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

      // Find doctor name from schedule or doctors list
      let doctorName = selectedSchedule.doctorName || 'Doctor';
      if (selectedDoctor) {
        doctorName = selectedDoctor.fullName;
      }

      const appointment = {
        id: 'APT' + Date.now(),
        patientId: currentPatient.regNumber,
        patientName: currentPatient.fullName,
        scheduleId: selectedSchedule.id,
        doctorId: selectedSchedule.doctorId,
        doctorName: doctorName,
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

  // Feature #4: Filtered doctors for search
  const filteredDoctors = doctors.filter(
    d =>
      d.fullName.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      (d.specialization &&
        d.specialization
          .toLowerCase()
          .includes(doctorSearchQuery.toLowerCase())),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Book Appointment</Text>
        <Text style={styles.subHeaderText}>
          Select a doctor, pick a date, then choose a hospital
        </Text>

        {/* Feature #3: Show existing appointment with cancel/reschedule */}
        {existingAppointment && (
          <View style={styles.existingAppointmentBox}>
            <Text style={styles.existingTitle}>
              You have a pending appointment
            </Text>
            <Text style={styles.existingInfo}>
              {existingAppointment.doctorName} - {existingAppointment.hospitalName}
            </Text>
            <Text style={styles.existingInfo}>
              {existingAppointment.appointmentDate} at{' '}
              {existingAppointment.appointmentTime}
            </Text>
            <View style={styles.existingActions}>
              <TouchableOpacity
                style={styles.cancelAppointmentButton}
                onPress={() => setShowCancelConfirm(true)}>
                <Text style={styles.cancelAppointmentText}>
                  Cancel & Reschedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Cancel Confirmation Modal */}
        <Modal visible={showCancelConfirm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cancel Appointment?</Text>
              <Text style={styles.modalText}>
                Are you sure you want to cancel your appointment on{' '}
                {existingAppointment?.appointmentDate}? You can book a new one
                after cancellation.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowCancelConfirm(false)}>
                  <Text style={styles.modalCancelText}>Keep It</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleCancelAppointment}>
                  <Text style={styles.modalConfirmText}>
                    Yes, Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Feature #4: Doctor Selection */}
        <View style={styles.doctorSelectionSection}>
          <Text style={styles.sectionLabel}>Step 1: Select Doctor</Text>
          <TouchableOpacity
            style={styles.doctorSelector}
            onPress={() => setShowDoctorPicker(true)}>
            {selectedDoctor ? (
              <View>
                <Text style={styles.selectedDoctorName}>
                  {selectedDoctor.fullName}
                </Text>
                <Text style={styles.selectedDoctorSpec}>
                  {selectedDoctor.specialization || 'General'}
                </Text>
              </View>
            ) : (
              <Text style={styles.doctorPlaceholder}>
                Tap to select a doctor...
              </Text>
            )}
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {selectedDoctor && (
            <TouchableOpacity
              style={styles.clearDoctorBtn}
              onPress={() => {
                setSelectedDoctor(null);
                setSelectedSchedule(null);
              }}>
              <Text style={styles.clearDoctorText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Doctor Picker Modal */}
        <Modal visible={showDoctorPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.doctorPickerContent}>
              <Text style={styles.doctorPickerTitle}>Select a Doctor</Text>
              <TextInput
                style={styles.doctorSearchInput}
                placeholder="Search by name or specialization..."
                value={doctorSearchQuery}
                onChangeText={setDoctorSearchQuery}
              />
              <FlatList
                data={filteredDoctors}
                keyExtractor={item => item.id}
                style={styles.doctorList}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.doctorItem}
                    onPress={() => {
                      setSelectedDoctor(item);
                      setShowDoctorPicker(false);
                      setDoctorSearchQuery('');
                      setSelectedSchedule(null);
                    }}>
                    <Text style={styles.doctorItemName}>{item.fullName}</Text>
                    <Text style={styles.doctorItemSpec}>
                      {item.specialization || 'General'} •{' '}
                      {item.qualifications || ''}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyDoctorText}>
                    No doctors found. Try a different search.
                  </Text>
                }
              />
              <TouchableOpacity
                style={styles.closeDoctorPicker}
                onPress={() => {
                  setShowDoctorPicker(false);
                  setDoctorSearchQuery('');
                }}>
                <Text style={styles.closeDoctorPickerText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Calendar with 28-day limit */}
        <Text style={styles.sectionLabel}>Step 2: Select Date</Text>
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: '#667eea',
              },
            }}
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={getMaxDate()}
            theme={{
              selectedDayBackgroundColor: '#667eea',
              todayTextColor: '#667eea',
              arrowColor: '#667eea',
              disabledArrowColor: '#d9e1e8',
              textDisabledColor: '#d1d1d1',
            }}
          />
        </View>

        {/* Feature #3: 28-day notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            You can book appointments up to 28 days in advance.
          </Text>
        </View>

        {selectedDate ? (
          <>
            <View style={styles.selectedDateBox}>
              <Text style={styles.selectedDateText}>
                Selected: {new Date(selectedDate).toLocaleDateString('en-US', {
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
              {selectedDoctor ? ` for ${selectedDoctor.fullName}` : ''}
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
                    {schedule.doctorName || 'Doctor'}
                  </Text>
                  <Text style={styles.hospitalName}>
                    {schedule.hospitalName}
                  </Text>
                  <Text style={styles.scheduleInfo}>
                    {schedule.hospitalAddress}
                  </Text>
                  <Text style={styles.scheduleInfo}>
                    {schedule.timeStart} - {schedule.timeEnd}
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
                  No consultations available on {getDayName(selectedDate)}
                  {selectedDoctor
                    ? ` for ${selectedDoctor.fullName}`
                    : ''}
                </Text>
                <Text style={styles.noScheduleSubtext}>
                  Please select a different date
                  {selectedDoctor ? ' or try a different doctor' : ''}
                </Text>
              </View>
            )}

            {availableSchedules.length > 0 && !existingAppointment && (
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
              Please select a date from the calendar above
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
  // Feature #3: Existing appointment styles
  existingAppointmentBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
  },
  existingTitle: {
    fontWeight: '700',
    color: '#856404',
    fontSize: 16,
    marginBottom: 8,
  },
  existingInfo: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 3,
  },
  existingActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  cancelAppointmentButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  cancelAppointmentText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Feature #4: Doctor selection styles
  doctorSelectionSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  doctorSelector: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDoctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  selectedDoctorSpec: {
    fontSize: 13,
    color: '#667eea',
    marginTop: 2,
  },
  doctorPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#667eea',
  },
  clearDoctorBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  clearDoctorText: {
    color: '#dc3545',
    fontSize: 13,
    fontWeight: '600',
  },
  // Doctor Picker Modal
  doctorPickerContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: '70%',
  },
  doctorPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  doctorSearchInput: {
    backgroundColor: '#f5f7fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 15,
  },
  doctorList: {
    maxHeight: 300,
  },
  doctorItem: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  doctorItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  doctorItemSpec: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  emptyDoctorText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  closeDoctorPicker: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  closeDoctorPickerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Modal styles
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
    marginHorizontal: 30,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Calendar & rest
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noticeBox: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  noticeText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
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
    shadowOffset: {width: 0, height: 4},
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