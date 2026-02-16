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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Calendar} from 'react-native-calendars';

const ScheduleSelectionScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);

  // Doctor selection
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  const getMaxDate = () => {
    const max = new Date();
    max.setDate(max.getDate() + 28);
    return max.toISOString().split('T')[0];
  };

  useEffect(() => {
    loadSchedules();
    loadDoctors();
    loadExistingAppointments();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterSchedulesByDate(selectedDate);
    }
  }, [selectedDate, allSchedules, selectedDoctor]);

  const loadExistingAppointments = async () => {
    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      if (!currentPatientData) return;
      const currentPatient = JSON.parse(currentPatientData);
      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        const patientApts = appointments.filter(
          apt => apt.patientId === currentPatient.regNumber && apt.status === 'pending',
        );
        setExistingAppointments(patientApts);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const doctorsData = await AsyncStorage.getItem('doctors');
      if (doctorsData) setDoctors(JSON.parse(doctorsData));
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
            id: 'SCH001', doctorId: 'DOC001', doctorName: 'Dr. Sarah Wilson',
            hospitalName: 'City General Hospital', hospitalAddress: '123 Medical Center Drive',
            consultationDay: 'Saturday', timeStart: '02:00 PM', timeEnd: '04:00 PM',
            maxPatients: 15, currentBookings: 7, emergencyContact: '',
          },
          {
            id: 'SCH002', doctorId: 'DOC001', doctorName: 'Dr. Sarah Wilson',
            hospitalName: 'City General Hospital', hospitalAddress: '123 Medical Center Drive',
            consultationDay: 'Monday', timeStart: '06:00 AM', timeEnd: '08:00 AM',
            maxPatients: 10, currentBookings: 3, emergencyContact: '',
          },
          {
            id: 'SCH003', doctorId: 'DOC001', doctorName: 'Dr. Sarah Wilson',
            hospitalName: "Children's Care Clinic", hospitalAddress: '456 Pediatric Avenue',
            consultationDay: 'Wednesday', timeStart: '04:00 PM', timeEnd: '07:00 PM',
            maxPatients: 25, currentBookings: 7, emergencyContact: '',
          },
        ];
        await AsyncStorage.setItem('doctorSchedules', JSON.stringify(demoSchedules));
        setAllSchedules(demoSchedules);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load schedules');
    }
  };

  const getDayName = dateString => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Change #6: Parse time string to minutes since midnight
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

  // Change #6: Check if schedule is still bookable (30 min before start)
  const isScheduleBookable = (dateString, schedule) => {
    const selectedDateObj = new Date(dateString);
    const today = new Date();

    // If selected date is in the future (not today), always bookable
    const todayStr = today.toISOString().split('T')[0];
    if (dateString > todayStr) return {bookable: true};

    // If selected date is today, check time
    if (dateString === todayStr) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const startMinutes = parseTimeToMinutes(schedule.timeStart);
      const cutoffMinutes = startMinutes - 30; // 30 minutes before start

      if (nowMinutes >= cutoffMinutes) {
        return {
          bookable: false,
          reason: `Booking closed for today. Schedule starts at ${schedule.timeStart} and booking closes 30 minutes before.`,
          emergencyContact: schedule.emergencyContact,
        };
      }
    }

    // Past date
    if (dateString < todayStr) {
      return {bookable: false, reason: 'Cannot book appointments for past dates.'};
    }

    return {bookable: true};
  };

  const filterSchedulesByDate = dateString => {
    const dayName = getDayName(dateString);
    let filtered = allSchedules.filter(s => s.consultationDay === dayName);
    if (selectedDoctor) {
      filtered = filtered.filter(s => s.doctorId === selectedDoctor.id);
    }

    // Change #6: Mark each schedule with bookability
    const enriched = filtered.map(sch => {
      const status = isScheduleBookable(dateString, sch);
      return {...sch, bookableStatus: status};
    });

    setAvailableSchedules(enriched);
  };

  // Change #1: Count appointments for specific doctor
  const getAppointmentCountForDoctor = doctorId => {
    return existingAppointments.filter(apt => apt.doctorId === doctorId).length;
  };

  const handleDayPress = day => {
    const today = new Date().toISOString().split('T')[0];
    if (day.dateString < today) {
      Alert.alert('Invalid Date', 'Cannot book appointments for past dates.');
      return;
    }
    const selected = new Date(day.dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selected - todayDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 28) {
      Alert.alert(
        'Booking Limit',
        'Appointment slots are not opened yet for those days. Please try to avail appointment maximum 28 days in advance. Thank you.',
      );
      return;
    }
    setSelectedDate(day.dateString);
    setSelectedSchedule(null);
  };

  // Change #1: Cancel a specific appointment
  const handleCancelAppointment = async appointmentId => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const appointmentsData = await AsyncStorage.getItem('appointments');
            if (appointmentsData) {
              const apts = JSON.parse(appointmentsData);
              const updated = apts.map(a => a.id === appointmentId ? {...a, status: 'cancelled'} : a);
              await AsyncStorage.setItem('appointments', JSON.stringify(updated));
              await loadExistingAppointments();
              Alert.alert('Cancelled', 'Appointment cancelled successfully.');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel');
          }
        },
      },
    ]);
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

    // Change #6: Check if still bookable
    const bookStatus = isScheduleBookable(selectedDate, selectedSchedule);
    if (!bookStatus.bookable) {
      let msg = bookStatus.reason;
      if (bookStatus.emergencyContact) {
        msg += `\n\nFor urgent appointments, contact: ${bookStatus.emergencyContact}`;
      }
      Alert.alert('Cannot Book', msg);
      return;
    }

    // Change #1: Allow max 2 pending appointments per doctor
    const doctorId = selectedSchedule.doctorId;
    const countForDoctor = getAppointmentCountForDoctor(doctorId);
    if (countForDoctor >= 2) {
      Alert.alert(
        'Booking Limit Reached',
        `You already have 2 pending appointments with this doctor. Please cancel one to book a new slot.`,
      );
      return;
    }

    try {
      const currentPatientData = await AsyncStorage.getItem('currentPatient');
      const currentPatient = JSON.parse(currentPatientData);

      const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });

      let doctorName = selectedSchedule.doctorName || 'Doctor';
      if (selectedDoctor) doctorName = selectedDoctor.fullName;

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

      const updatedSchedules = allSchedules.map(sch =>
        sch.id === selectedSchedule.id ? {...sch, currentBookings: sch.currentBookings + 1} : sch,
      );
      await AsyncStorage.setItem('doctorSchedules', JSON.stringify(updatedSchedules));

      navigation.navigate('BookingConfirmation', {appointment, schedule: selectedSchedule});
    } catch (error) {
      Alert.alert('Error', 'Booking failed. Please try again.');
    }
  };

  const filteredDoctors = doctors.filter(
    d =>
      d.fullName.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      (d.specialization && d.specialization.toLowerCase().includes(doctorSearchQuery.toLowerCase())),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Book Appointment</Text>
        <Text style={styles.subHeaderText}>Select a doctor, pick a date, then choose a hospital</Text>

        {/* Change #1: Show existing appointments with cancel option */}
        {existingAppointments.length > 0 && (
          <View style={styles.existingBox}>
            <Text style={styles.existingTitle}>
              Your Pending Appointments ({existingAppointments.length}/2 max per doctor)
            </Text>
            {existingAppointments.map(apt => (
              <View key={apt.id} style={styles.existingItem}>
                <View style={{flex: 1}}>
                  <Text style={styles.existingDoc}>{apt.doctorName}</Text>
                  <Text style={styles.existingInfo}>{apt.appointmentDate} • {apt.hospitalName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelSmallBtn}
                  onPress={() => handleCancelAppointment(apt.id)}>
                  <Text style={styles.cancelSmallText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Doctor Selection */}
        <View style={styles.doctorSection}>
          <Text style={styles.sectionLabel}>Step 1: Select Doctor</Text>
          <TouchableOpacity style={styles.doctorSelector} onPress={() => setShowDoctorPicker(true)}>
            {selectedDoctor ? (
              <View>
                <Text style={styles.selectedDoctorName}>{selectedDoctor.fullName}</Text>
                <Text style={styles.selectedDoctorSpec}>{selectedDoctor.specialization || 'General'}</Text>
              </View>
            ) : (
              <Text style={styles.doctorPlaceholder}>Tap to select a doctor...</Text>
            )}
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          {selectedDoctor && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => {setSelectedDoctor(null); setSelectedSchedule(null);}}>
              <Text style={styles.clearText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Doctor Picker Modal */}
        <Modal visible={showDoctorPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.doctorPickerContent}>
              <Text style={styles.pickerTitle}>Select a Doctor</Text>
              <TextInput
                style={styles.pickerSearch}
                placeholder="Search by name or specialization..."
                value={doctorSearchQuery}
                onChangeText={setDoctorSearchQuery}
              />
              <FlatList
                data={filteredDoctors}
                keyExtractor={item => item.id}
                style={{maxHeight: 300}}
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
                    <Text style={styles.doctorItemSpec}>{item.specialization || 'General'} • {item.qualifications || ''}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>}
              />
              <TouchableOpacity style={styles.pickerClose} onPress={() => {setShowDoctorPicker(false); setDoctorSearchQuery('');}}>
                <Text style={styles.pickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Calendar */}
        <Text style={styles.sectionLabel}>Step 2: Select Date</Text>
        <View style={styles.calendarBox}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{[selectedDate]: {selected: true, selectedColor: '#667eea'}}}
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={getMaxDate()}
            theme={{
              selectedDayBackgroundColor: '#667eea',
              todayTextColor: '#667eea',
              arrowColor: '#667eea',
              textDisabledColor: '#d1d1d1',
            }}
          />
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>Book up to 28 days in advance. Max 2 appointments per doctor.</Text>
        </View>

        {selectedDate ? (
          <>
            <View style={styles.selectedDateBox}>
              <Text style={styles.selectedDateText}>
                {new Date(selectedDate).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Available Hospitals on {getDayName(selectedDate)}
              {selectedDoctor ? ` for ${selectedDoctor.fullName}` : ''}
            </Text>

            {availableSchedules.length > 0 ? (
              availableSchedules.map(schedule => {
                const isBookable = schedule.bookableStatus?.bookable !== false;
                return (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.scheduleCard,
                      selectedSchedule?.id === schedule.id && styles.scheduleCardSelected,
                      !isBookable && styles.scheduleCardDisabled,
                    ]}
                    onPress={() => {
                      if (!isBookable) {
                        let msg = schedule.bookableStatus.reason;
                        if (schedule.bookableStatus.emergencyContact) {
                          msg += `\n\nEmergency Contact: ${schedule.bookableStatus.emergencyContact}`;
                        }
                        Alert.alert('Booking Closed', msg, [
                          {text: 'OK'},
                          schedule.bookableStatus.emergencyContact
                            ? {
                                text: 'Call Now',
                                onPress: () => Linking.openURL(`tel:${schedule.bookableStatus.emergencyContact}`),
                              }
                            : null,
                        ].filter(Boolean));
                        return;
                      }
                      setSelectedSchedule(schedule);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.doctorName}>{schedule.doctorName || 'Doctor'}</Text>
                    <Text style={styles.hospitalName}>{schedule.hospitalName}</Text>
                    <Text style={styles.scheduleInfo}>{schedule.hospitalAddress}</Text>
                    <Text style={styles.scheduleInfo}>{schedule.timeStart} - {schedule.timeEnd}</Text>

                    {/* Change #6: Show emergency contact */}
                    {schedule.emergencyContact ? (
                      <TouchableOpacity
                        style={styles.emergencyRow}
                        onPress={() => Linking.openURL(`tel:${schedule.emergencyContact}`)}>
                        <Text style={styles.emergencyText}>
                          📞 Emergency: {schedule.emergencyContact}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <View style={styles.availRow}>
                      <View style={[styles.availability, !isBookable && {backgroundColor: '#dc3545'}]}>
                        <Text style={styles.availabilityText}>
                          {isBookable
                            ? `${schedule.maxPatients - schedule.currentBookings}/${schedule.maxPatients} slots`
                            : 'CLOSED'}
                        </Text>
                      </View>
                      {!isBookable && (
                        <Text style={styles.closedHint}>Booking closed for today</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noScheduleBox}>
                <Text style={styles.noScheduleText}>No consultations available on {getDayName(selectedDate)}</Text>
                <Text style={styles.noScheduleSubtext}>Please select a different date</Text>
              </View>
            )}

            {availableSchedules.some(s => s.bookableStatus?.bookable !== false) && (
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking} activeOpacity={0.8}>
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>Please select a date from the calendar above</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 40},
  headerText: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8},
  subHeaderText: {fontSize: 14, color: '#666', marginBottom: 20},
  // Existing appointments
  existingBox: {backgroundColor: '#fff3cd', borderWidth: 2, borderColor: '#ffc107', borderRadius: 15, padding: 15, marginBottom: 20},
  existingTitle: {fontWeight: '700', color: '#856404', fontSize: 14, marginBottom: 10},
  existingItem: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 6},
  existingDoc: {fontSize: 14, fontWeight: '600', color: '#333'},
  existingInfo: {fontSize: 12, color: '#666', marginTop: 2},
  cancelSmallBtn: {backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6},
  cancelSmallText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  // Doctor selection
  doctorSection: {marginBottom: 20},
  sectionLabel: {fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10},
  doctorSelector: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#667eea', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  selectedDoctorName: {fontSize: 16, fontWeight: '700', color: '#333'},
  selectedDoctorSpec: {fontSize: 13, color: '#667eea', marginTop: 2},
  doctorPlaceholder: {fontSize: 15, color: '#999'},
  dropdownArrow: {fontSize: 12, color: '#667eea'},
  clearBtn: {alignSelf: 'flex-end', marginTop: 8},
  clearText: {color: '#dc3545', fontSize: 13, fontWeight: '600'},
  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
  doctorPickerContent: {backgroundColor: '#fff', borderRadius: 20, padding: 20, marginHorizontal: 20, maxHeight: '70%', width: '90%'},
  pickerTitle: {fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center'},
  pickerSearch: {backgroundColor: '#f5f7fa', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 15},
  doctorItem: {backgroundColor: '#f8f9ff', padding: 15, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  doctorItemName: {fontSize: 16, fontWeight: '700', color: '#333'},
  doctorItemSpec: {fontSize: 13, color: '#666', marginTop: 3},
  emptyText: {textAlign: 'center', color: '#999', padding: 20},
  pickerClose: {backgroundColor: '#667eea', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10},
  pickerCloseText: {color: '#fff', fontWeight: '600', fontSize: 16},
  // Calendar
  calendarBox: {backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4},
  noticeBox: {backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, marginBottom: 15},
  noticeText: {fontSize: 12, color: '#1976d2', textAlign: 'center'},
  selectedDateBox: {backgroundColor: '#e8f4f8', padding: 12, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  selectedDateText: {fontSize: 15, fontWeight: '600', color: '#333'},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12},
  // Schedule cards
  scheduleCard: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 15, padding: 15, marginBottom: 15},
  scheduleCardSelected: {borderColor: '#667eea', backgroundColor: '#f8f9ff'},
  scheduleCardDisabled: {opacity: 0.7, backgroundColor: '#f9f9f9'},
  doctorName: {fontWeight: '700', color: '#667eea', fontSize: 16, marginBottom: 5},
  hospitalName: {fontWeight: '700', color: '#333', fontSize: 16, marginBottom: 8},
  scheduleInfo: {fontSize: 14, color: '#666', marginBottom: 4},
  emergencyRow: {backgroundColor: '#fff3cd', padding: 8, borderRadius: 8, marginTop: 6, marginBottom: 4},
  emergencyText: {fontSize: 13, color: '#856404', fontWeight: '600'},
  availRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6},
  availability: {backgroundColor: '#4caf50', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20},
  availabilityText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  closedHint: {fontSize: 12, color: '#dc3545', fontWeight: '600'},
  noScheduleBox: {backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', borderWidth: 2, borderColor: '#ffcdd2'},
  noScheduleText: {fontSize: 16, color: '#d32f2f', fontWeight: '600', marginBottom: 5, textAlign: 'center'},
  noScheduleSubtext: {fontSize: 13, color: '#999', textAlign: 'center'},
  instructionBox: {backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', marginTop: 20},
  instructionText: {fontSize: 15, color: '#666', textAlign: 'center'},
  confirmButton: {backgroundColor: '#667eea', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 20, elevation: 4, shadowColor: '#667eea', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8},
  confirmButtonText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
});

export default ScheduleSelectionScreen;