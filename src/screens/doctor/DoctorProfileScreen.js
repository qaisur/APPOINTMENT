import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';

const DoctorProfileScreen = ({navigation}) => {
  const [doctor, setDoctor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    specialization: '',
    qualifications: '',
    experience: '',
    photo: null,
    specialties: [],
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    loadDoctorData();
  }, []);

  const loadDoctorData = async () => {
    try {
      const currentDoctorData = await AsyncStorage.getItem('currentDoctor');
      if (currentDoctorData) {
        const doctorData = JSON.parse(currentDoctorData);
        setDoctor(doctorData);
        setFormData({
          fullName: doctorData.fullName || '',
          specialization: doctorData.specialization || '',
          qualifications: doctorData.qualifications || '',
          experience: doctorData.experience || '',
          photo: doctorData.photo || null,
          specialties: doctorData.specialties || [],
        });
      }
    } catch (error) {
      console.error('Error loading doctor data:', error);
    }
  };

  const handleSelectPhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert('Error', 'Failed to select image');
        return;
      }
      if (response.assets && response.assets[0]) {
        setFormData({
          ...formData,
          photo: response.assets[0].uri,
        });
      }
    });
  };

  const handleAddSpecialty = () => {
    if (!newSpecialty.trim()) {
      Alert.alert('Error', 'Please enter a specialty');
      return;
    }

    if (formData.specialties.includes(newSpecialty.trim())) {
      Alert.alert('Error', 'Specialty already added');
      return;
    }

    setFormData({
      ...formData,
      specialties: [...formData.specialties, newSpecialty.trim()],
    });
    setNewSpecialty('');
  };

  const handleRemoveSpecialty = index => {
    const newSpecialties = formData.specialties.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      specialties: newSpecialties,
    });
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.specialization) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const updatedDoctor = {
        ...doctor,
        ...formData,
      };

      // Update in doctors list
      const doctorsData = await AsyncStorage.getItem('doctors');
      if (doctorsData) {
        const doctors = JSON.parse(doctorsData);
        const updatedDoctors = doctors.map(d =>
          d.id === doctor.id ? updatedDoctor : d,
        );
        await AsyncStorage.setItem('doctors', JSON.stringify(updatedDoctors));
      }

      // Update current doctor
      await AsyncStorage.setItem('currentDoctor', JSON.stringify(updatedDoctor));

      setDoctor(updatedDoctor);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={editing ? handleSelectPhoto : null}
            disabled={!editing}>
            {formData.photo ? (
              <Image source={{uri: formData.photo}} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>👨‍⚕️</Text>
              </View>
            )}
            {editing && (
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.photoHint}>
            {editing ? 'Tap to change photo' : 'Profile Photo'}
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              placeholder="Dr. John Doe"
              value={formData.fullName}
              onChangeText={text => setFormData({...formData, fullName: text})}
              editable={editing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialization *</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              placeholder="Pediatrician"
              value={formData.specialization}
              onChangeText={text =>
                setFormData({...formData, specialization: text})
              }
              editable={editing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Qualifications</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              placeholder="MBBS, MD"
              value={formData.qualifications}
              onChangeText={text =>
                setFormData({...formData, qualifications: text})
              }
              editable={editing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Experience</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              placeholder="10 years"
              value={formData.experience}
              onChangeText={text => setFormData({...formData, experience: text})}
              editable={editing}
            />
          </View>
        </View>

        {/* Specialties Section - NEW! */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Areas of Expertise</Text>
          <Text style={styles.sectionSubtitle}>
            These will be shown to patients when selecting schedules
          </Text>

          {formData.specialties.map((specialty, index) => (
            <View key={index} style={styles.specialtyItem}>
              <Text style={styles.specialtyText}>• {specialty}</Text>
              {editing && (
                <TouchableOpacity onPress={() => handleRemoveSpecialty(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {editing && (
            <View style={styles.addSpecialtyContainer}>
              <TextInput
                style={styles.specialtyInput}
                placeholder="e.g., Child Development, Vaccination"
                value={newSpecialty}
                onChangeText={setNewSpecialty}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddSpecialty}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {editing ? (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                loadDoctorData();
              }}
              activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
            activeOpacity={0.8}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 50,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoEditText: {
    fontSize: 18,
  },
  photoHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
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
    backgroundColor: '#f5f7fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#f9f9f9',
    color: '#666',
  },
  specialtyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  removeButton: {
    fontSize: 20,
    color: '#dc3545',
    paddingLeft: 10,
  },
  addSpecialtyContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  specialtyInput: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
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
  editButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorProfileScreen;