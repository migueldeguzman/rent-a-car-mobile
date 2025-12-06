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
import { KYCData } from '../types';
import ProgressIndicator from '../components/ProgressIndicator';

interface KYCEligibilityScreenProps {
  navigation: any;
}

const UAE_BANKS = [
  'Emirates NBD',
  'First Abu Dhabi Bank (FAB)',
  'Abu Dhabi Commercial Bank (ADCB)',
  'Dubai Islamic Bank',
  'Mashreq Bank',
  'RAKBANK',
  'Commercial Bank of Dubai',
  'Union National Bank',
  'Sharjah Islamic Bank',
  'Other',
];

const CARD_TYPES = ['VISA', 'MASTERCARD', 'AMEX', 'OTHER'];

export default function KYCEligibilityScreen({ navigation }: KYCEligibilityScreenProps) {
  const { flowState, setKYCData, nextStep, previousStep } = useBookingFlow();

  // Verification method
  const [verificationType, setVerificationType] = useState<'UAE_PASS' | 'MANUAL'>('MANUAL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual input fields
  const [email, setEmail] = useState('');
  const [isTourist, setIsTourist] = useState(false);
  const [emiratesId, setEmiratesId] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportCountry, setPassportCountry] = useState('');
  const [driversId, setDriversId] = useState('');
  const [driversLicenseCountry, setDriversLicenseCountry] = useState('');
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Payment information
  const [creditCardNumber, setCreditCardNumber] = useState(''); // Will store last 4 digits only
  const [creditCardType, setCreditCardType] = useState<'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'>('VISA');
  const [cardHolderName, setCardHolderName] = useState('');
  const [bankProvider, setBankProvider] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showCardTypePicker, setShowCardTypePicker] = useState(false);

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
    if (!email || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (isTourist) {
      if (!passportNumber || !passportCountry) {
        Alert.alert('Validation Error', 'Please provide passport number and country for tourists');
        return false;
      }
    } else {
      if (!emiratesId) {
        Alert.alert('Validation Error', 'Please provide Emirates ID for UAE residents');
        return false;
      }
    }

    if (!driversId || !driversLicenseCountry) {
      Alert.alert('Validation Error', 'Please provide driver license details (required for all renters)');
      return false;
    }

    if (!nationality) {
      Alert.alert('Validation Error', 'Please select your nationality');
      return false;
    }

    if (!creditCardNumber || creditCardNumber.length < 4) {
      Alert.alert('Validation Error', 'Please enter the last 4 digits of your credit card');
      return false;
    }

    if (!cardHolderName) {
      Alert.alert('Validation Error', 'Please enter the cardholder name');
      return false;
    }

    if (!bankProvider) {
      Alert.alert('Validation Error', 'Please select your bank/service provider');
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    const kycData: KYCData = {
      verificationType,
      email,
      emiratesId: isTourist ? null : emiratesId,
      passportNumber: isTourist ? passportNumber : null,
      passportCountry: isTourist ? passportCountry : null,
      driversId,
      driversLicenseCountry,
      driversLicenseExpiry: driversLicenseExpiry || undefined,
      creditCardNumber, // Last 4 digits only
      creditCardType,
      cardHolderName,
      bankProvider,
      isTourist,
      nationality,
      dateOfBirth: dateOfBirth || undefined,
      kycVerified: true,
      verifiedAt: new Date().toISOString(),
    };

    setKYCData(kycData);
    nextStep(); // Go to Step 3: Payment
    navigation.navigate('Payment');
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
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
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
                        style={styles.input}
                        value={passportNumber}
                        onChangeText={setPassportNumber}
                        placeholder="A12345678"
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Passport Issuing Country *</Text>
                      <TextInput
                        style={styles.input}
                        value={passportCountry}
                        onChangeText={setPassportCountry}
                        placeholder="United States"
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Emirates ID Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={emiratesId}
                      onChangeText={setEmiratesId}
                      placeholder="784-1234-1234567-1"
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </View>

              {/* Driver's License */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Driver's License (Required)</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>License Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={driversId}
                    onChangeText={setDriversId}
                    placeholder="DL123456"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>License Issuing Country *</Text>
                  <TextInput
                    style={styles.input}
                    value={driversLicenseCountry}
                    onChangeText={setDriversLicenseCountry}
                    placeholder="United Arab Emirates"
                  />
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
                    style={styles.input}
                    value={nationality}
                    onChangeText={setNationality}
                    placeholder="United States"
                  />
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

              {/* Payment Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Information</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Bank/Service Provider *</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={bankProvider}
                      onChange={(e) => setBankProvider(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '16px',
                        border: `1px solid ${colors.ui.inputBorder}`,
                        borderRadius: '8px',
                        backgroundColor: colors.ui.inputBackground,
                      }}
                    >
                      <option value="">Select Bank...</option>
                      {UAE_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowBankPicker(!showBankPicker)}
                    >
                      <Text style={bankProvider ? styles.pickerButtonText : styles.placeholderText}>
                        {bankProvider || 'Select Bank...'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.neutral.text.secondary} />
                    </TouchableOpacity>
                  )}
                  {showBankPicker && Platform.OS !== 'web' && (
                    <View style={styles.pickerOptions}>
                      {UAE_BANKS.map((bank) => (
                        <TouchableOpacity
                          key={bank}
                          style={styles.pickerOption}
                          onPress={() => {
                            setBankProvider(bank);
                            setShowBankPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{bank}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Card Type *</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={creditCardType}
                      onChange={(e) => setCreditCardType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '16px',
                        border: `1px solid ${colors.ui.inputBorder}`,
                        borderRadius: '8px',
                        backgroundColor: colors.ui.inputBackground,
                      }}
                    >
                      {CARD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowCardTypePicker(!showCardTypePicker)}
                    >
                      <Text style={styles.pickerButtonText}>{creditCardType}</Text>
                      <Ionicons name="chevron-down" size={20} color={colors.neutral.text.secondary} />
                    </TouchableOpacity>
                  )}
                  {showCardTypePicker && Platform.OS !== 'web' && (
                    <View style={styles.pickerOptions}>
                      {CARD_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.pickerOption}
                          onPress={() => {
                            setCreditCardType(type as any);
                            setShowCardTypePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last 4 Digits of Card *</Text>
                  <TextInput
                    style={styles.input}
                    value={creditCardNumber}
                    onChangeText={(text) => {
                      // Only allow 4 digits
                      if (text.length <= 4 && /^\d*$/.test(text)) {
                        setCreditCardNumber(text);
                      }
                    }}
                    placeholder="1234"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={styles.inputHint}>
                    For security, we only store the last 4 digits
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cardholder Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={cardHolderName}
                    onChangeText={setCardHolderName}
                    placeholder="JOHN DOE"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={24} color={colors.financial.info} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Your Information is Secure</Text>
                  <Text style={styles.infoText}>
                    All personal and payment information is encrypted and securely stored. We comply with UAE data protection regulations.
                  </Text>
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
                    <Text style={styles.continueButtonText}>Continue to Payment</Text>
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
  inputHint: {
    fontSize: 12,
    color: colors.neutral.text.hint,
    marginTop: 4,
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
