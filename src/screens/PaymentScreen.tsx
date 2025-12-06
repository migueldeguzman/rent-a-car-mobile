import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, financialFormatting } from '../theme/colors';
import { useBookingFlow } from '../contexts/BookingFlowContext';
import { useAuth } from '../contexts/AuthContext';
import { PaymentData, AccountingEntry, NotificationPreferences } from '../types';
import ProgressIndicator from '../components/ProgressIndicator';

interface PaymentScreenProps {
  navigation: any;
}

export default function PaymentScreen({ navigation }: PaymentScreenProps) {
  const { flowState, setPaymentData, nextStep, previousStep } = useBookingFlow();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'CASH'>('CREDIT_CARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    whatsapp: false,
  });

  // Card details for final confirmation (last 4 digits from KYC)
  const cardLast4 = flowState.kycData?.creditCardNumber || '****';
  const cardType = flowState.kycData?.creditCardType || 'CARD';
  const cardHolderName = flowState.kycData?.cardHolderName || 'Cardholder';
  const bankProvider = flowState.kycData?.bankProvider || 'Bank';

  // Calculate total amount
  const totalAmount = flowState.priceBreakdown?.totalWithVat || 0;

  // Generate receipt number
  const generateReceiptNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REC-${year}${month}${day}-${random}`;
  };

  // Generate accounting entry number
  const generateEntryNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `JE-${year}-${seq}`;
  };

  const processPayment = async () => {
    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the payment terms and conditions');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment gateway processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const receiptNumber = generateReceiptNumber();
      const entryNumber = generateEntryNumber();
      const transactionDate = new Date().toISOString();

      // Create payment data
      const payment: PaymentData = {
        paymentMethod,
        amount: totalAmount,
        currency: 'AED',
        cardLast4,
        cardType,
        cardHolderName,
        transactionId: `TXN-${Date.now()}`, // In production, this comes from payment gateway
        transactionDate,
        transactionStatus: 'COMPLETED',
        receiptNumber,
      };

      // Create accounting entry (Double-entry bookkeeping)
      const accountingEntry: AccountingEntry = {
        id: `ae-${Date.now()}`, // In production, this comes from database
        companyId: flowState.vehicle?.companyId || 'default-company-id',
        entryNumber,
        entryDate: transactionDate,
        entryType: 'PAYMENT',
        description: `Payment for vehicle rental - ${flowState.vehicle?.make} ${flowState.vehicle?.model} - ${receiptNumber}`,
        referenceType: 'BOOKING',
        referenceId: 'pending', // Will be set after booking is created

        // Debit side - Credit Card Clearing Account (Asset)
        debitAccount: '1100-CC-CLEARING',
        debitAccountName: 'Credit Card Clearing',
        debitAmount: totalAmount,

        // Credit side - Customer Account Receivable
        creditAccount: `1200-CUST-${user?.id || 'guest'}`,
        creditAccountName: `${user?.firstName || 'Customer'} ${user?.lastName || ''} - Receivable`,
        creditAmount: totalAmount,

        // Audit trail
        createdBy: user?.id,
        createdAt: transactionDate,
        status: 'POSTED',
        postedAt: transactionDate,
      };

      // Save payment and accounting entry to flow state
      setPaymentData(payment, accountingEntry);

      // In production, send this to backend:
      // await paymentAPI.processPayment({ payment, accountingEntry, kycData: flowState.kycData });

      // Move to Step 4: Confirmation
      nextStep();
      navigation.navigate('BookingConfirmation');

    } catch (error: any) {
      console.error('Payment processing error:', error);
      Alert.alert(
        'Payment Failed',
        error.message || 'Unable to process payment. Please try again.',
        [{ text: 'OK' }]
      );
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
      <ProgressIndicator currentStep={3} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.headerSubtitle}>
              Review your booking details and complete payment
            </Text>
          </View>

          {/* Booking Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehicle:</Text>
                <Text style={styles.summaryValue}>
                  {flowState.vehicle?.make} {flowState.vehicle?.model} {flowState.vehicle?.year}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rental Period:</Text>
                <Text style={styles.summaryValue}>
                  {flowState.rentalPeriod?.totalDays} days
                  {flowState.rentalPeriod?.monthlyPeriods ? ` (${flowState.rentalPeriod.monthlyPeriods} months)` : ''}
                </Text>
              </View>
              {flowState.selectedAddOns && flowState.selectedAddOns.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Add-ons:</Text>
                  <Text style={styles.summaryValue}>
                    {flowState.selectedAddOns.map(a => a.name).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Breakdown</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Vehicle Rental:</Text>
                <Text style={styles.priceValue}>
                  {financialFormatting.formatCurrency(flowState.priceBreakdown?.subtotal || 0)}
                </Text>
              </View>

              {flowState.priceBreakdown?.addOnsTotal && flowState.priceBreakdown.addOnsTotal > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Add-ons:</Text>
                  <Text style={styles.priceValue}>
                    {financialFormatting.formatCurrency(flowState.priceBreakdown.addOnsTotal)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal:</Text>
                <Text style={styles.priceValue}>
                  {financialFormatting.formatCurrency(
                    (flowState.priceBreakdown?.subtotal || 0) + (flowState.priceBreakdown?.addOnsTotal || 0)
                  )}
                </Text>
              </View>

              <View style={[styles.priceRow, styles.vatRow]}>
                <Text style={styles.vatLabel}>VAT (5%):</Text>
                <Text style={styles.vatValue}>
                  {financialFormatting.formatCurrency(flowState.priceBreakdown?.vatAmount || 0)}
                </Text>
              </View>

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  {financialFormatting.formatCurrency(totalAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'CREDIT_CARD' && styles.paymentMethodActive
                ]}
                onPress={() => setPaymentMethod('CREDIT_CARD')}
              >
                <Ionicons
                  name="card"
                  size={24}
                  color={paymentMethod === 'CREDIT_CARD' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'CREDIT_CARD' && styles.paymentMethodTextActive
                  ]}
                >
                  Credit Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'DEBIT_CARD' && styles.paymentMethodActive
                ]}
                onPress={() => setPaymentMethod('DEBIT_CARD')}
              >
                <Ionicons
                  name="card-outline"
                  size={24}
                  color={paymentMethod === 'DEBIT_CARD' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'DEBIT_CARD' && styles.paymentMethodTextActive
                  ]}
                >
                  Debit Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'BANK_TRANSFER' && styles.paymentMethodActive
                ]}
                onPress={() => setPaymentMethod('BANK_TRANSFER')}
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={paymentMethod === 'BANK_TRANSFER' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'BANK_TRANSFER' && styles.paymentMethodTextActive
                  ]}
                >
                  Bank Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'CASH' && styles.paymentMethodActive
                ]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Ionicons
                  name="cash"
                  size={24}
                  color={paymentMethod === 'CASH' ? colors.primary.main : colors.neutral.text.secondary}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'CASH' && styles.paymentMethodTextActive
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Details from KYC */}
          {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card Details</Text>
              <View style={styles.cardDetailsCard}>
                <View style={styles.cardRow}>
                  <Ionicons name="card" size={40} color={colors.primary.main} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardType}>{cardType}</Text>
                    <Text style={styles.cardNumber}>•••• •••• •••• {cardLast4}</Text>
                    <Text style={styles.cardHolder}>{cardHolderName}</Text>
                    <Text style={styles.cardBank}>{bankProvider}</Text>
                  </View>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.financial.positive} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>
          )}

          {/* Notification Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how you'd like to receive booking updates and confirmations
            </Text>
            <View style={styles.notificationContainer}>
              <View style={styles.notificationOption}>
                <View style={styles.notificationLabelContainer}>
                  <Ionicons name="mail" size={20} color={colors.primary.main} />
                  <Text style={styles.notificationText}>Email</Text>
                </View>
                <Switch
                  value={notificationPrefs.email}
                  onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, email: value }))}
                  trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                  thumbColor={notificationPrefs.email ? colors.primary.main : colors.neutral.text.secondary}
                />
              </View>
              <View style={styles.notificationOption}>
                <View style={styles.notificationLabelContainer}>
                  <Ionicons name="chatbubble" size={20} color={colors.primary.main} />
                  <Text style={styles.notificationText}>SMS</Text>
                </View>
                <Switch
                  value={notificationPrefs.sms}
                  onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, sms: value }))}
                  trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                  thumbColor={notificationPrefs.sms ? colors.primary.main : colors.neutral.text.secondary}
                />
              </View>
              <View style={styles.notificationOption}>
                <View style={styles.notificationLabelContainer}>
                  <Ionicons name="logo-whatsapp" size={20} color={colors.primary.main} />
                  <Text style={styles.notificationText}>WhatsApp</Text>
                </View>
                <Switch
                  value={notificationPrefs.whatsapp}
                  onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, whatsapp: value }))}
                  trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                  thumbColor={notificationPrefs.whatsapp ? colors.primary.main : colors.neutral.text.secondary}
                />
              </View>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.termsCheckbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                {termsAccepted && <Ionicons name="checkmark" size={16} color={colors.neutral.white} />}
              </View>
              <Text style={styles.termsText}>
                I authorize the charge of{' '}
                <Text style={styles.termsHighlight}>
                  {financialFormatting.formatCurrency(totalAmount)}
                </Text>
                {' '}to my {paymentMethod.toLowerCase().replace('_', ' ')} and agree to the{' '}
                <Text style={styles.termsLink}>payment terms and conditions</Text>.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBox}>
            <Ionicons name="lock-closed" size={24} color={colors.financial.positive} />
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Secure Payment</Text>
              <Text style={styles.securityText}>
                Your payment is encrypted and processed through secure banking channels.
                An accounting entry will be created for bookkeeping purposes.
              </Text>
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.primary.main} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payButton,
                (!termsAccepted || isProcessing) && styles.payButtonDisabled
              ]}
              onPress={processPayment}
              disabled={!termsAccepted || isProcessing}
            >
              <LinearGradient
                colors={termsAccepted ? gradients.successButton.colors : [colors.neutral.text.disabled, colors.neutral.text.disabled]}
                start={gradients.successButton.start}
                end={gradients.successButton.end}
                style={styles.payButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.neutral.white} />
                    <Text style={styles.payButtonText}>
                      Pay {financialFormatting.formatCurrency(totalAmount)}
                    </Text>
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
  summaryCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...colors.shadows.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  priceCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...colors.shadows.medium,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
    marginVertical: 8,
  },
  vatRow: {
    backgroundColor: colors.financial.vat + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  vatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.financial.vat,
  },
  vatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.financial.vat,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.neutral.divider,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.secondary,
  },
  paymentMethodTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  cardDetailsCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...colors.shadows.medium,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginVertical: 4,
  },
  cardHolder: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    textTransform: 'uppercase',
  },
  cardBank: {
    fontSize: 12,
    color: colors.neutral.text.hint,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.financial.positive + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.financial.positive,
  },
  termsContainer: {
    marginVertical: 20,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.text.secondary,
    lineHeight: 20,
  },
  termsHighlight: {
    fontWeight: '600',
    color: colors.primary.main,
  },
  termsLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  securityBox: {
    flexDirection: 'row',
    backgroundColor: colors.financial.positive + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.financial.positive,
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 4,
  },
  securityText: {
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
  payButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    ...colors.shadows.large,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  payButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Notification Preferences Styles
  sectionSubtitle: {
    fontSize: 13,
    color: colors.neutral.text.secondary,
    marginBottom: 12,
    marginTop: -8,
  },
  notificationContainer: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...colors.shadows.small,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.divider,
  },
  notificationLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: colors.neutral.text.primary,
    fontWeight: '500',
  },
});
