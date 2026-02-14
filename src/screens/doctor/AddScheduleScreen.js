import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddScheduleScreen = ({navigation}) => {
  const [schedules, setSchedules] = useState([
    {
      hospitalName: '',
      hospitalAddress: '',
      consultationDays: ['Saturday'], // Feature #7: Array for multi-day
      timeStart: '',
      timeEnd: '',
      timeStartDate: null,
      timeEndDate: null,
      maxPatients: '',
    },
  ]);
  const [emergencyContact, setEmergencyContact] = useState('');

  // Feature #8: Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState(null); // {index, field}
  const [tempTime, setTempTime] = useState(new Date());

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const handleAddSlot = () => {
    setSchedules([
      ...schedules,
      {
        hospitalName: '',
        hospitalAddress: '',
        consultationDays: ['Saturday'],
        timeStart: '',
        timeEnd: '',
        timeStartDate: null,
        timeEndDate: null,
        maxPatients: '',
      },
    ]);
  };

  const handleRemoveSlot = index => {
    if (schedules.length === 1) {
      Alert.alert('Error', 'You must have at least one schedule');
      return;
    }
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);
  };

  const handleUpdateSlot = (index, field, value) => {
    const newSchedules = [...schedules];
    newSchedules[index][field] = value;
    setSchedules(newSchedules);
  };

  // Feature #7: Toggle day selection (multi-select)
  const handleToggleDay = (index, day) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[index].consultationDays;

    if (currentDays.includes(day)) {
      // Remove day (but keep at least one)
      if (currentDays.length === 1) {
        Alert.alert('Error', 'At least one day must be selected');
        return;
      }
      newSchedules[index].consultationDays = currentDays.filter(d => d !== day);
    } else {
      newSchedules[index].consultationDays = [...currentDays, day];
    }
    setSchedules(newSchedules);
  };

  // Feature #8: Format time from Date object
  const formatTime = date => {
    if (!date) return '';
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Feature #8: Open time picker
  const openTimePicker = (index, field) => {
    const schedule = schedules[index];
    const existingDate =
      field === 'timeStart' ? schedule.timeStartDate : schedule.timeEndDate;
    setTempTime(existingDate || new Date());
    setActiveTimeField({index, field});
    setShowTimePicker(true);
  };

  // Feature #8: Handle time picker change
  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

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

      if (Platform.OS === 'android') {
        setActiveTimeField(null);
      }
    }
  };

  const handleConfirmTimePicker = () => {
    setShowTimePicker(false);
    setActiveTimeField(null);
  };

  const handleSave = async () => {
    for (let i = 0; i < schedules.length; i++) {
      const sch = schedules[i];
      if (
        !sch.hospitalName ||
        !sch.hospitalAddress ||
        !sch.timeStart ||
        !sch.timeEnd ||
        !sch.maxPatients
      ) {
        Alert.alert('Error', `Please fill all fields for schedule ${i + 1}`);
        return;
      }
      if (sch.consultationDays.length === 0) {
        Alert.alert(
          'Error',
          `Please select at least one day for schedule ${i + 1}`,
        );
        return;
      }
    }

    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = JSON.parse(currentDoctorData);

      const existingSchedulesData = await AsyncStorage.getItem(
        'doctorSchedules',
      );
      const existingSchedules = existingSchedulesData
        ? JSON.parse(existingSchedulesData)
        : [];

      // Feature #7: Create one schedule per selected day
      const newSchedules = [];
      schedules.forEach(sch => {
        sch.consultationDays.forEach(day => {
          newSchedules.push({
            id:
              'SCH' +
              Date.now() +
              Math.random().toString(36).substr(2, 9),
            doctorId: currentDoctor.id,
            doctorName: currentDoctor.fullName,
            hospitalName: sch.hospitalName,
            hospitalAddress: sch.hospitalAddress,
            consultationDay: day,
            timeStart: sch.timeStart,
            timeEnd: sch.timeEnd,
            maxPatients: parseInt(sch.maxPatients),
            currentBookings: 0,
            emergencyContact: emergencyContact,
            createdAt: new Date().toISOString(),
          });
        });
      });

      const allSchedules = [...existingSchedules, ...newSchedules];
      await AsyncStorage.setItem(
        'doctorSchedules',
        JSON.stringify(allSchedules),
      );

      const totalCreated = newSchedules.length;
      Alert.alert(
        'Success',
        `${totalCreated} schedule slot${totalCreated > 1 ? 's' : ''} created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create schedules');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Add New Schedule</Text>
        <Text style={styles.subHeaderText}>
          Create recurring weekly consultation slots
        </Text>

        {schedules.map((schedule, index) => (
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
              <TextInput
                style={styles.input}
                placeholder="e.g., City General Hospital"
                value={schedule.hospitalName}
                onChangeText={text =>
                  handleUpdateSlot(index, 'hospitalName', text)
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full address..."
                value={schedule.hospitalAddress}
                onChangeText={text =>
                  handleUpdateSlot(index, 'hospitalAddress', text)
                }
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Feature #7: Multi-day selection with checkboxes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Consultation Days * (select multiple)
              </Text>
              <View style={styles.daySelector}>
                {days.map(day => {
                  const isSelected =
                    schedule.consultationDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        isSelected && styles.dayButtonSelected,
                      ]}
                      onPress={() => handleToggleDay(index, day)}>
                      <Text
                        style={[
                          styles.dayButtonText,
                          isSelected && styles.dayButtonTextSelected,
                        ]}>
                        {day.substr(0, 3)}
                      </Text>
                      {isSelected && (
                        <Text style={styles.checkmark}> ✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.selectedDaysText}>
                Selected:{' '}
                {schedule.consultationDays
                  .map(d => d.substr(0, 3))
                  .join(', ')}
              </Text>
            </View>

            {/* Feature #8: Interactive time pickers */}
            <View style={styles.timeRow}>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Start Time *</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openTimePicker(index, 'timeStart')}>
                  <Text
                    style={[
                      styles.timePickerText,
                      !schedule.timeStart && styles.timePlaceholder,
                    ]}>
                    {schedule.timeStart || '🕐 Select'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>End Time *</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => openTimePicker(index, 'timeEnd')}>
                  <Text
                    style={[
                      styles.timePickerText,
                      !schedule.timeEnd && styles.timePlaceholder,
                    ]}>
                    {schedule.timeEnd || '🕐 Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maximum Patients *</Text>
              <TextInput
                style={styles.input}
                placeholder="20"
                value={schedule.maxPatients}
                onChangeText={text =>
                  handleUpdateSlot(index, 'maxPatients', text)
                }
                keyboardType="number-pad"
              />
            </View>
          </View>
        ))}

        {/* Feature #8: Time Picker (Android native, iOS modal) */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* iOS time picker modal */}
        {showTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.timeModalOverlay}>
              <View style={styles.timeModalContent}>
                <Text style={styles.timeModalTitle}>
                  Select{' '}
                  {activeTimeField?.field === 'timeStart'
                    ? 'Start'
                    : 'End'}{' '}
                  Time
                </Text>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.iosTimePicker}
                />
                <TouchableOpacity
                  style={styles.timeModalDone}
                  onPress={handleConfirmTimePicker}>
                  <Text style={styles.timeModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <TouchableOpacity style={styles.addSlotButton} onPress={handleAddSlot}>
          <Text style={styles.addSlotButtonText}>+ Add Another Time Slot</Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 234 567 8900"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Create Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  scheduleSlot: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  removeText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 60,
    paddingTop: 12,
  },
  // Feature #7: Multi-day selector
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedDaysText: {
    fontSize: 12,
    color: '#667eea',
    marginTop: 8,
    fontWeight: '600',
  },
  // Feature #8: Time picker styles
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timePickerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  timePlaceholder: {
    color: '#999',
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  timeModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  timeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  iosTimePicker: {
    height: 200,
  },
  timeModalDone: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  timeModalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addSlotButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  addSlotButtonText: {
    color: '#667eea',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddScheduleScreen;