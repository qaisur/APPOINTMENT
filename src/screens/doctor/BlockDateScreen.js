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
import DateTimePicker from '@react-native-community/datetimepicker';

const BlockDateScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      checkAffectedAppointments(date);
    }
  };

  const checkAffectedAppointments = async date => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = JSON.parse(currentDoctorData);

      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        const dateString = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const affected = appointments.filter(
          apt =>
            apt.doctorId === currentDoctor.id &&
            apt.appointmentDate === dateString &&
            apt.status === 'pending',
        );

        setAffectedCount(affected.length);
      }
    } catch (error) {
      console.error('Error checking appointments:', error);
    }
  };

  const handleBlockDate = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for blocking');
      return;
    }

    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = JSON.parse(currentDoctorData);

      const dateString = selectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Get appointments to cancel
      const appointmentsData = await AsyncStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);

        // Find and cancel affected appointments
        const updatedAppointments = appointments.map(apt => {
          if (
            apt.doctorId === currentDoctor.id &&
            apt.appointmentDate === dateString &&
            apt.status === 'pending'
          ) {
            // In real app, send SMS here
            console.log(
              `SMS to ${apt.patientId}: Your appointment with Dr. ${currentDoctor.fullName} on ${dateString} has been cancelled. Reason: ${reason}. Please reschedule.`,
            );
            return {...apt, status: 'cancelled'};
          }
          return apt;
        });

        await AsyncStorage.setItem(
          'appointments',
          JSON.stringify(updatedAppointments),
        );
      }

      // Save blocked date
      const blockedDatesData = await AsyncStorage.getItem('blockedDates');
      const blockedDates = blockedDatesData
        ? JSON.parse(blockedDatesData)
        : [];
      blockedDates.push({
        id: 'BLOCK' + Date.now(),
        doctorId: currentDoctor.id,
        blockedDate: dateString,
        reason: reason,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('blockedDates', JSON.stringify(blockedDates));

      Alert.alert(
        'Date Blocked',
        `Successfully blocked ${dateString}. ${affectedCount} appointments cancelled and patients notified.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to block date');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerText}>Block Date</Text>
        <Text style={styles.subHeaderText}>Manage unavailable dates</Text>

        {affectedCount > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Warning</Text>
            <Text style={styles.warningText}>
              You have <Text style={styles.bold}>{affectedCount} appointments</Text>{' '}
              scheduled for {selectedDate.toLocaleDateString()}.
              {'\n\n'}
              Blocking this date will cancel all these appointments and notify
              patients via SMS.
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Date to Block</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>
              📅 {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason for Blocking *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Medical conference, Emergency, Personal..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.notificationBox}>
          <Text style={styles.notificationText}>
            Affected patients will receive:{'\n'}
            <Text style={styles.sampleMessage}>
              "Your appointment with Dr. [Name] on {selectedDate.toLocaleDateString()} has been cancelled. Reason: {reason || '[Your reason]'}. Please reschedule."
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.blockButton}
          onPress={handleBlockDate}
          activeOpacity={0.8}>
          <Text style={styles.blockButtonText}>Confirm & Block Date</Text>
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
  warningBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  warningTitle: {
    fontWeight: '700',
    color: '#856404',
    marginBottom: 10,
    fontSize: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#667eea',
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 15,
  },
  notificationBox: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  notificationText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  sampleMessage: {
    color: '#333',
    fontStyle: 'italic',
    fontSize: 11,
  },
  blockButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  blockButtonText: {
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

export default BlockDateScreen;