import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView,
  Modal, FlatList, TextInput, Linking, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Calendar} from 'react-native-calendars';

const ScheduleSelectionScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  const getMaxDate = () => { const m = new Date(); m.setDate(m.getDate() + 28); return m.toISOString().split('T')[0]; };

  useEffect(() => { loadSchedules(); loadDoctors(); loadExistingAppointments(); }, []);
  useEffect(() => { if (selectedDate) filterSchedulesByDate(selectedDate); }, [selectedDate, allSchedules, selectedDoctor]);

  const loadExistingAppointments = async () => {
    try {
      const cp = await AsyncStorage.getItem('currentPatient');
      if (!cp) return;
      const patient = JSON.parse(cp);
      const data = await AsyncStorage.getItem('appointments');
      if (data) {
        setExistingAppointments(JSON.parse(data).filter(a => a.patientId === patient.regNumber && a.status === 'pending'));
      }
    } catch (e) { console.error(e); }
  };

  const loadDoctors = async () => {
    try {
      const d = await AsyncStorage.getItem('doctors');
      if (d) setDoctors(JSON.parse(d));
    } catch (e) { console.error(e); }
  };

  const loadSchedules = async () => {
    try {
      const d = await AsyncStorage.getItem('doctorSchedules');
      if (d) setAllSchedules(JSON.parse(d));
    } catch (e) { Alert.alert('Error', 'Failed to load schedules'); }
  };

  const getDayName = ds => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(ds).getDay()];
  };

  const parseTimeToMinutes = ts => {
    if (!ts) return 0;
    const m = ts.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1]); const mi = parseInt(m[2]); const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + mi;
  };

  const isScheduleBookable = (dateString, schedule) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateString > todayStr) return {bookable: true};
    if (dateString < todayStr) return {bookable: false, reason: 'Cannot book for past dates.'};
    // Same day
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = parseTimeToMinutes(schedule.timeStart);
    if (nowMin >= startMin - 30) {
      return {
        bookable: false,
        reason: `Booking closed. Schedule starts at ${schedule.timeStart} — booking closes 30 min before.`,
        emergencyContact: schedule.emergencyContact,
      };
    }
    return {bookable: true};
  };

  // #10: Calculate available slots (total - reserved - booked)
  const getAvailableSlots = schedule => {
    const reserved = schedule.reservedSlots ? schedule.reservedSlots.length : 0;
    const bookable = schedule.maxPatients - reserved;
    const booked = schedule.currentBookings || 0;
    return {total: schedule.maxPatients, reserved, bookable, available: Math.max(0, bookable - booked), booked};
  };

  const filterSchedulesByDate = dateString => {
    const dayName = getDayName(dateString);
    let filtered = allSchedules.filter(s => s.consultationDay === dayName);
    if (selectedDoctor) filtered = filtered.filter(s => s.doctorId === selectedDoctor.id);
    const enriched = filtered.map(sch => ({
      ...sch,
      bookableStatus: isScheduleBookable(dateString, sch),
      slotInfo: getAvailableSlots(sch), // #10
    }));
    setAvailableSchedules(enriched);
  };

  const getAppointmentCountForDoctor = doctorId => existingAppointments.filter(a => a.doctorId === doctorId).length;

  const handleDayPress = day => {
    const today = new Date().toISOString().split('T')[0];
    if (day.dateString < today) { Alert.alert('Invalid', 'Cannot book for past dates.'); return; }
    const diff = Math.ceil((new Date(day.dateString) - new Date(today)) / 86400000);
    if (diff > 28) { Alert.alert('Limit', 'Max 28 days in advance.'); return; }
    setSelectedDate(day.dateString);
    setSelectedSchedule(null);
  };

  const handleCancelAppointment = async id => {
    Alert.alert('Cancel?', 'Are you sure?', [
      {text: 'No', style: 'cancel'},
      {text: 'Yes', style: 'destructive', onPress: async () => {
        try {
          const d = await AsyncStorage.getItem('appointments');
          if (d) {
            await AsyncStorage.setItem('appointments', JSON.stringify(JSON.parse(d).map(a => a.id === id ? {...a, status: 'cancelled'} : a)));
            await loadExistingAppointments();
            Alert.alert('Cancelled');
          }
        } catch (e) { Alert.alert('Error'); }
      }},
    ]);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSchedule || !selectedDate) { Alert.alert('Error', 'Select a date and hospital'); return; }

    const bookStatus = isScheduleBookable(selectedDate, selectedSchedule);
    if (!bookStatus.bookable) {
      let msg = bookStatus.reason;
      if (bookStatus.emergencyContact) msg += `\n\nEmergency: ${bookStatus.emergencyContact}`;
      Alert.alert('Cannot Book', msg); return;
    }

    // #10: Check available slots
    const slotInfo = getAvailableSlots(selectedSchedule);
    if (slotInfo.available <= 0) {
      Alert.alert('Full', 'No available slots for this schedule.'); return;
    }

    if (getAppointmentCountForDoctor(selectedSchedule.doctorId) >= 2) {
      Alert.alert('Limit', 'You already have 2 pending appointments with this doctor.'); return;
    }

    try {
      const cp = await AsyncStorage.getItem('currentPatient');
      const patient = JSON.parse(cp);
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      let doctorName = selectedSchedule.doctorName || 'Doctor';
      if (selectedDoctor) doctorName = selectedDoctor.fullName;

      const appointment = {
        id: 'APT' + Date.now(), patientId: patient.regNumber, patientName: patient.fullName,
        scheduleId: selectedSchedule.id, doctorId: selectedSchedule.doctorId, doctorName,
        hospitalName: selectedSchedule.hospitalName, consultationDay: selectedSchedule.consultationDay,
        appointmentDate: formattedDate, appointmentTime: selectedSchedule.timeStart,
        appointmentEndTime: selectedSchedule.timeEnd,
        status: 'pending', bookedAt: new Date().toISOString(),
      };

      const aptsData = await AsyncStorage.getItem('appointments');
      const apts = aptsData ? JSON.parse(aptsData) : [];
      apts.push(appointment);
      await AsyncStorage.setItem('appointments', JSON.stringify(apts));

      // Update bookings count
      const updSch = allSchedules.map(s => s.id === selectedSchedule.id ? {...s, currentBookings: (s.currentBookings || 0) + 1} : s);
      await AsyncStorage.setItem('doctorSchedules', JSON.stringify(updSch));

      navigation.navigate('BookingConfirmation', {appointment, schedule: selectedSchedule});
    } catch (e) { Alert.alert('Error', 'Booking failed'); }
  };

  const filteredDoctors = doctors.filter(d =>
    d.fullName.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
    (d.specialization && d.specialization.toLowerCase().includes(doctorSearchQuery.toLowerCase())),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Book Appointment</Text>
        <Text style={styles.subText}>Select a doctor, date, then hospital</Text>

        {existingAppointments.length > 0 && (
          <View style={styles.existingBox}>
            <Text style={styles.existingTitle}>Pending ({existingAppointments.length}/2 max per doctor)</Text>
            {existingAppointments.map(a => (
              <View key={a.id} style={styles.existingItem}>
                <View style={{flex: 1}}>
                  <Text style={styles.existingDoc}>{a.doctorName}</Text>
                  <Text style={styles.existingInfo}>{a.appointmentDate} • {a.hospitalName}</Text>
                </View>
                <TouchableOpacity style={styles.cancelSmall} onPress={() => handleCancelAppointment(a.id)}>
                  <Text style={styles.cancelSmallText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Doctor Selection */}
        <Text style={styles.stepLabel}>Step 1: Select Doctor</Text>
        <TouchableOpacity style={styles.doctorSelector} onPress={() => setShowDoctorPicker(true)}>
          {selectedDoctor ? (
            <View><Text style={styles.selDocName}>{selectedDoctor.fullName}</Text><Text style={styles.selDocSpec}>{selectedDoctor.specialization || 'General'}</Text></View>
          ) : (<Text style={styles.docPlaceholder}>Tap to select a doctor...</Text>)}
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        {selectedDoctor && <TouchableOpacity onPress={() => {setSelectedDoctor(null); setSelectedSchedule(null);}}><Text style={styles.clearText}>Clear Selection</Text></TouchableOpacity>}

        <Modal visible={showDoctorPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>Select Doctor</Text>
              <TextInput style={styles.pickerSearch} placeholder="Search..." value={doctorSearchQuery} onChangeText={setDoctorSearchQuery} />
              <FlatList data={filteredDoctors} keyExtractor={i => i.id} style={{maxHeight: 300}} renderItem={({item}) => (
                <TouchableOpacity style={styles.docItem} onPress={() => {setSelectedDoctor(item); setShowDoctorPicker(false); setDoctorSearchQuery(''); setSelectedSchedule(null);}}>
                  <Text style={styles.docItemName}>{item.fullName}</Text>
                  <Text style={styles.docItemSpec}>{item.specialization || 'General'}</Text>
                </TouchableOpacity>
              )} ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>} />
              <TouchableOpacity style={styles.pickerClose} onPress={() => {setShowDoctorPicker(false); setDoctorSearchQuery('');}}>
                <Text style={styles.pickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.stepLabel}>Step 2: Select Date</Text>
        <View style={styles.calBox}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{[selectedDate]: {selected: true, selectedColor: '#667eea'}}}
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={getMaxDate()}
            theme={{selectedDayBackgroundColor: '#667eea', todayTextColor: '#667eea', arrowColor: '#667eea', textDisabledColor: '#d1d1d1'}}
          />
        </View>

        {selectedDate ? (
          <>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxText}>
                {new Date(selectedDate).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Available on {getDayName(selectedDate)}{selectedDoctor ? ` for ${selectedDoctor.fullName}` : ''}
            </Text>

            {availableSchedules.length > 0 ? (
              availableSchedules.map(schedule => {
                const isBookable = schedule.bookableStatus?.bookable !== false;
                const si = schedule.slotInfo; // #10
                return (
                  <TouchableOpacity key={schedule.id}
                    style={[styles.schCard, selectedSchedule?.id === schedule.id && styles.schCardSel, !isBookable && styles.schCardOff]}
                    onPress={() => {
                      if (!isBookable) {
                        let msg = schedule.bookableStatus.reason;
                        if (schedule.bookableStatus.emergencyContact) msg += `\n\nEmergency: ${schedule.bookableStatus.emergencyContact}`;
                        Alert.alert('Closed', msg, [
                          {text: 'OK'},
                          schedule.bookableStatus.emergencyContact ? {text: 'Call', onPress: () => Linking.openURL(`tel:${schedule.bookableStatus.emergencyContact}`)} : null,
                        ].filter(Boolean));
                        return;
                      }
                      setSelectedSchedule(schedule);
                    }} activeOpacity={0.7}>
                    <Text style={styles.schDoctor}>{schedule.doctorName || 'Doctor'}</Text>
                    <Text style={styles.schHospital}>{schedule.hospitalName}</Text>
                    <Text style={styles.schInfo}>{schedule.hospitalAddress}</Text>
                    <Text style={styles.schInfo}>{schedule.timeStart} - {schedule.timeEnd}</Text>

                    {schedule.emergencyContact ? (
                      <TouchableOpacity style={styles.emergRow} onPress={() => Linking.openURL(`tel:${schedule.emergencyContact}`)}>
                        <Text style={styles.emergText}>📞 Emergency: {schedule.emergencyContact}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* #10: Show available/total with reserved info */}
                    <View style={styles.slotRow}>
                      <View style={[styles.slotBadge, !isBookable && {backgroundColor: '#dc3545'}, si.available === 0 && {backgroundColor: '#dc3545'}]}>
                        <Text style={styles.slotBadgeText}>
                          {isBookable ? `${si.available}/${si.bookable} slots` : 'CLOSED'}
                        </Text>
                      </View>
                      {si.reserved > 0 && (
                        <Text style={styles.reservedNote}>{si.reserved} slot{si.reserved > 1 ? 's' : ''} reserved by doctor</Text>
                      )}
                      {!isBookable && <Text style={styles.closedHint}>Booking closed</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noSchBox}>
                <Text style={styles.noSchText}>No consultations on {getDayName(selectedDate)}</Text>
              </View>
            )}

            {availableSchedules.some(s => s.bookableStatus?.bookable !== false) && (
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.instrBox}><Text style={styles.instrText}>Select a date from the calendar</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 40},
  headerText: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 6},
  subText: {fontSize: 14, color: '#666', marginBottom: 20},
  existingBox: {backgroundColor: '#fff3cd', borderWidth: 2, borderColor: '#ffc107', borderRadius: 12, padding: 14, marginBottom: 18},
  existingTitle: {fontWeight: '700', color: '#856404', fontSize: 14, marginBottom: 8},
  existingItem: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5},
  existingDoc: {fontSize: 14, fontWeight: '600', color: '#333'},
  existingInfo: {fontSize: 12, color: '#666', marginTop: 2},
  cancelSmall: {backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6},
  cancelSmallText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  stepLabel: {fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10, marginTop: 5},
  doctorSelector: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#667eea', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5},
  selDocName: {fontSize: 16, fontWeight: '700', color: '#333'},
  selDocSpec: {fontSize: 13, color: '#667eea', marginTop: 2},
  docPlaceholder: {fontSize: 15, color: '#999'},
  arrow: {fontSize: 12, color: '#667eea'},
  clearText: {color: '#dc3545', fontSize: 13, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 15, marginTop: 5},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
  pickerContent: {backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxHeight: '70%'},
  pickerTitle: {fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center'},
  pickerSearch: {backgroundColor: '#f5f7fa', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12},
  docItem: {backgroundColor: '#f8f9ff', padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  docItemName: {fontSize: 16, fontWeight: '700', color: '#333'},
  docItemSpec: {fontSize: 13, color: '#666', marginTop: 2},
  emptyText: {textAlign: 'center', color: '#999', padding: 20},
  pickerClose: {backgroundColor: '#667eea', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8},
  pickerCloseText: {color: '#fff', fontWeight: '600', fontSize: 16},
  calBox: {backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 15, elevation: 3},
  dateBox: {backgroundColor: '#e8f4f8', padding: 12, borderRadius: 10, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  dateBoxText: {fontSize: 15, fontWeight: '600', color: '#333'},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10},
  schCard: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, padding: 14, marginBottom: 12},
  schCardSel: {borderColor: '#667eea', backgroundColor: '#f8f9ff'},
  schCardOff: {opacity: 0.7, backgroundColor: '#f9f9f9'},
  schDoctor: {fontWeight: '700', color: '#667eea', fontSize: 16, marginBottom: 4},
  schHospital: {fontWeight: '700', color: '#333', fontSize: 15, marginBottom: 6},
  schInfo: {fontSize: 13, color: '#666', marginBottom: 3},
  emergRow: {backgroundColor: '#fff3cd', padding: 8, borderRadius: 8, marginTop: 6},
  emergText: {fontSize: 13, color: '#856404', fontWeight: '600'},
  // #10: Slot display
  slotRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8},
  slotBadge: {backgroundColor: '#4caf50', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20},
  slotBadgeText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  reservedNote: {fontSize: 11, color: '#856404', fontStyle: 'italic'},
  closedHint: {fontSize: 12, color: '#dc3545', fontWeight: '600'},
  noSchBox: {backgroundColor: '#fff', padding: 25, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#ffcdd2'},
  noSchText: {fontSize: 15, color: '#d32f2f', fontWeight: '600', textAlign: 'center'},
  instrBox: {backgroundColor: '#fff', padding: 30, borderRadius: 12, alignItems: 'center', marginTop: 15},
  instrText: {fontSize: 15, color: '#666', textAlign: 'center'},
  confirmBtn: {backgroundColor: '#667eea', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 15, elevation: 4},
  confirmBtnText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
});

export default ScheduleSelectionScreen;