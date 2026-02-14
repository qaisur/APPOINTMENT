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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddScheduleScreen = ({navigation}) => {
  const [schedules, setSchedules] = useState([
    {
      hospitalName: '',
      hospitalAddress: '',
      consultationDay: 'Saturday',
      timeStart: '',
      timeEnd: '',
      maxPatients: '',
    },
  ]);
  const [emergencyContact, setEmergencyContact] = useState('');

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
        consultationDay: 'Saturday',
        timeStart: '',
        timeEnd: '',
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

  const handleSave = async () => {
    // Validation
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

      const newSchedules = schedules.map(sch => ({
        id: 'SCH' + Date.now() + Math.random().toString(36).substr(2, 9),
        doctorId: currentDoctor.id,
        hospitalName: sch.hospitalName,
        hospitalAddress: sch.hospitalAddress,
        consultationDay: sch.consultationDay,
        timeStart: sch.timeStart,
        timeEnd: sch.timeEnd,
        maxPatients: parseInt(sch.maxPatients),
        currentBookings: 0,
        emergencyContact: emergencyContact,
        createdAt: new Date().toISOString(),
      }));

      const allSchedules = [...existingSchedules, ...newSchedules];
      await AsyncStorage.setItem(
        'doctorSchedules',
        JSON.stringify(allSchedules),
      );

      Alert.alert('Success', 'Schedules created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Consultation Day *</Text>
              <View style={styles.daySelector}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      schedule.consultationDay === day && styles.dayButtonSelected,
                    ]}
                    onPress={() =>
                      handleUpdateSlot(index, 'consultationDay', day)
                    }>
                    <Text
                      style={[
                        styles.dayButtonText,
                        schedule.consultationDay === day &&
                          styles.dayButtonTextSelected,
                      ]}>
                      {day.substr(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Start Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00 AM"
                  value={schedule.timeStart}
                  onChangeText={text =>
                    handleUpdateSlot(index, 'timeStart', text)
                  }
                />
              </View>

              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>End Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="01:00 PM"
                  value={schedule.timeEnd}
                  onChangeText={text => handleUpdateSlot(index, 'timeEnd', text)}
                />
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
  timeRow: {
    flexDirection: 'row',
    gap: 10,
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