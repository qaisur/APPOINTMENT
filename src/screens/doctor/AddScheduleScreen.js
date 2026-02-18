import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  SafeAreaView, Modal, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddScheduleScreen = ({navigation}) => {
  const [schedules, setSchedules] = useState([{
    hospitalName: '', hospitalAddress: '', consultationDays: ['Saturday'],
    timeStart: '', timeEnd: '', timeStartDate: null, timeEndDate: null,
    maxPatients: '', reservedSlots: [], // #10: reserved slot numbers
  }]);
  const [emergencyContact, setEmergencyContact] = useState('');

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState(null);
  const [tempTime, setTempTime] = useState(new Date());

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddSlot = () => {
    setSchedules([...schedules, {
      hospitalName: '', hospitalAddress: '', consultationDays: ['Saturday'],
      timeStart: '', timeEnd: '', timeStartDate: null, timeEndDate: null,
      maxPatients: '', reservedSlots: [],
    }]);
  };

  const handleRemoveSlot = index => {
    if (schedules.length === 1) { Alert.alert('Error', 'At least one schedule required'); return; }
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleUpdateSlot = (index, field, value) => {
    const newSchedules = [...schedules];
    newSchedules[index][field] = value;
    // #10: Reset reserved slots if max patients changes
    if (field === 'maxPatients') {
      newSchedules[index].reservedSlots = [];
    }
    setSchedules(newSchedules);
  };

  const handleToggleDay = (index, day) => {
    const newSchedules = [...schedules];
    const current = newSchedules[index].consultationDays;
    if (current.includes(day)) {
      if (current.length === 1) { Alert.alert('Error', 'At least one day must be selected'); return; }
      newSchedules[index].consultationDays = current.filter(d => d !== day);
    } else {
      newSchedules[index].consultationDays = [...current, day];
    }
    setSchedules(newSchedules);
  };

  // #10: Toggle reserved slot
  const handleToggleReservedSlot = (index, slotNum) => {
    const newSchedules = [...schedules];
    const reserved = newSchedules[index].reservedSlots;
    if (reserved.includes(slotNum)) {
      newSchedules[index].reservedSlots = reserved.filter(n => n !== slotNum);
    } else {
      newSchedules[index].reservedSlots = [...reserved, slotNum];
    }
    setSchedules(newSchedules);
  };

  const formatTime = date => {
    if (!date) return '';
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12; hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const openTimePicker = (index, field) => {
    const schedule = schedules[index];
    const existingDate = field === 'timeStart' ? schedule.timeStartDate : schedule.timeEndDate;
    setTempTime(existingDate || new Date());
    setActiveTimeField({index, field});
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') { setShowTimePicker(false); return; }
    if (selectedTime && activeTimeField) {
      const {index, field} = activeTimeField;
      const formattedTime = formatTime(selectedTime);
      const newSchedules = [...schedules];
      if (field === 'timeStart') {
        newSchedules[index].timeStart = formattedTime;
        newSchedules[index].timeStartDate = selectedTime;
      } else {
        newSchedules[index].timeEnd = formattedTime;
        newSchedules[index].timeEndDate = selectedTime;
      }
      setSchedules(newSchedules);
      setTempTime(selectedTime);
      if (Platform.OS === 'android') setActiveTimeField(null);
    }
  };

  const handleConfirmTimePicker = () => { setShowTimePicker(false); setActiveTimeField(null); };

  const handleSave = async () => {
    for (let i = 0; i < schedules.length; i++) {
      const sch = schedules[i];
      if (!sch.hospitalName || !sch.hospitalAddress || !sch.timeStart || !sch.timeEnd || !sch.maxPatients) {
        Alert.alert('Error', `Please fill all fields for schedule ${i + 1}`);
        return;
      }
      if (sch.consultationDays.length === 0) {
        Alert.alert('Error', `Select at least one day for schedule ${i + 1}`);
        return;
      }
    }

    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = JSON.parse(currentDoctorData);
      const existingData = await AsyncStorage.getItem('doctorSchedules');
      const existing = existingData ? JSON.parse(existingData) : [];

      const newSchedules = [];
      schedules.forEach(sch => {
        sch.consultationDays.forEach(day => {
          newSchedules.push({
            id: 'SCH' + Date.now() + Math.random().toString(36).substr(2, 9),
            doctorId: currentDoctor.id,
            doctorName: currentDoctor.fullName,
            hospitalName: sch.hospitalName,
            hospitalAddress: sch.hospitalAddress,
            consultationDay: day,
            timeStart: sch.timeStart,
            timeEnd: sch.timeEnd,
            maxPatients: parseInt(sch.maxPatients),
            reservedSlots: sch.reservedSlots, // #10: Store reserved slots
            currentBookings: 0,
            emergencyContact: emergencyContact,
            createdAt: new Date().toISOString(),
          });
        });
      });

      await AsyncStorage.setItem('doctorSchedules', JSON.stringify([...existing, ...newSchedules]));
      const total = newSchedules.length;
      Alert.alert('Success', `${total} schedule slot${total > 1 ? 's' : ''} created!`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create schedules');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Add New Schedule</Text>
        <Text style={styles.subHeaderText}>Create recurring weekly consultation slots</Text>

        {schedules.map((schedule, index) => {
          const maxPat = parseInt(schedule.maxPatients) || 0;
          return (
            <View key={index} style={styles.scheduleSlot}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotTitle}>Schedule {index + 1}</Text>
                {schedules.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveSlot(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hospital Name *</Text>
                <TextInput style={styles.input} placeholder="e.g., City General Hospital" value={schedule.hospitalName}
                  onChangeText={text => handleUpdateSlot(index, 'hospitalName', text)} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hospital Address *</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Full address..."
                  value={schedule.hospitalAddress} onChangeText={text => handleUpdateSlot(index, 'hospitalAddress', text)}
                  multiline numberOfLines={2} textAlignVertical="top" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Consultation Days * (select multiple)</Text>
                <View style={styles.daySelector}>
                  {days.map(day => {
                    const isSelected = schedule.consultationDays.includes(day);
                    return (
                      <TouchableOpacity key={day} style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                        onPress={() => handleToggleDay(index, day)}>
                        <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                          {day.substr(0, 3)}
                        </Text>
                        {isSelected && <Text style={styles.checkmark}> ✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.selectedDaysText}>
                  Selected: {schedule.consultationDays.map(d => d.substr(0, 3)).join(', ')}
                </Text>
              </View>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>Start Time *</Text>
                  <TouchableOpacity style={styles.timePickerButton} onPress={() => openTimePicker(index, 'timeStart')}>
                    <Text style={[styles.timePickerText, !schedule.timeStart && styles.timePlaceholder]}>
                      {schedule.timeStart || '🕐 Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>End Time *</Text>
                  <TouchableOpacity style={styles.timePickerButton} onPress={() => openTimePicker(index, 'timeEnd')}>
                    <Text style={[styles.timePickerText, !schedule.timeEnd && styles.timePlaceholder]}>
                      {schedule.timeEnd || '🕐 Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Maximum Patients *</Text>
                <TextInput style={styles.input} placeholder="25" value={schedule.maxPatients}
                  onChangeText={text => handleUpdateSlot(index, 'maxPatients', text)}
                  keyboardType="number-pad" />
              </View>

              {/* #10: Reserve Slots Grid */}
              {maxPat > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Reserve Slots <Text style={styles.optional}>({schedule.reservedSlots.length} reserved)</Text>
                  </Text>
                  <Text style={styles.reserveHint}>
                    Tap slot numbers to reserve them. Reserved slots won't be available for patient booking.
                  </Text>
                  <View style={styles.slotGrid}>
                    {Array.from({length: maxPat}, (_, i) => i + 1).map(num => {
                      const isReserved = schedule.reservedSlots.includes(num);
                      return (
                        <TouchableOpacity
                          key={num}
                          style={[styles.slotChip, isReserved && styles.slotChipReserved]}
                          onPress={() => handleToggleReservedSlot(index, num)}>
                          <Text style={[styles.slotChipText, isReserved && styles.slotChipTextReserved]}>
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {schedule.reservedSlots.length > 0 && (
                    <View style={styles.reserveSummary}>
                      <Text style={styles.reserveSummaryText}>
                        Available for patients: {maxPat - schedule.reservedSlots.length}/{maxPat} slots
                      </Text>
                      <Text style={styles.reservedList}>
                        Reserved: {schedule.reservedSlots.sort((a, b) => a - b).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Time Picker */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="default" onChange={handleTimeChange} />
        )}
        {showTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.timeModalOverlay}>
              <View style={styles.timeModalContent}>
                <Text style={styles.timeModalTitle}>Select {activeTimeField?.field === 'timeStart' ? 'Start' : 'End'} Time</Text>
                <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} style={{height: 200}} />
                <TouchableOpacity style={styles.timeModalDone} onPress={handleConfirmTimePicker}>
                  <Text style={styles.timeModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <TouchableOpacity style={styles.addSlotButton} onPress={handleAddSlot}>
          <Text style={styles.addSlotButtonText}>+ Add Another Time Slot</Text>
        </TouchableOpacity>

        {/* Emergency Contact */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact Number</Text>
          <TextInput style={styles.input} placeholder="01712345678"
            value={emergencyContact} onChangeText={setEmergencyContact}
            keyboardType="phone-pad" maxLength={15} />
          <Text style={styles.emergencyHint}>
            This number will be shown to patients when booking is closed for same-day appointments.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Create Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 20, paddingBottom: 40},
  headerText: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8},
  subHeaderText: {fontSize: 14, color: '#666', marginBottom: 25},
  scheduleSlot: {backgroundColor: '#f0f8ff', borderWidth: 2, borderColor: '#667eea', borderStyle: 'dashed', borderRadius: 12, padding: 15, marginBottom: 20},
  slotHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15},
  slotTitle: {fontSize: 16, fontWeight: '700', color: '#667eea'},
  removeText: {color: '#dc3545', fontSize: 14, fontWeight: '600'},
  inputGroup: {marginBottom: 15},
  label: {fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8},
  optional: {fontSize: 12, color: '#999', fontWeight: '400'},
  input: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, color: '#333'},
  textArea: {minHeight: 60, paddingTop: 12},
  daySelector: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  dayButton: {paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center'},
  dayButtonSelected: {backgroundColor: '#667eea', borderColor: '#667eea'},
  dayButtonText: {fontSize: 13, fontWeight: '600', color: '#666'},
  dayButtonTextSelected: {color: '#fff'},
  checkmark: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
  selectedDaysText: {fontSize: 12, color: '#667eea', marginTop: 8, fontWeight: '600'},
  timeRow: {flexDirection: 'row', gap: 10},
  timePickerButton: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#667eea', borderRadius: 10, padding: 14, alignItems: 'center'},
  timePickerText: {fontSize: 15, fontWeight: '600', color: '#667eea'},
  timePlaceholder: {color: '#999'},
  timeModalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  timeModalContent: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40},
  timeModalTitle: {fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10},
  timeModalDone: {backgroundColor: '#667eea', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 10},
  timeModalDoneText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  // #10: Reserve Slots
  reserveHint: {fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 18},
  slotGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  slotChip: {width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center'},
  slotChipReserved: {backgroundColor: '#dc3545', borderColor: '#dc3545'},
  slotChipText: {fontSize: 14, fontWeight: '600', color: '#333'},
  slotChipTextReserved: {color: '#fff'},
  reserveSummary: {backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginTop: 10},
  reserveSummaryText: {fontSize: 13, fontWeight: '600', color: '#856404'},
  reservedList: {fontSize: 12, color: '#856404', marginTop: 4},
  emergencyHint: {fontSize: 12, color: '#999', marginTop: 5, lineHeight: 18},
  addSlotButton: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#667eea', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 20},
  addSlotButtonText: {color: '#667eea', fontSize: 15, fontWeight: '600'},
  saveButton: {backgroundColor: '#667eea', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 10},
  saveButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  cancelButton: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, padding: 18, alignItems: 'center'},
  cancelButtonText: {color: '#666', fontSize: 16, fontWeight: '600'},
});

export default AddScheduleScreen;