import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const QRScannerScreen = ({navigation}) => {
  const handleSkipForTesting = () => {
    navigation.navigate('PatientRegistration', {
      doctorId: 'DOC001',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Scan the code from prescription or advertisement
        </Text>

        <View style={styles.scannerFrame}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />

          <View style={styles.cameraIcon}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>
        </View>

        <Text style={styles.instruction}>
          Position the QR code within the frame{'\n'}
          Scanning will start automatically
        </Text>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipForTesting}>
          <Text style={styles.skipButtonText}>Skip (Testing Mode)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    borderRadius: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#667eea',
  },
  cornerTopRight: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#667eea',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#667eea',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#667eea',
  },
  cameraIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconText: {
    fontSize: 80,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  skipButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 40,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScannerScreen;