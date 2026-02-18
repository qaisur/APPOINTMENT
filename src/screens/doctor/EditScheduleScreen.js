import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, Platform, Modal} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const EditScheduleScreen = ({navigation, route}) => {
  const {scheduleId} = route.params;
  const [schedule, setSchedule] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [consultationDay, setConsultationDay] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [maxPatients, setMaxPatients] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [reservedSlots, setReservedSlots] = useState([]);
  const [affectedCount, setAffectedCount] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [tempTime, setTempTime] = useState(new Date());

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => { loadSchedule(); }, []);

  const loadSchedule = async () => {
    try {
      const data = await AsyncStorage.getItem('doctorSchedules');
      if (!data) return;
      const sch = JSON.parse(data).find(s => s.id === scheduleId);
      if (!sch) { Alert.alert('Error', 'Schedule not found'); navigation.goBack(); return; }
      setSchedule(sch);
      setHospitalName(sch.hospitalName);
      setHospitalAddress(sch.hospitalAddress || '');
      setConsultationDay(sch.consultationDay);
      setTimeStart(sch.timeStart);
      setTimeEnd(sch.timeEnd);
      setMaxPatients(String(sch.maxPatients));
      setEmergencyContact(sch.emergencyContact || '');
      setReservedSlots(sch.reservedSlots || []);

      // Count affected appointments
      const aptsData = await AsyncStorage.getItem('appointments');
      if (aptsData) {
        const affected = JSON.parse(aptsData).filter(a => a.scheduleId === scheduleId && a.status === 'pending');
        setAffectedCount(affected.length);
      }
    } catch (e) { console.error(e); }
  };

  const formatTime = date => {
    if (!date) return '';
    let h = date.getHours(); const m = date.getMinutes().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h || 12;
    return `${h.toString().padStart(2, '0')}:${m} ${ap}`;
  };

  const openTimePicker = field => {
    setTempTime(new Date()); setActiveField(field); setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') { setShowTimePicker(false); return; }
    if (selectedTime) {
      const ft = formatTime(selectedTime);
      if (activeField === 'start') setTimeStart(ft);
      else setTimeEnd(ft);
      setTempTime(selectedTime);
      if (Platform.OS === 'android') setActiveField(null);
    }
  };

  const toggleReservedSlot = num => {
    if (reservedSlots.includes(num)) setReservedSlots(reservedSlots.filter(n => n !== num));
    else setReservedSlots([...reservedSlots, num]);
  };

  const hasChanges = () => {
    if (!schedule) return false;
    return hospitalName !== schedule.hospitalName || consultationDay !== schedule.consultationDay ||
      timeStart !== schedule.timeStart || timeEnd !== schedule.timeEnd ||
      maxPatients !== String(schedule.maxPatients);
  };

  // #11: Save and handle affected appointments
  const handleSave = async () => {
    if (!hospitalName || !consultationDay || !timeStart || !timeEnd || !maxPatients) {
      Alert.alert('Error', 'Please fill all required fields'); return;
    }

    const dayOrTimeChanged = consultationDay !== schedule.consultationDay || timeStart !== schedule.timeStart || timeEnd !== schedule.timeEnd;

    if (dayOrTimeChanged && affectedCount > 0) {
      Alert.alert(
        '⚠️ Schedule Change Warning',
        `Changing the day/time will cancel ${affectedCount} pending appointment(s). Affected patients will be notified.\n\nContinue?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Yes, Update', style: 'destructive', onPress: () => saveSchedule(true)},
        ],
      );
    } else {
      saveSchedule(false);
    }
  };

  const saveSchedule = async (cancelAffected) => {
    try {
      // Update schedule
      const schData = await AsyncStorage.getItem('doctorSchedules');
      const allSch = schData ? JSON.parse(schData) : [];
      const updatedSch = allSch.map(s => {
        if (s.id !== scheduleId) return s;
        return {
          ...s, hospitalName, hospitalAddress, consultationDay,
          timeStart, timeEnd, maxPatients: parseInt(maxPatients),
          emergencyContact, reservedSlots, updatedAt: new Date().toISOString(),
        };
      });
      await AsyncStorage.setItem('doctorSchedules', JSON.stringify(updatedSch));

      // #11: Cancel affected appointments and create notifications
      if (cancelAffected) {
        const aptsData = await AsyncStorage.getItem('appointments');
        if (aptsData) {
          const allApts = JSON.parse(aptsData);
          const notificationMessages = [];

          const updated = allApts.map(a => {
            if (a.scheduleId === scheduleId && a.status === 'pending') {
              notificationMessages.push({
                id: 'NOTIF' + Date.now() + Math.random().toString(36).substr(2, 5),
                patientId: a.patientId,
                type: 'schedule_change',
                title: 'Appointment Cancelled',
                message: `Due to changes in ${a.doctorName}'s consultation schedule, your appointment on ${a.appointmentDate} at ${a.hospitalName} has been cancelled. Please visit the application for rescheduling. Sorry for the inconvenience. Thank you.`,
                createdAt: new Date().toISOString(),
                read: false,
              });
              return {...a, status: 'cancelled', cancelReason: 'schedule_changed'};
            }
            return a;
          });

          await AsyncStorage.setItem('appointments', JSON.stringify(updated));

          // Store notifications
          const existingNotifs = await AsyncStorage.getItem('notifications');
          const notifs = existingNotifs ? JSON.parse(existingNotifs) : [];
          await AsyncStorage.setItem('notifications', JSON.stringify([...notifs, ...notificationMessages]));
        }
      }

      Alert.alert('Updated', 'Schedule updated successfully!' + (cancelAffected ? `\n${affectedCount} appointment(s) cancelled with notifications sent.` : ''), [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Schedule', `This will permanently delete this schedule${affectedCount > 0 ? ` and cancel ${affectedCount} pending appointment(s)` : ''}. Continue?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const schData = await AsyncStorage.getItem('doctorSchedules');
          if (schData) {
            const filtered = JSON.parse(schData).filter(s => s.id !== scheduleId);
            await AsyncStorage.setItem('doctorSchedules', JSON.stringify(filtered));
          }
          // Cancel appointments
          if (affectedCount > 0) await saveSchedule(true);
          else {
            Alert.alert('Deleted', 'Schedule removed.', [{text: 'OK', onPress: () => navigation.goBack()}]);
          }
        } catch (e) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  if (!schedule) return <SafeAreaView style={styles.container}><View style={styles.center}><Text>Loading...</Text></View></SafeAreaView>;

  const maxPat = parseInt(maxPatients) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Edit Schedule</Text>
        {affectedCount > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {affectedCount} pending appointment(s) exist for this schedule. Changing day or time will cancel them and notify patients.</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital Name *</Text>
          <TextInput style={styles.input} value={hospitalName} onChangeText={setHospitalName} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital Address</Text>
          <TextInput style={[styles.input, {minHeight: 60}]} value={hospitalAddress} onChangeText={setHospitalAddress} multiline textAlignVertical="top" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Consultation Day *</Text>
          <View style={styles.daySelector}>
            {days.map(day => (
              <TouchableOpacity key={day} style={[styles.dayBtn, consultationDay === day && styles.dayBtnSel]}
                onPress={() => setConsultationDay(day)}>
                <Text style={[styles.dayBtnText, consultationDay === day && styles.dayBtnTextSel]}>{day.substr(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={[styles.inputGroup, {flex: 1}]}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity style={styles.timeBtn} onPress={() => openTimePicker('start')}>
              <Text style={styles.timeBtnText}>{timeStart || '🕐 Select'}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, {flex: 1}]}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity style={styles.timeBtn} onPress={() => openTimePicker('end')}>
              <Text style={styles.timeBtnText}>{timeEnd || '🕐 Select'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="default" onChange={handleTimeChange} />
        )}
        {showTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.timeModalOverlay}>
              <View style={styles.timeModalContent}>
                <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} style={{height: 200}} />
                <TouchableOpacity style={styles.timeModalDone} onPress={() => {setShowTimePicker(false); setActiveField(null);}}>
                  <Text style={styles.timeModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maximum Patients *</Text>
          <TextInput style={styles.input} value={maxPatients} onChangeText={t => {setMaxPatients(t); setReservedSlots([]);}} keyboardType="number-pad" />
        </View>

        {maxPat > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reserved Slots ({reservedSlots.length})</Text>
            <View style={styles.slotGrid}>
              {Array.from({length: maxPat}, (_, i) => i + 1).map(num => (
                <TouchableOpacity key={num} style={[styles.slotChip, reservedSlots.includes(num) && styles.slotChipRes]}
                  onPress={() => toggleReservedSlot(num)}>
                  <Text style={[styles.slotChipText, reservedSlots.includes(num) && styles.slotChipTextRes]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput style={styles.input} value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" maxLength={15} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scrollContent: {padding: 20, paddingBottom: 40},
  headerText: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15},
  warningBox: {backgroundColor: '#fff3cd', borderWidth: 2, borderColor: '#ffc107', borderRadius: 12, padding: 14, marginBottom: 20},
  warningText: {fontSize: 13, color: '#856404', lineHeight: 20},
  inputGroup: {marginBottom: 16},
  label: {fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8},
  input: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, color: '#333'},
  daySelector: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  dayBtn: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0'},
  dayBtnSel: {backgroundColor: '#667eea', borderColor: '#667eea'},
  dayBtnText: {fontSize: 13, fontWeight: '600', color: '#666'},
  dayBtnTextSel: {color: '#fff'},
  timeRow: {flexDirection: 'row', gap: 10},
  timeBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#667eea', borderRadius: 10, padding: 14, alignItems: 'center'},
  timeBtnText: {fontSize: 15, fontWeight: '600', color: '#667eea'},
  timeModalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  timeModalContent: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40},
  timeModalDone: {backgroundColor: '#667eea', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 10},
  timeModalDoneText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  slotGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  slotChip: {width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center'},
  slotChipRes: {backgroundColor: '#dc3545', borderColor: '#dc3545'},
  slotChipText: {fontSize: 14, fontWeight: '600', color: '#333'},
  slotChipTextRes: {color: '#fff'},
  saveBtn: {backgroundColor: '#667eea', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 10},
  saveBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  deleteBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#dc3545', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10},
  deleteBtnText: {color: '#dc3545', fontSize: 16, fontWeight: '600'},
  cancelBtn: {padding: 14, alignItems: 'center'},
  cancelBtnText: {color: '#666', fontSize: 15},
});

export default EditScheduleScreen;