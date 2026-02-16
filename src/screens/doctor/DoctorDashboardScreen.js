import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DoctorDashboardScreen = ({navigation}) => {
  const [doctor, setDoctor] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({total: 0, completed: 0, pending: 0});
  const [next7DaysSchedules, setNext7DaysSchedules] = useState([]);

  // Change #4: Today's patients modal (grouped by hospital)
  const [showTodayPatients, setShowTodayPatients] = useState(false);
  const [todayPatientsGrouped, setTodayPatientsGrouped] = useState({});

  // Change #3: Schedule day patients modal
  const [showDayPatients, setShowDayPatients] = useState(false);
  const [dayPatientsTitle, setDayPatientsTitle] = useState('');
  const [dayPatientsList, setDayPatientsList] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      if (!currentDoctorData) return;
      const doctorData = JSON.parse(currentDoctorData);
      setDoctor(doctorData);

      const appointmentsData = await AsyncStorage.getItem('appointments');
      const allAppointments = appointmentsData ? JSON.parse(appointmentsData) : [];

      const today = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });

      const todayApts = allAppointments.filter(
        apt => apt.doctorId === doctorData.id && apt.appointmentDate === today && apt.status !== 'cancelled',
      );

      setTodayAppointments(todayApts);
      setStats({
        total: todayApts.length,
        completed: todayApts.filter(a => a.status === 'completed').length,
        pending: todayApts.filter(a => a.status === 'pending').length,
      });

      // Build next 7 days schedule
      const schedulesData = await AsyncStorage.getItem('doctorSchedules');
      const allSchedules = schedulesData ? JSON.parse(schedulesData) : [];
      const mySchedules = allSchedules.filter(s => s.doctorId === doctorData.id);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const next7 = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        const dateDisplay = d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});

        const matching = mySchedules.filter(s => s.consultationDay === dayName);
        if (matching.length > 0) {
          const dayApts = allAppointments.filter(
            apt => apt.doctorId === doctorData.id && apt.appointmentDate === dateStr && apt.status !== 'cancelled',
          );
          matching.forEach(sch => {
            const schApts = dayApts.filter(
              apt => apt.scheduleId === sch.id || apt.hospitalName === sch.hospitalName,
            );
            next7.push({
              ...sch, dateStr, dateDisplay, dayName, isToday: i === 0,
              bookedCount: schApts.length, dayAppointments: schApts,
            });
          });
        }
      }
      setNext7DaysSchedules(next7);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Change #3: Tap schedule to see patient list
  const handleScheduleTap = async scheduleItem => {
    try {
      const patientsData = await AsyncStorage.getItem('patients');
      const patients = patientsData ? JSON.parse(patientsData) : [];

      const patientList = scheduleItem.dayAppointments.map(apt => {
        const pi = patients.find(p => p.regNumber === apt.patientId);
        return {
          id: apt.id, name: apt.patientName || pi?.fullName || 'Unknown',
          age: pi?.ageDetailed || `${pi?.age || '?'} yrs`,
          phone: pi?.phone || 'N/A', regNumber: apt.patientId, status: apt.status,
        };
      });

      setDayPatientsTitle(`${scheduleItem.hospitalName} - ${scheduleItem.dateDisplay}`);
      setDayPatientsList(patientList);
      setShowDayPatients(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Change #4: Today's patients grouped by hospital
  const handleTodayPatientsTap = async () => {
    try {
      const patientsData = await AsyncStorage.getItem('patients');
      const patients = patientsData ? JSON.parse(patientsData) : [];

      const grouped = {};
      todayAppointments.forEach(apt => {
        const hospital = apt.hospitalName || 'Unknown';
        if (!grouped[hospital]) grouped[hospital] = [];
        const pi = patients.find(p => p.regNumber === apt.patientId);
        grouped[hospital].push({
          id: apt.id, name: apt.patientName || pi?.fullName || 'Unknown',
          age: pi?.ageDetailed || `${pi?.age || '?'} yrs`,
          phone: pi?.phone || 'N/A', regNumber: apt.patientId,
          time: apt.appointmentTime, status: apt.status,
        });
      });

      setTodayPatientsGrouped(grouped);
      setShowTodayPatients(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusStyle = status => {
    return status === 'completed' ? styles.statusComplete : styles.statusPending;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.doctorName}>{doctor?.fullName || 'Doctor'}</Text>
          <Text style={styles.specialization}>{doctor?.specialization}</Text>
        </View>

        {/* Stats - tappable */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={handleTodayPatientsTap} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Today's Patients</Text>
            <Text style={styles.statHint}>Tap to view</Text>
          </TouchableOpacity>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, styles.statCardOrange]}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Compact Quick Actions - 4 per row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PatientSearch')}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DoctorProfile')}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DoctorCalendar')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddSchedule')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionLabel}>Reset PW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BlockDate')}>
            <Text style={styles.actionIcon}>🚫</Text>
            <Text style={styles.actionLabel}>Block Date</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleTodayPatientsTap}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Today List</Text>
          </TouchableOpacity>
          <View style={[styles.actionBtn, {opacity: 0}]} />
        </View>

        {/* Change #6: Today's Schedule ON TOP of My Schedules */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {todayAppointments.length > 0 ? (
          todayAppointments.map(apt => (
            <TouchableOpacity key={apt.id} style={styles.appointmentCard}
              onPress={() => navigation.navigate('PatientDetails', {patientId: apt.patientId})}>
              <View style={styles.aptRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.patientName}>{apt.patientName}</Text>
                  <Text style={styles.aptDetail}>{apt.hospitalName} • {apt.appointmentTime}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(apt.status)]}>
                  <Text style={styles.statusText}>{apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appointments for today</Text>
          </View>
        )}

        {/* Change #3: My Schedules - next 7 days, no delete, date shown, tappable */}
        <Text style={styles.sectionTitle}>My Schedules (Next 7 Days)</Text>
        {next7DaysSchedules.length > 0 ? (
          next7DaysSchedules.map((item, idx) => (
            <TouchableOpacity key={`${item.id}-${idx}`}
              style={[styles.scheduleCard, item.isToday && styles.scheduleToday]}
              onPress={() => handleScheduleTap(item)} activeOpacity={0.7}>
              <View style={styles.schRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.schDate}>
                    {item.dateDisplay}{item.isToday ? '  (Today)' : ''}
                  </Text>
                  <Text style={styles.schHospital}>{item.hospitalName}</Text>
                  <Text style={styles.schTime}>{item.timeStart} - {item.timeEnd} • Max {item.maxPatients}</Text>
                </View>
                <View style={styles.schCountBadge}>
                  <Text style={styles.schCountText}>{item.bookedCount}</Text>
                  <Text style={styles.schCountLabel}>pts</Text>
                </View>
              </View>
              <Text style={styles.schHint}>Tap to view patient list →</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No schedules for the next 7 days</Text>
          </View>
        )}
      </ScrollView>

      {/* Always visible logout */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.removeItem('currentDoctor');
          navigation.replace('Welcome');
        }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Change #4: Today's Patients Full Screen Modal */}
      <Modal visible={showTodayPatients} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalBar}>
            <Text style={styles.modalBarTitle}>Today's Patients</Text>
            <TouchableOpacity onPress={() => setShowTodayPatients(false)}>
              <Text style={styles.modalBarClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {Object.keys(todayPatientsGrouped).length > 0 ? (
              Object.entries(todayPatientsGrouped).map(([hospital, pats]) => (
                <View key={hospital} style={styles.hospGroup}>
                  <View style={styles.hospHeader}>
                    <Text style={styles.hospName}>🏥 {hospital}</Text>
                    <Text style={styles.hospCount}>{pats.length} patient(s)</Text>
                  </View>
                  {pats.map((p, i) => (
                    <TouchableOpacity key={p.id || i} style={styles.pItem}
                      onPress={() => { setShowTodayPatients(false); navigation.navigate('PatientDetails', {patientId: p.regNumber}); }}>
                      <Text style={styles.pNum}>{i + 1}.</Text>
                      <View style={{flex: 1}}>
                        <Text style={styles.pName}>{p.name}</Text>
                        <Text style={styles.pDetail}>Age: {p.age} • Phone: {p.phone} • {p.time}</Text>
                      </View>
                      <Text style={styles.pArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyModal}><Text style={styles.emptyModalText}>No patients today</Text></View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Change #3: Schedule Day Patients Modal */}
      <Modal visible={showDayPatients} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalBar}>
            <Text style={styles.modalBarTitle} numberOfLines={2}>{dayPatientsTitle}</Text>
            <TouchableOpacity onPress={() => setShowDayPatients(false)}>
              <Text style={styles.modalBarClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {dayPatientsList.length > 0 ? (
              dayPatientsList.map((p, i) => (
                <TouchableOpacity key={p.id || i} style={styles.pItem}
                  onPress={() => { setShowDayPatients(false); navigation.navigate('PatientDetails', {patientId: p.regNumber}); }}>
                  <Text style={styles.pNum}>{i + 1}.</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.pName}>{p.name}</Text>
                    <Text style={styles.pDetail}>Age: {p.age} • Phone: {p.phone}</Text>
                    <Text style={styles.pDetail}>Reg: {p.regNumber} • {p.status}</Text>
                  </View>
                  <Text style={styles.pArrow}>→</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyModal}><Text style={styles.emptyModalText}>No patients booked yet</Text></View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollView: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 10},
  header: {marginBottom: 16},
  welcomeText: {fontSize: 14, color: '#666'},
  doctorName: {fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 3},
  specialization: {fontSize: 13, color: '#667eea', marginTop: 3},
  // Stats
  statsContainer: {flexDirection: 'row', gap: 10, marginBottom: 14},
  statCard: {flex: 1, backgroundColor: '#667eea', borderRadius: 12, padding: 14, alignItems: 'center'},
  statCardGreen: {backgroundColor: '#4caf50'},
  statCardOrange: {backgroundColor: '#ff9800'},
  statNumber: {fontSize: 26, fontWeight: '700', color: '#fff'},
  statLabel: {fontSize: 10, color: '#fff', opacity: 0.9},
  statHint: {fontSize: 9, color: '#fff', opacity: 0.7, marginTop: 2},
  // Actions
  actionsRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  actionBtn: {flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 2},
  actionIcon: {fontSize: 22, marginBottom: 3},
  actionLabel: {fontSize: 10, color: '#333', fontWeight: '600', textAlign: 'center'},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 12},
  // Today appointments
  appointmentCard: {backgroundColor: '#f8f9ff', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  aptRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  patientName: {fontWeight: '700', color: '#333', fontSize: 14, marginBottom: 2},
  aptDetail: {fontSize: 12, color: '#666'},
  statusBadge: {paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginLeft: 8},
  statusPending: {backgroundColor: '#fff3cd'},
  statusComplete: {backgroundColor: '#d4edda'},
  statusText: {fontSize: 10, fontWeight: '600', color: '#333'},
  emptyState: {backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 8},
  emptyText: {fontSize: 13, color: '#999'},
  // Schedule cards
  scheduleCard: {backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  scheduleToday: {borderLeftColor: '#4caf50', backgroundColor: '#f1f8e9'},
  schRow: {flexDirection: 'row', alignItems: 'center'},
  schDate: {fontSize: 14, fontWeight: '700', color: '#333'},
  schHospital: {fontSize: 13, color: '#667eea', fontWeight: '600', marginTop: 2},
  schTime: {fontSize: 12, color: '#666', marginTop: 2},
  schCountBadge: {backgroundColor: '#e3f2fd', padding: 8, borderRadius: 10, alignItems: 'center', minWidth: 44},
  schCountText: {fontSize: 16, fontWeight: '700', color: '#1976d2'},
  schCountLabel: {fontSize: 9, color: '#1976d2'},
  schHint: {fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic'},
  // Bottom
  bottomBar: {padding: 10, backgroundColor: '#f5f7fa', borderTopWidth: 1, borderTopColor: '#e0e0e0'},
  logoutBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, padding: 12, alignItems: 'center'},
  logoutText: {color: '#dc3545', fontSize: 14, fontWeight: '600'},
  // Modals
  modalFull: {flex: 1, backgroundColor: '#f5f7fa'},
  modalBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#667eea'},
  modalBarTitle: {fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, marginRight: 10},
  modalBarClose: {color: '#fff', fontSize: 15, fontWeight: '600'},
  modalBody: {padding: 16, paddingBottom: 40},
  hospGroup: {marginBottom: 20},
  hospHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#667eea'},
  hospName: {fontSize: 16, fontWeight: '700', color: '#333', flex: 1},
  hospCount: {fontSize: 13, color: '#667eea', fontWeight: '600'},
  pItem: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6},
  pNum: {fontSize: 14, fontWeight: '700', color: '#667eea', width: 28},
  pName: {fontSize: 15, fontWeight: '600', color: '#333'},
  pDetail: {fontSize: 12, color: '#666', marginTop: 2},
  pArrow: {fontSize: 16, color: '#667eea', marginLeft: 8},
  emptyModal: {padding: 40, alignItems: 'center'},
  emptyModalText: {fontSize: 15, color: '#999'},
});

export default DoctorDashboardScreen;