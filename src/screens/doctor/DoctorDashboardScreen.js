import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOTTOM_PAD = Platform.OS === 'android' ? 8 : 0;

const DoctorDashboardScreen = ({navigation}) => {
  const [doctor, setDoctor] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({total: 0, completed: 0, pending: 0});
  const [next7DaysSchedules, setNext7DaysSchedules] = useState([]);
  const [showTodayPatients, setShowTodayPatients] = useState(false);
  const [todayPatientsGrouped, setTodayPatientsGrouped] = useState({});
  const [showDayPatients, setShowDayPatients] = useState(false);
  const [dayPatientsTitle, setDayPatientsTitle] = useState('');
  const [dayPatientsList, setDayPatientsList] = useState([]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { loadData(); });
    return unsub;
  }, [navigation]);

  const loadData = async () => {
    try {
      const cd = await AsyncStorage.getItem('currentDoctor');
      if (!cd) return;
      const doc = JSON.parse(cd);
      setDoctor(doc);

      const aptsData = await AsyncStorage.getItem('appointments');
      const allApts = aptsData ? JSON.parse(aptsData) : [];
      const today = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

      // #7: Check for void appointments (doctor side)
      const now = new Date();
      let updated = false;
      const updatedApts = allApts.map(apt => {
        if (apt.doctorId !== doc.id || apt.status !== 'pending') return apt;
        const aptDate = new Date(apt.appointmentDate);
        if (isNaN(aptDate.getTime())) return apt;
        const todayStr = now.toISOString().split('T')[0];
        const aptStr = aptDate.toISOString().split('T')[0];
        if (aptStr < todayStr) {
          // Past date, check consultation
          updated = true;
          return {...apt, status: 'void'};
        }
        return apt;
      });
      if (updated) await AsyncStorage.setItem('appointments', JSON.stringify(updatedApts));

      const todayApts = (updated ? updatedApts : allApts).filter(
        a => a.doctorId === doc.id && a.appointmentDate === today && a.status !== 'cancelled',
      );
      setTodayAppointments(todayApts);
      setStats({
        total: todayApts.length,
        completed: todayApts.filter(a => a.status === 'completed').length,
        pending: todayApts.filter(a => a.status === 'pending').length,
      });

      // Next 7 days schedule
      const schData = await AsyncStorage.getItem('doctorSchedules');
      const allSch = schData ? JSON.parse(schData) : [];
      const mySch = allSch.filter(s => s.doctorId === doc.id);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const next7 = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        const dateDisplay = d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
        const matching = mySch.filter(s => s.consultationDay === dayName);
        if (matching.length > 0) {
          const dayApts = (updated ? updatedApts : allApts).filter(a => a.doctorId === doc.id && a.appointmentDate === dateStr && a.status !== 'cancelled');
          matching.forEach(sch => {
            const schApts = dayApts.filter(a => a.scheduleId === sch.id || a.hospitalName === sch.hospitalName);
            next7.push({...sch, dateStr, dateDisplay, dayName, isToday: i === 0, bookedCount: schApts.length, dayAppointments: schApts});
          });
        }
      }
      setNext7DaysSchedules(next7);
    } catch (e) { console.error(e); }
  };

  const handleScheduleTap = async item => {
    try {
      const pd = await AsyncStorage.getItem('patients');
      const patients = pd ? JSON.parse(pd) : [];
      const list = item.dayAppointments.map(apt => {
        const pi = patients.find(p => p.regNumber === apt.patientId);
        return {id: apt.id, name: apt.patientName || pi?.fullName || 'Unknown', age: pi?.ageDetailed || `${pi?.age || '?'} yrs`, phone: pi?.phone || 'N/A', regNumber: apt.patientId, status: apt.status};
      });
      setDayPatientsTitle(`${item.hospitalName} - ${item.dateDisplay}`);
      setDayPatientsList(list);
      setShowDayPatients(true);
    } catch (e) { console.error(e); }
  };

  const handleTodayPatientsTap = async () => {
    try {
      const pd = await AsyncStorage.getItem('patients');
      const patients = pd ? JSON.parse(pd) : [];
      const grouped = {};
      todayAppointments.forEach(apt => {
        const h = apt.hospitalName || 'Unknown';
        if (!grouped[h]) grouped[h] = [];
        const pi = patients.find(p => p.regNumber === apt.patientId);
        grouped[h].push({id: apt.id, name: apt.patientName || pi?.fullName || 'Unknown', age: pi?.ageDetailed || `${pi?.age || '?'} yrs`, phone: pi?.phone || 'N/A', regNumber: apt.patientId, time: apt.appointmentTime, status: apt.status});
      });
      setTodayPatientsGrouped(grouped);
      setShowTodayPatients(true);
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{flex: 1}}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.doctorName}>{doctor?.fullName || 'Doctor'}</Text>
          <Text style={styles.spec}>{doctor?.specialization}</Text>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={handleTodayPatientsTap} activeOpacity={0.7}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLbl}>Today</Text>
            <Text style={styles.statHint}>Tap</Text>
          </TouchableOpacity>
          <View style={[styles.statCard, {backgroundColor: '#4caf50'}]}>
            <Text style={styles.statNum}>{stats.completed}</Text>
            <Text style={styles.statLbl}>Done</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#ff9800'}]}>
            <Text style={styles.statNum}>{stats.pending}</Text>
            <Text style={styles.statLbl}>Pending</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PatientSearch')}><Text style={styles.actionIcon}>🔍</Text><Text style={styles.actionLabel}>Search</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DoctorProfile')}><Text style={styles.actionIcon}>👤</Text><Text style={styles.actionLabel}>Profile</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DoctorCalendar')}><Text style={styles.actionIcon}>📅</Text><Text style={styles.actionLabel}>Calendar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddSchedule')}><Text style={styles.actionIcon}>➕</Text><Text style={styles.actionLabel}>Schedule</Text></TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ResetPassword')}><Text style={styles.actionIcon}>🔒</Text><Text style={styles.actionLabel}>Reset PW</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BlockDate')}><Text style={styles.actionIcon}>🚫</Text><Text style={styles.actionLabel}>Block</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleTodayPatientsTap}><Text style={styles.actionIcon}>📋</Text><Text style={styles.actionLabel}>Today</Text></TouchableOpacity>
          <View style={[styles.actionBtn, {opacity: 0}]} />
        </View>

        {/* Today's Schedule */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {todayAppointments.length > 0 ? todayAppointments.map(apt => (
          <TouchableOpacity key={apt.id} style={styles.aptCard} onPress={() => navigation.navigate('PatientDetails', {patientId: apt.patientId})}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <View style={{flex: 1}}><Text style={styles.aptName}>{apt.patientName}</Text><Text style={styles.aptDetail}>{apt.hospitalName} • {apt.appointmentTime}</Text></View>
              <View style={[styles.badge, apt.status === 'completed' ? styles.badgeDone : styles.badgePend]}>
                <Text style={styles.badgeText}>{apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )) : <View style={styles.empty}><Text style={styles.emptyText}>No appointments today</Text></View>}

        {/* My Schedules - next 7 days with edit button */}
        <Text style={styles.sectionTitle}>My Schedules (Next 7 Days)</Text>
        {next7DaysSchedules.length > 0 ? next7DaysSchedules.map((item, idx) => (
          <View key={`${item.id}-${idx}`} style={[styles.schCard, item.isToday && styles.schToday]}>
            <TouchableOpacity onPress={() => handleScheduleTap(item)} activeOpacity={0.7} style={{flex: 1}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <View style={{flex: 1}}>
                  <Text style={styles.schDate}>{item.dateDisplay}{item.isToday ? ' (Today)' : ''}</Text>
                  <Text style={styles.schHospital}>{item.hospitalName}</Text>
                  <Text style={styles.schTime}>{item.timeStart} - {item.timeEnd} • Max {item.maxPatients}</Text>
                </View>
                <View style={styles.schCountBadge}>
                  <Text style={styles.schCount}>{item.bookedCount}</Text>
                  <Text style={styles.schCountLabel}>pts</Text>
                </View>
              </View>
              <Text style={styles.schHint}>Tap for patient list →</Text>
            </TouchableOpacity>
            {/* #11: Edit button */}
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditSchedule', {scheduleId: item.id})}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
        )) : <View style={styles.empty}><Text style={styles.emptyText}>No schedules for next 7 days</Text></View>}
      </ScrollView>

      <View style={[styles.bottomBar, {paddingBottom: 10 + BOTTOM_PAD}]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.removeItem('currentDoctor'); navigation.replace('Welcome');
        }}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
      </View>

      {/* Today's Patients Modal */}
      <Modal visible={showTodayPatients} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalBar}><Text style={styles.modalTitle}>Today's Patients</Text><TouchableOpacity onPress={() => setShowTodayPatients(false)}><Text style={styles.modalClose}>✕ Close</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
            {Object.keys(todayPatientsGrouped).length > 0 ? Object.entries(todayPatientsGrouped).map(([h, pats]) => (
              <View key={h} style={{marginBottom: 20}}>
                <View style={styles.hospHeader}><Text style={styles.hospName}>🏥 {h}</Text><Text style={styles.hospCount}>{pats.length}</Text></View>
                {pats.map((p, i) => (
                  <TouchableOpacity key={p.id || i} style={styles.pItem} onPress={() => {setShowTodayPatients(false); navigation.navigate('PatientDetails', {patientId: p.regNumber});}}>
                    <Text style={styles.pNum}>{i + 1}.</Text>
                    <View style={{flex: 1}}><Text style={styles.pName}>{p.name}</Text><Text style={styles.pDetail}>Age: {p.age} • Phone: {p.phone} • {p.time}</Text></View>
                    <Text style={{color: '#667eea'}}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )) : <View style={{padding: 40, alignItems: 'center'}}><Text style={{color: '#999'}}>No patients today</Text></View>}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Day Patients Modal */}
      <Modal visible={showDayPatients} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalBar}><Text style={styles.modalTitle} numberOfLines={2}>{dayPatientsTitle}</Text><TouchableOpacity onPress={() => setShowDayPatients(false)}><Text style={styles.modalClose}>✕ Close</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
            {dayPatientsList.length > 0 ? dayPatientsList.map((p, i) => (
              <TouchableOpacity key={p.id || i} style={styles.pItem} onPress={() => {setShowDayPatients(false); navigation.navigate('PatientDetails', {patientId: p.regNumber});}}>
                <Text style={styles.pNum}>{i + 1}.</Text>
                <View style={{flex: 1}}><Text style={styles.pName}>{p.name}</Text><Text style={styles.pDetail}>Age: {p.age} • Phone: {p.phone} • {p.status}</Text></View>
                <Text style={{color: '#667eea'}}>→</Text>
              </TouchableOpacity>
            )) : <View style={{padding: 40, alignItems: 'center'}}><Text style={{color: '#999'}}>No patients booked</Text></View>}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f7fa'},
  scrollContent: {padding: 16, paddingBottom: 10},
  header: {marginBottom: 14},
  welcomeText: {fontSize: 14, color: '#666'},
  doctorName: {fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 3},
  spec: {fontSize: 13, color: '#667eea', marginTop: 3},
  statsRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  statCard: {flex: 1, backgroundColor: '#667eea', borderRadius: 12, padding: 12, alignItems: 'center'},
  statNum: {fontSize: 24, fontWeight: '700', color: '#fff'},
  statLbl: {fontSize: 10, color: '#fff', opacity: 0.9},
  statHint: {fontSize: 9, color: '#fff', opacity: 0.7, marginTop: 1},
  actionsRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  actionBtn: {flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2},
  actionIcon: {fontSize: 20, marginBottom: 2},
  actionLabel: {fontSize: 10, color: '#333', fontWeight: '600'},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10},
  aptCard: {backgroundColor: '#f8f9ff', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  aptName: {fontWeight: '700', color: '#333', fontSize: 14, marginBottom: 2},
  aptDetail: {fontSize: 12, color: '#666'},
  badge: {paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginLeft: 8},
  badgePend: {backgroundColor: '#fff3cd'},
  badgeDone: {backgroundColor: '#d4edda'},
  badgeText: {fontSize: 10, fontWeight: '600', color: '#333'},
  empty: {backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 8},
  emptyText: {fontSize: 13, color: '#999'},
  schCard: {backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#667eea'},
  schToday: {borderLeftColor: '#4caf50', backgroundColor: '#f1f8e9'},
  schDate: {fontSize: 14, fontWeight: '700', color: '#333'},
  schHospital: {fontSize: 13, color: '#667eea', fontWeight: '600', marginTop: 2},
  schTime: {fontSize: 12, color: '#666', marginTop: 2},
  schCountBadge: {backgroundColor: '#e3f2fd', padding: 8, borderRadius: 10, alignItems: 'center', minWidth: 44},
  schCount: {fontSize: 16, fontWeight: '700', color: '#1976d2'},
  schCountLabel: {fontSize: 9, color: '#1976d2'},
  schHint: {fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic'},
  // #11: Edit button
  editBtn: {backgroundColor: '#f0f8ff', borderWidth: 1.5, borderColor: '#667eea', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8},
  editBtnText: {fontSize: 13, color: '#667eea', fontWeight: '600'},
  bottomBar: {padding: 10, backgroundColor: '#f5f7fa', borderTopWidth: 1, borderTopColor: '#e0e0e0'},
  logoutBtn: {backgroundColor: '#fff', borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, padding: 12, alignItems: 'center'},
  logoutText: {color: '#dc3545', fontSize: 14, fontWeight: '600'},
  modalFull: {flex: 1, backgroundColor: '#f5f7fa'},
  modalBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#667eea'},
  modalTitle: {fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, marginRight: 10},
  modalClose: {color: '#fff', fontSize: 15, fontWeight: '600'},
  hospHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#667eea'},
  hospName: {fontSize: 16, fontWeight: '700', color: '#333', flex: 1},
  hospCount: {fontSize: 13, color: '#667eea', fontWeight: '600'},
  pItem: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6},
  pNum: {fontSize: 14, fontWeight: '700', color: '#667eea', width: 28},
  pName: {fontSize: 15, fontWeight: '600', color: '#333'},
  pDetail: {fontSize: 12, color: '#666', marginTop: 2},
});

export default DoctorDashboardScreen;