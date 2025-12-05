import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Booking } from '../types';

interface BookingConfirmationScreenProps {
  navigation: any;
  route: {
    params: {
      booking: Booking;
      invoice?: any; // Invoice object from backend
    };
  };
}

export default function BookingConfirmationScreen({
  navigation,
  route,
}: BookingConfirmationScreenProps) {
  const { booking, invoice } = route.params;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleBackToHome = () => {
    navigation.navigate('VehicleList');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={true}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>

        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your booking has been successfully confirmed and invoice generated
        </Text>

        {/* Invoice Details Card */}
        {invoice && (
          <View style={styles.invoiceCard}>
            <Text style={styles.cardTitle}>Invoice Generated</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Number</Text>
              <Text style={styles.detailValue}>{invoice.invoiceNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.invoiceDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subtotal</Text>
              <Text style={styles.detailValue}>
                AED {parseFloat(invoice.subtotal).toFixed(2)}
              </Text>
            </View>

            {invoice.taxAmount > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VAT (5%)</Text>
                <Text style={styles.detailValue}>
                  AED {parseFloat(invoice.taxAmount).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                AED {parseFloat(invoice.totalAmount).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.invoiceStatusBadge}>
                <Text style={styles.invoiceStatusText}>{invoice.status}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Booking Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Number</Text>
            <Text style={styles.detailValue}>{booking.bookingNumber}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{booking.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {booking.vehicle && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {booking.vehicle.make} {booking.vehicle.model}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plate Number</Text>
                <Text style={styles.detailValue}>{booking.vehicle.plateNumber}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.startDate)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.endDate)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Days</Text>
            <Text style={styles.detailValue}>{booking.totalDays} days</Text>
          </View>

          <View style={styles.divider} />

          {/* Rate Breakdown */}
          {booking.monthlyPeriods > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {booking.monthlyPeriods} month{booking.monthlyPeriods > 1 ? 's' : ''}
              </Text>
              <Text style={styles.detailValue}>
                AED {(booking.monthlyPeriods * parseFloat(booking.monthlyRate)).toFixed(2)}
              </Text>
            </View>
          )}

          {booking.remainingDays > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {booking.remainingDays} day{booking.remainingDays > 1 ? 's' : ''}
              </Text>
              <Text style={styles.detailValue}>
                AED {(booking.remainingDays * parseFloat(booking.dailyRate)).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Rental Amount</Text>
            <Text style={styles.totalValue}>
              AED {parseFloat(booking.totalAmount).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Invoice Items */}
        {invoice?.items && invoice.items.length > 0 && (
          <View style={styles.itemsCard}>
            <Text style={styles.cardTitle}>Invoice Items</Text>
            {invoice.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemAmount}>
                  AED {parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What's Next?</Text>
          <Text style={styles.infoText}>
            • Your booking is CONFIRMED with invoice {invoice?.invoiceNumber}
          </Text>
          <Text style={styles.infoText}>
            • The invoice has been posted to the accounting system
          </Text>
          <Text style={styles.infoText}>
            • Payment is due by {invoice ? formatDate(invoice.dueDate) : 'TBD'}
          </Text>
          <Text style={styles.infoText}>
            • Present this booking number at pickup: {booking.bookingNumber}
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleBackToHome}>
          <Text style={styles.primaryButtonText}>Back to Vehicles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('VehicleList')}
        >
          <Text style={styles.secondaryButtonText}>Book Another Vehicle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceStatusBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invoiceStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    marginTop: 12,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoBox: {
    backgroundColor: '#E8F4F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 30,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});