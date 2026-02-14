import 'react-native-gesture-handler';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar} from 'react-native';

import WelcomeScreen from './src/screens/WelcomeScreen';
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import CreateUserScreen from './src/screens/admin/CreateUserScreen';

import PatientLoginScreen from './src/screens/patient/PatientLoginScreen';
import PatientRegistrationScreen from './src/screens/patient/PatientRegistrationScreen';
import ScheduleSelectionScreen from './src/screens/patient/ScheduleSelectionScreen';
import BookingConfirmationScreen from './src/screens/patient/BookingConfirmationScreen';
import MedicalHistoryScreen from './src/screens/patient/MedicalHistoryScreen';
import PatientDashboardScreen from './src/screens/patient/PatientDashboardScreen';

import DoctorLoginScreen from './src/screens/doctor/DoctorLoginScreen';
import DoctorDashboardScreen from './src/screens/doctor/DoctorDashboardScreen';
import DoctorCalendarScreen from './src/screens/doctor/DoctorCalendarScreen';
import PatientDetailsScreen from './src/screens/doctor/PatientDetailsScreen';
import AddScheduleScreen from './src/screens/doctor/AddScheduleScreen';
import ConsultationNotesScreen from './src/screens/doctor/ConsultationNotesScreen';
import BlockDateScreen from './src/screens/doctor/BlockDateScreen';
import DoctorProfileScreen from './src/screens/doctor/DoctorProfileScreen';
import PatientSearchScreen from './src/screens/doctor/PatientSearchScreen';
import ResetPasswordScreen from './src/screens/doctor/ResetPasswordScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#667eea',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="AdminLogin"
            component={AdminLoginScreen}
            options={{title: 'Admin Login'}}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{title: 'Admin Dashboard', headerLeft: null}}
          />
          <Stack.Screen
            name="CreateUser"
            component={CreateUserScreen}
            options={{title: 'Create Doctor Account'}}
          />
          <Stack.Screen
            name="PatientLogin"
            component={PatientLoginScreen}
            options={{title: 'Patient Login'}}
          />
          <Stack.Screen
            name="PatientRegistration"
            component={PatientRegistrationScreen}
            options={{title: 'Patient Registration'}}
          />
          <Stack.Screen
            name="ScheduleSelection"
            component={ScheduleSelectionScreen}
            options={{title: 'Book Appointment'}}
          />
          <Stack.Screen
            name="BookingConfirmation"
            component={BookingConfirmationScreen}
            options={{title: 'Booking Confirmed', headerLeft: null}}
          />
          <Stack.Screen
            name="MedicalHistory"
            component={MedicalHistoryScreen}
            options={{title: 'Medical History'}}
          />
          <Stack.Screen
            name="PatientDashboard"
            component={PatientDashboardScreen}
            options={{title: 'My Appointments', headerLeft: null}}
          />
          <Stack.Screen
            name="DoctorLogin"
            component={DoctorLoginScreen}
            options={{title: 'Doctor Login'}}
          />
          <Stack.Screen
            name="DoctorDashboard"
            component={DoctorDashboardScreen}
            options={{title: 'Dashboard', headerLeft: null}}
          />
          <Stack.Screen
            name="PatientSearch"
            component={PatientSearchScreen}
            options={{title: 'Search Patient'}}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{title: 'Reset Patient Password'}}
          />
          <Stack.Screen
            name="DoctorCalendar"
            component={DoctorCalendarScreen}
            options={{title: 'Calendar'}}
          />
          <Stack.Screen
            name="PatientDetails"
            component={PatientDetailsScreen}
            options={{title: 'Patient Details'}}
          />
          <Stack.Screen
            name="AddSchedule"
            component={AddScheduleScreen}
            options={{title: 'Add Schedule'}}
          />
          <Stack.Screen
            name="ConsultationNotes"
            component={ConsultationNotesScreen}
            options={{title: 'Consultation Notes'}}
          />
          <Stack.Screen
            name="BlockDate"
            component={BlockDateScreen}
            options={{title: 'Block Date'}}
          />
          <Stack.Screen
            name="DoctorProfile"
            component={DoctorProfileScreen}
            options={{title: 'Doctor Profile'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default App;