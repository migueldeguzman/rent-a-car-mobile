import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, financialFormatting } from '../theme/colors';
import { useBookingFlow } from '../contexts/BookingFlowContext';
import { useAuth } from '../contexts/AuthContext';
import { KYCData } from '../types';
import ProgressIndicator from '../components/ProgressIndicator';
import { customerAPI } from '../services/api';

interface KYCEligibilityScreenProps {
  navigation: any;
}

// UAE_BANKS and CARD_TYPES moved to PaymentScreen

export default function KYCEligibilityScreen({ navigation }: KYCEligibilityScreenProps) {
  const { flowState, setKYCData, nextStep, previousStep } = useBookingFlow();
  const { user, register, login } = useAuth();

  // Verification method
  const [verificationType, setVerificationType] = useState<'UAE_PASS' | 'MANUAL'>('MANUAL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual input fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isTourist, setIsTourist] = useState(false);
  const [emiratesId, setEmiratesId] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportCountry, setPassportCountry] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driversLicenseCountry, setDriversLicenseCountry] = useState('');
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Account creation fields (collected after KYC validation)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Payment information fields removed - now handled in PaymentScreen

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleUAEPassVerification = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with UAE Pass SDK
      // For now, show placeholder
      Alert.alert(
        'UAE Pass Integration',
        'UAE Pass integration will be implemented in the next phase. Please use manual verification for now.',
        [{ text: 'OK', onPress: () => setVerificationType('MANUAL') }]
      );
    } catch (error) {
      console.error('UAE Pass error:', error);
      Alert.alert('Error', 'UAE Pass verification failed. Please try manual verification.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const errorMessages: string[] = [];

    // Phone Number
    if (!phoneNumber || phoneNumber.length < 7) {
      errors.phoneNumber = 'Valid phone number required (min 7 digits)';
      errorMessages.push('Phone number');
    }

    // Tourist vs Resident validation
    if (isTourist) {
      if (!passportNumber) {
        errors.passportNumber = 'Passport number required for tourists';
        errorMessages.push('Passport number');
      }
      if (!passportCountry) {
        errors.passportCountry = 'Passport country required';
        errorMessages.push('Passport country');
      }
    } else {
      if (!emiratesId) {
        errors.emiratesId = 'Emirates ID required for UAE residents';
        errorMessages.push('Emirates ID');
      }
    }

    // Driver's License
    if (!licenseNumber) {
      errors.licenseNumber = 'Driver license number required';
      errorMessages.push('Driver license number');
    }
    if (!driversLicenseCountry) {
      errors.driversLicenseCountry = 'License issuing country required';
      errorMessages.push('License country');
    }

    // Nationality
    if (!nationality) {
      errors.nationality = 'Nationality required';
      errorMessages.push('Nationality');
    }

    // Account Creation Fields
    if (!firstName || firstName.trim().length < 2) {
      errors.firstName = 'First name required (min 2 characters)';
      errorMessages.push('First name');
    }

    if (!lastName || lastName.trim().length < 2) {
      errors.lastName = 'Last name required (min 2 characters)';
      errorMessages.push('Last name');
    }

    if (!email || !email.includes('@')) {
      errors.email = 'Valid email address required';
      errorMessages.push('Email');
    }

    if (!password || password.length < 8) {
      errors.password = 'Password required (min 8 characters)';
      errorMessages.push('Password');
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      errorMessages.push('Password confirmation');
    }

    setFieldErrors(errors);

    if (errorMessages.length > 0) {
      // Show toast-style message
      const message = `Please complete: ${errorMessages.join(', ')}`;
      if (Platform.OS === 'web') {
        // For web, use a custom toast
        showToast(message);
      } else {
        Alert.alert('Incomplete Information', message);
      }
      return false;
    }

    return true;
  };

  // Toast message for web
  const showToast = (message: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #f44336;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      max-width: 80%;
      text-align: center;
      font-size: 14px;
      animation: slideDown 0.3s ease-out;
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-out reverse';
      setTimeout(() => {
        document.body.removeChild(toast);
        document.head.removeChild(style);
      }, 300);
    }, 4000);
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      console.log('📝 Step 2: Creating customer record in customers table with full KYC data...');

      // Step 1: Register customer with KYC data
      // This creates a single record in the customers table with:
      // - Auth fields: email, password_hash, role
      // - KYC fields: phone, emirates_id/passport, license, nationality, etc.
      const registerResponse = await customerAPI.registerWithKYC({
        // Account credentials (stored in customers table)
        email,
        password,
        firstName,
        lastName,
        // KYC identity data (stored in same customers table)
        phoneNumber,
        emiratesId: isTourist ? null : emiratesId,
        passportNumber: isTourist ? passportNumber : null,
        passportCountry: isTourist ? passportCountry : null,
        licenseNumber,
        driversLicenseCountry,
        driversLicenseExpiry: driversLicenseExpiry || undefined,
        nationality,
        dateOfBirth: dateOfBirth || undefined,
        isTourist,
      });

      console.log('✅ Customer record created in customers table (includes auth + KYC data)');

      // Step 2: Auto-login the customer with new credentials
      // Backend validates against customers table and returns User object + JWT
      await login(email, password);

      console.log('✅ Customer auto-logged in (authenticated via customers table)');

      // Step 3: Save KYC data to flow context for reference
      const kycData: KYCData = {
        verificationType,
        phoneNumber,
        emiratesId: isTourist ? null : emiratesId,
        passportNumber: isTourist ? passportNumber : null,
        passportCountry: isTourist ? passportCountry : null,
        licenseNumber,
        driversLicenseCountry,
        driversLicenseExpiry: driversLicenseExpiry || undefined,
        isTourist,
        nationality,
        dateOfBirth: dateOfBirth || undefined,
        kycVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      setKYCData(kycData);

      // Navigate to payment
      nextStep(); // Go to Step 3: Payment
      navigation.navigate('Payment');
    } catch (error: any) {
      console.error('❌ Error creating customer account:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      const errorMessage = error.response?.data?.message || 'Failed to create account. Please try again.';
      const errorDetails = error.response?.data?.error;

      // Enhanced error message with details
      let fullErrorMessage = errorMessage;
      if (errorDetails && process.env.NODE_ENV === 'development') {
        fullErrorMessage += `\n\nDebug Info:\nCode: ${errorDetails.code || 'N/A'}\nDetail: ${errorDetails.detail || 'N/A'}`;
      }

      if (Platform.OS === 'web') {
        window.alert(`Error: ${fullErrorMessage}`);
      } else {
        Alert.alert('Error', fullErrorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    previousStep();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ProgressIndicator currentStep={2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Verify Your Eligibility</Text>
            <Text style={styles.headerSubtitle}>
              We need to verify your identity and payment information to proceed with the booking.
            </Text>
          </View>

          {/* Booking Summary Section */}
          {flowState.vehicle && flowState.priceBreakdown && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="car-sport" size={24} color={colors.primary.main} />
                <Text style={styles.summaryTitle}>Booking Summary</Text>
              </View>

              <View style={styles.summaryContent}>
                {/* Vehicle Info */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Vehicle:</Text>
                  <Text style={styles.summaryValue}>
                    {flowState.vehicle.make} {flowState.vehicle.model} {flowState.vehicle.year}
                  </Text>
                </View>

                {/* Rental Period */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Period:</Text>
                  <Text style={styles.summaryValue}>
                    {flowState.rentalPeriod?.totalDays} days
                    {flowState.rentalPeriod?.monthlyPeriods ? ` (${flowState.rentalPeriod.monthlyPeriods} month${flowState.rentalPeriod.monthlyPeriods > 1 ? 's' : ''})` : ''}
                  </Text>
                </View>

                {/* Dates */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Dates:</Text>
                  <Text style={styles.summaryValueSmall}>
                    {flowState.rentalPeriod?.startDate ? new Date(flowState.rentalPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} - {flowState.rentalPeriod?.endDate ? new Date(flowState.rentalPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </Text>
                </View>

                {/* Add-ons */}
                {flowState.selectedAddOns && flowState.selectedAddOns.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Add-ons:</Text>
                    <View style={styles.summaryAddOns}>
                      {flowState.selectedAddOns.map((addon, index) => (
                        <Text key={index} style={styles.summaryAddOnText}>
                          • {addon.name}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.summaryDivider} />

                {/* Pricing */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    {financialFormatting.formatCurrency(flowState.priceBreakdown.subtotal + (flowState.priceBreakdown.addOnsTotal || 0))}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelVat}>VAT (5%):</Text>
                  <Text style={styles.summaryValueVat}>
                    {financialFormatting.formatCurrency(flowState.priceBreakdown.vatAmount)}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
                  <Text style={styles.summaryTotalValue}>
                    {financialFormatting.formatCurrency(flowState.priceBreakdown.totalWithVat)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Verification Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Method</Text>
            <View style={styles.verificationOptions}>
              <TouchableOpacity
                style={[
                  styles.verificationOption,
                  verificationType === 'UAE_PASS' && styles.verificationOptionActive,
                ]}
                onPress={handleUAEPassVerification}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={32}
                  color={verificationType === 'UAE_PASS' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.verificationOptionText,
                    verificationType === 'UAE_PASS' && styles.verificationOptionTextActive,
                  ]}
                >
                  UAE Pass
                </Text>
                <Text style={styles.verificationOptionHint}>(Coming Soon)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verificationOption,
                  verificationType === 'MANUAL' && styles.verificationOptionActive,
                ]}
                onPress={() => setVerificationType('MANUAL')}
              >
                <Ionicons
                  name="create-outline"
                  size={32}
                  color={verificationType === 'MANUAL' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.verificationOptionText,
                    verificationType === 'MANUAL' && styles.verificationOptionTextActive,
                  ]}
                >
                  Manual Entry
                </Text>
                <Text style={styles.verificationOptionHint}>Enter details manually</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Manual Entry Form */}
          {verificationType === 'MANUAL' && (
            <>
              {/* Contact Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.phoneNumber && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      if (fieldErrors.phoneNumber) {
                        const { phoneNumber, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="+971 50 123 4567"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                  {fieldErrors.phoneNumber && (
                    <Text style={styles.inputErrorText}>{fieldErrors.phoneNumber}</Text>
                  )}
                </View>
              </View>

              {/* Tourist vs Resident */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Residency Status</Text>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Are you a tourist (visiting UAE)?</Text>
                  <Switch
                    value={isTourist}
                    onValueChange={setIsTourist}
                    trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                    thumbColor={isTourist ? colors.primary.main : colors.neutral.text.secondary}
                  />
                </View>
              </View>

              {/* ID Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {isTourist ? 'Passport Information' : 'Emirates ID Information'}
                </Text>

                {isTourist ? (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Passport Number *</Text>
                      <TextInput
                        style={[styles.input, fieldErrors.passportNumber && styles.inputError]}
                        value={passportNumber}
                        onChangeText={(text) => {
                          setPassportNumber(text);
                          if (fieldErrors.passportNumber) {
                            const { passportNumber, ...rest } = fieldErrors;
                            setFieldErrors(rest);
                          }
                        }}
                        placeholder="A12345678"
                        autoCapitalize="characters"
                      />
                      {fieldErrors.passportNumber && (
                        <Text style={styles.inputErrorText}>{fieldErrors.passportNumber}</Text>
                      )}
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Passport Issuing Country *</Text>
                      <TextInput
                        style={[styles.input, fieldErrors.passportCountry && styles.inputError]}
                        value={passportCountry}
                        onChangeText={(text) => {
                          setPassportCountry(text);
                          if (fieldErrors.passportCountry) {
                            const { passportCountry, ...rest } = fieldErrors;
                            setFieldErrors(rest);
                          }
                        }}
                        placeholder="United States"
                      />
                      {fieldErrors.passportCountry && (
                        <Text style={styles.inputErrorText}>{fieldErrors.passportCountry}</Text>
                      )}
                    </View>
                  </>
                ) : (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Emirates ID Number *</Text>
                    <TextInput
                      style={[styles.input, fieldErrors.emiratesId && styles.inputError]}
                      value={emiratesId}
                      onChangeText={(text) => {
                        setEmiratesId(text);
                        if (fieldErrors.emiratesId) {
                          const { emiratesId, ...rest } = fieldErrors;
                          setFieldErrors(rest);
                        }
                      }}
                      placeholder="784-1234-1234567-1"
                      keyboardType="number-pad"
                    />
                    {fieldErrors.emiratesId && (
                      <Text style={styles.inputErrorText}>{fieldErrors.emiratesId}</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Driver's License */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Driver's License (Required)</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>License Number *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.licenseNumber && styles.inputError]}
                    value={licenseNumber}
                    onChangeText={(text) => {
                      setLicenseNumber(text);
                      if (fieldErrors.licenseNumber) {
                        const { licenseNumber, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="DL123456"
                  />
                  {fieldErrors.licenseNumber && (
                    <Text style={styles.inputErrorText}>{fieldErrors.licenseNumber}</Text>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>License Issuing Country *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.driversLicenseCountry && styles.inputError]}
                    value={driversLicenseCountry}
                    onChangeText={(text) => {
                      setDriversLicenseCountry(text);
                      if (fieldErrors.driversLicenseCountry) {
                        const { driversLicenseCountry, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="United Arab Emirates"
                  />
                  {fieldErrors.driversLicenseCountry && (
                    <Text style={styles.inputErrorText}>{fieldErrors.driversLicenseCountry}</Text>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>License Expiry Date (Optional)</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={driversLicenseExpiry}
                      onChange={(e) => setDriversLicenseExpiry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '16px',
                        border: `1px solid ${colors.ui.inputBorder}`,
                        borderRadius: '8px',
                        backgroundColor: colors.ui.inputBackground,
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      value={driversLicenseExpiry}
                      onChangeText={setDriversLicenseExpiry}
                      placeholder="YYYY-MM-DD"
                    />
                  )}
                </View>
              </View>

              {/* Personal Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nationality *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.nationality && styles.inputError]}
                    value={nationality}
                    onChangeText={(text) => {
                      setNationality(text);
                      if (fieldErrors.nationality) {
                        const { nationality, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="United States"
                  />
                  {fieldErrors.nationality && (
                    <Text style={styles.inputErrorText}>{fieldErrors.nationality}</Text>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date of Birth (Optional)</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '16px',
                        border: `1px solid ${colors.ui.inputBorder}`,
                        borderRadius: '8px',
                        backgroundColor: colors.ui.inputBackground,
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      value={dateOfBirth}
                      onChangeText={setDateOfBirth}
                      placeholder="YYYY-MM-DD"
                    />
                  )}
                </View>
              </View>

              {/* Account Creation Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Create Your Account</Text>
                <Text style={styles.sectionSubtext}>
                  Set up your account credentials to complete the booking process
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.firstName && styles.inputError]}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (fieldErrors.firstName) {
                        const { firstName, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="John"
                    autoComplete="given-name"
                  />
                  {fieldErrors.firstName && (
                    <Text style={styles.inputErrorText}>{fieldErrors.firstName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.lastName && styles.inputError]}
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (fieldErrors.lastName) {
                        const { lastName, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName && (
                    <Text style={styles.inputErrorText}>{fieldErrors.lastName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.email && styles.inputError]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text.toLowerCase().trim());
                      if (fieldErrors.email) {
                        const { email, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="john.doe@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  {fieldErrors.email && (
                    <Text style={styles.inputErrorText}>{fieldErrors.email}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.password && styles.inputError]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (fieldErrors.password) {
                        const { password, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="Minimum 8 characters"
                    secureTextEntry
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <Text style={styles.inputErrorText}>{fieldErrors.password}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (fieldErrors.confirmPassword) {
                        const { confirmPassword, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    placeholder="Re-enter password"
                    secureTextEntry
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <Text style={styles.inputErrorText}>{fieldErrors.confirmPassword}</Text>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.primary.main} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, isProcessing && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={gradients.primaryButton.colors}
                start={gradients.primaryButton.start}
                end={gradients.primaryButton.end}
                style={styles.continueButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>Create Account & Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.neutral.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    padding: 20,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 12,
  },
  sectionSubtext: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  verificationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  verificationOption: {
    flex: 1,
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  verificationOptionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  verificationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.secondary,
    marginTop: 8,
  },
  verificationOptionTextActive: {
    color: colors.primary.main,
  },
  verificationOptionHint: {
    fontSize: 12,
    color: colors.neutral.text.hint,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.ui.inputBackground,
    borderWidth: 1,
    borderColor: colors.ui.inputBorder,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.neutral.text.primary,
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  inputHint: {
    fontSize: 12,
    color: colors.neutral.text.hint,
    marginTop: 4,
  },
  inputErrorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 8,
    padding: 16,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.neutral.text.primary,
    flex: 1,
    marginRight: 12,
  },
  pickerButton: {
    backgroundColor: colors.ui.inputBackground,
    borderWidth: 1,
    borderColor: colors.ui.inputBorder,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.neutral.text.primary,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.neutral.text.hint,
  },
  pickerOptions: {
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    ...colors.shadows.medium,
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.neutral.text.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.financial.info + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.financial.info,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.neutral.text.secondary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  backButtonText: {
    color: colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    ...colors.shadows.large,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Booking Summary Styles
  summaryCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary.main + '30',
    ...colors.shadows.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary.main,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  summaryValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  summaryAddOns: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summaryAddOnText: {
    fontSize: 13,
    color: colors.neutral.text.secondary,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
    marginVertical: 8,
  },
  summaryLabelVat: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.financial.vat,
    flex: 1,
  },
  summaryValueVat: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.financial.vat,
    flex: 1,
    textAlign: 'right',
  },
  summaryTotalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.neutral.divider,
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    flex: 1,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
    flex: 1,
    textAlign: 'right',
  },
});
