import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientSearchScreen = ({navigation}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      // Feature #10: Get current doctor ID for filtering
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      const currentDoctor = currentDoctorData
        ? JSON.parse(currentDoctorData)
        : null;

      const patientsData = await AsyncStorage.getItem('patients');
      if (!patientsData) {
        setSearchResults([]);
        setHasSearched(true);
        return;
      }

      const patients = JSON.parse(patientsData);
      const query = searchQuery.toLowerCase().trim();

      // First filter by name or reg number
      let results = patients.filter(
        patient =>
          patient.fullName.toLowerCase().includes(query) ||
          patient.regNumber.toLowerCase().includes(query),
      );

      // Feature #10: Filter to only show patients who have appointments with this doctor
      if (currentDoctor) {
        const appointmentsData = await AsyncStorage.getItem('appointments');
        if (appointmentsData) {
          const appointments = JSON.parse(appointmentsData);
          const doctorPatientIds = new Set(
            appointments
              .filter(apt => apt.doctorId === currentDoctor.id)
              .map(apt => apt.patientId),
          );

          results = results.filter(patient =>
            doctorPatientIds.has(patient.regNumber),
          );
        } else {
          // No appointments at all means no patients for this doctor
          results = [];
        }
      }

      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handlePatientSelect = patientId => {
    navigation.navigate('PatientDetails', {patientId});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Search Patient</Text>
          <Text style={styles.subHeaderText}>
            Search by name or registration number (your patients only)
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter patient name or reg number..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            activeOpacity={0.8}>
            <Text style={styles.searchButtonText}>🔍 Search</Text>
          </TouchableOpacity>
        </View>

        {hasSearched && (
          <>
            {searchResults.length > 0 ? (
              <>
                <Text style={styles.resultsText}>
                  Found {searchResults.length} patient(s)
                </Text>

                {searchResults.map(patient => (
                  <TouchableOpacity
                    key={patient.regNumber}
                    style={styles.patientCard}
                    onPress={() => handlePatientSelect(patient.regNumber)}
                    activeOpacity={0.7}>
                    <View style={styles.patientHeader}>
                      <Text style={styles.patientName}>{patient.fullName}</Text>
                      <Text style={styles.patientAge}>
                        {/* Feature #1: Show detailed age if available */}
                        {patient.ageDetailed || `${patient.age} yrs`}
                      </Text>
                    </View>

                    <View style={styles.patientInfo}>
                      <Text style={styles.infoItem}>
                        📋 Reg: {patient.regNumber}
                      </Text>
                      <Text style={styles.infoItem}>
                        📞 Phone: {patient.phone}
                      </Text>
                      <Text style={styles.infoItem}>
                        👤 Sex: {patient.sex}
                      </Text>
                      <Text style={styles.infoItem}>
                        🎂 DOB: {patient.dateOfBirth}
                      </Text>
                    </View>

                    <View style={styles.viewButton}>
                      <Text style={styles.viewButtonText}>
                        View Complete Details →
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.noResultsBox}>
                <Text style={styles.noResultsIcon}>🔍</Text>
                <Text style={styles.noResultsText}>No patients found</Text>
                <Text style={styles.noResultsSubtext}>
                  Only patients with appointments under your care are shown.
                  Try a different name or registration number.
                </Text>
              </View>
            )}
          </>
        )}

        {!hasSearched && (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionIcon}>💡</Text>
            <Text style={styles.instructionText}>
              Enter patient name or registration number and tap Search
            </Text>
            <Text style={styles.exampleText}>
              Examples: "John Doe" or "PAT2026-00123"
            </Text>
          </View>
        )}
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
  header: {
    marginBottom: 25,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    marginBottom: 25,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  patientAge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    backgroundColor: '#f8f9ff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: 160,
  },
  patientInfo: {
    marginBottom: 15,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  viewButton: {
    backgroundColor: '#f8f9ff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  noResultsBox: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
  },
  noResultsIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  instructionBox: {
    backgroundColor: '#f8f9ff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  instructionIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  exampleText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default PatientSearchScreen;