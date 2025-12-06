import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, financialFormatting } from '../theme/colors';
import { useBookingFlow } from '../contexts/BookingFlowContext';
import { useAuth } from '../contexts/AuthContext';
import ProgressIndicator from '../components/ProgressIndicator';

interface BookingConfirmationScreenProps {
  navigation: any;
}

export default function BookingConfirmationScreen({ navigation }: BookingConfirmationScreenProps) {
  const { flowState, resetFlow } = useBookingFlow();
  const { user } = useAuth();

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const receiptNumber = flowState.paymentData?.receiptNumber || 'N/A';
  const transactionId = flowState.paymentData?.transactionId || 'N/A';
  const transactionDate = flowState.paymentData?.transactionDate;
  const paymentMethod = flowState.paymentData?.paymentMethod || 'N/A';
  const totalAmount = flowState.paymentData?.amount || 0;

  const vehicleInfo = `${flowState.vehicle?.make} ${flowState.vehicle?.model} ${flowState.vehicle?.year}`;
  const rentalPeriod = `${formatDate(flowState.rentalPeriod?.startDate)} - ${formatDate(flowState.rentalPeriod?.endDate)}`;

  useEffect(() => {
    // In production, send final booking data to backend
    // await bookingAPI.createBooking({ ...flowState });
  }, []);

  const handleDownloadReceipt = async () => {
    // In production, generate and download PDF receipt
    if (Platform.OS === 'web') {
      window.alert('PDF receipt download will be implemented in the next phase.');
    } else {
      alert('PDF receipt download will be implemented in the next phase.');
    }
  };

  const handleShareReceipt = async () => {
    const receiptText = `
Booking Confirmation - Vesla Rent-a-Car

Receipt: ${receiptNumber}
Transaction: ${transactionId}
Date: ${formatDate(transactionDate)}

Vehicle: ${vehicleInfo}
Rental Period: ${rentalPeriod}
Total Days: ${flowState.rentalPeriod?.totalDays}

Amount Paid: ${financialFormatting.formatCurrency(totalAmount)}
Payment Method: ${paymentMethod}

Thank you for choosing Vesla Rent-a-Car!
    `;

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(receiptText);
        alert('Receipt details copied to clipboard!');
      } else {
        await Share.share({
          message: receiptText,
          title: 'Booking Receipt',
        });
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handleDone = () => {
    resetFlow(); // Clear booking flow state
    navigation.navigate('VehicleList'); // Return to vehicle list
  };

  const handleViewBookings = () => {
    resetFlow();
    navigation.navigate('BookingHistory'); // Navigate to booking history (if exists)
  };

  return (
    <View style={styles.container}>
      <ProgressIndicator currentStep={4} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={80} color={colors.financial.positive} />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your payment has been processed successfully
            </Text>
          </View>

          {/* Receipt Card */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Ionicons name="receipt-outline" size={32} color={colors.primary.main} />
              <View style={styles.receiptHeaderText}>
                <Text style={styles.receiptTitle}>Payment Receipt</Text>
                <Text style={styles.receiptNumber}>#{receiptNumber}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Transaction Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue}>{transactionId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(transactionDate)} at {formatTime(transactionDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {paymentMethod.replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.financial.positive} />
                  <Text style={styles.statusText}>COMPLETED</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Booking Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>
                  {user?.firstName} {user?.lastName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{user?.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle:</Text>
                <Text style={styles.detailValue}>{vehicleInfo}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rental Period:</Text>
                <Text style={styles.detailValue}>
                  {flowState.rentalPeriod?.totalDays} days
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Date:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(flowState.rentalPeriod?.startDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>End Date:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(flowState.rentalPeriod?.endDate)}
                </Text>
              </View>
              {flowState.selectedAddOns && flowState.selectedAddOns.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Add-ons:</Text>
                  <Text style={styles.detailValue}>
                    {flowState.selectedAddOns.map(a => a.name).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Payment Summary - NO ACCOUNTING ENTRY SHOWN */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle Rental:</Text>
                <Text style={styles.detailValue}>
                  {financialFormatting.formatCurrency(flowState.priceBreakdown?.subtotal || 0)}
                </Text>
              </View>
              {flowState.priceBreakdown?.addOnsTotal && flowState.priceBreakdown.addOnsTotal > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Add-ons:</Text>
                  <Text style={styles.detailValue}>
                    {financialFormatting.formatCurrency(flowState.priceBreakdown.addOnsTotal)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subtotal:</Text>
                <Text style={styles.detailValue}>
                  {financialFormatting.formatCurrency(
                    (flowState.priceBreakdown?.subtotal || 0) + (flowState.priceBreakdown?.addOnsTotal || 0)
                  )}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.vatRow]}>
                <Text style={styles.vatLabel}>VAT (5%):</Text>
                <Text style={styles.vatValue}>
                  {financialFormatting.formatCurrency(flowState.priceBreakdown?.vatAmount || 0)}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Paid:</Text>
                <Text style={styles.totalValue}>
                  {financialFormatting.formatCurrency(totalAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDownloadReceipt}>
              <Ionicons name="download-outline" size={24} color={colors.primary.main} />
              <Text style={styles.actionButtonText}>Download PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShareReceipt}>
              <Ionicons name="share-social-outline" size={24} color={colors.primary.main} />
              <Text style={styles.actionButtonText}>Share Receipt</Text>
            </TouchableOpacity>
          </View>

          {/* Important Information */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={colors.financial.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What's Next?</Text>
              <Text style={styles.infoText}>
                • A confirmation email has been sent to {user?.email}
              </Text>
              <Text style={styles.infoText}>
                • Please bring your driver's license and Emirates ID/Passport when picking up the vehicle
              </Text>
              <Text style={styles.infoText}>
                • Vehicle inspection will be conducted at pickup
              </Text>
              <Text style={styles.infoText}>
                • You can view this booking in your booking history
              </Text>
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleViewBookings}>
              <Ionicons name="list-outline" size={20} color={colors.primary.main} />
              <Text style={styles.secondaryButtonText}>View My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
              <LinearGradient
                colors={gradients.primaryButton.colors}
                start={gradients.primaryButton.start}
                end={gradients.primaryButton.end}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Done</Text>
                <Ionicons name="home-outline" size={20} color={colors.neutral.white} />
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIconCircle: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.financial.positive,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral.text.secondary,
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...colors.shadows.large,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  receiptHeaderText: {
    flex: 1,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral.text.primary,
  },
  receiptNumber: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
    marginVertical: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.financial.positive + '10',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.financial.positive,
  },
  vatRow: {
    backgroundColor: colors.financial.vat + '10',
    marginHorizontal: -20,
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.financial.positive,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    ...colors.shadows.small,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.financial.info + '10',
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...colors.shadows.large,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
