import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const BookingConfirmationScreen = ({navigation, route}) => {
  const {appointment, schedule} = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.confirmationBox}>
          <View style={styles.checkIcon}>
            <Text style={styles.checkIconText}>✓</Text>
          </View>
          <Text style={styles.confirmationText}>
            Your appointment is booked with <Text style={styles.bold}>Dr. Sarah Wilson</Text> on{' '}
            <Text style={styles.bold}>{appointment.appointmentDate}</Text> at{' '}
            <Text style={styles.bold}>{appointment.appointmentTime}</Text>.
            {'\n\n'}
            <Text style={styles.bold}>Schedule:</Text> Every {schedule.consultationDay},{' '}
            {schedule.timeStart} - {schedule.timeEnd}
            {'\n'}
            <Text style={styles.bold}>Location:</Text> {schedule.hospitalName}
            {'\n\n'}
            Please reach hospital at least 15 minutes prior to appointment time for
            completing the pre-consultation formalities.
            {'\n\n'}
            Please remember that same day report evaluation time takes an average
            of 2 hours. So have patience.
          </Text>
          <View style={styles.regNumber}>
            <Text style={styles.regNumberText}>
              Appointment ID: {appointment.id}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MedicalHistory')}
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>
            Fill Medical History (Optional)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('PatientDashboard')}
          activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
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
  confirmationBox: {
    backgroundColor: '#d4edda',
    borderWidth: 2,
    borderColor: '#28a745',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#28a745',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkIconText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmationText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 22,
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  regNumber: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    width: '100%',
  },
  regNumberText: {
    fontWeight: '700',
    color: '#667eea',
    textAlign: 'center',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingConfirmationScreen;