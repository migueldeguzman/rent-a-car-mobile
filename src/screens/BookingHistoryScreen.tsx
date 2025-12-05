import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { bookingAPI } from '../services/api';
import { Booking } from '../types';
import { colors, financialFormatting } from '../theme/colors';

interface BookingHistoryScreenProps {
  navigation: any;
}

export default function BookingHistoryScreen({ navigation }: BookingHistoryScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const myBookings = await bookingAPI.getMyBookings();
      // Sort by start date descending (most recent first)
      const sortedBookings = myBookings.sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setBookings(sortedBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  const getFilteredBookings = (): Booking[] => {
    const now = new Date();

    switch (filter) {
      case 'UPCOMING':
        return bookings.filter(booking =>
          new Date(booking.startDate) > now &&
          (booking.status === 'CONFIRMED' || booking.status === 'PENDING')
        );
      case 'PAST':
        return bookings.filter(booking =>
          new Date(booking.endDate) < now ||
          booking.status === 'COMPLETED' ||
          booking.status === 'CANCELLED'
        );
      default:
        return bookings;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return colors.status.pending;
      case 'CONFIRMED':
        return colors.status.confirmed;
      case 'ACTIVE':
        return colors.status.active;
      case 'COMPLETED':
        return colors.status.completed;
      case 'CANCELLED':
        return colors.status.cancelled;
      default:
        return colors.neutral.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'time-outline';
      case 'CONFIRMED':
        return 'checkmark-circle-outline';
      case 'ACTIVE':
        return 'car-outline';
      case 'COMPLETED':
        return 'checkmark-done-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderBookingCard = ({ item: booking }: { item: Booking }) => {
    const days = calculateDays(booking.startDate, booking.endDate);
    const statusColor = getStatusColor(booking.status);
    const statusIcon = getStatusIcon(booking.status);

    // Calculate total with VAT (assuming 5% VAT)
    const subtotal = parseFloat(booking.totalAmount);
    const vatAmount = financialFormatting.calculateVAT(subtotal);
    const totalWithVat = subtotal + vatAmount;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.bookingNumber}>
            <Text style={styles.bookingNumberLabel}>Booking #</Text>
            <Text style={styles.bookingNumberValue}>{booking.bookingNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon as any} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {booking.status}
            </Text>
          </View>
        </View>

        {booking.vehicle && (
          <View style={styles.vehicleInfo}>
            <Ionicons name="car-outline" size={20} color={colors.neutral.text.secondary} />
            <Text style={styles.vehicleText}>
              {booking.vehicle.make} {booking.vehicle.model} {booking.vehicle.year}
            </Text>
          </View>
        )}

        <View style={styles.dateRow}>
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>{formatDate(booking.startDate)}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color={colors.neutral.text.secondary} />
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>{formatDate(booking.endDate)}</Text>
          </View>
          <View style={styles.daysSection}>
            <Text style={styles.daysValue}>{days}</Text>
            <Text style={styles.daysLabel}>day{days !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceSubtext}>(incl. 5% VAT)</Text>
          </View>
          <Text style={styles.priceValue}>
            {financialFormatting.formatCurrency(totalWithVat)}
          </Text>
        </View>

        {booking.invoiceId && (
          <TouchableOpacity style={styles.invoiceButton}>
            <Ionicons name="document-text-outline" size={16} color={colors.primary.main} />
            <Text style={styles.invoiceButtonText}>View Invoice</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={80} color={colors.neutral.text.disabled} />
      <Text style={styles.emptyStateTitle}>No Bookings Found</Text>
      <Text style={styles.emptyStateText}>
        {filter === 'UPCOMING'
          ? "You don't have any upcoming bookings"
          : filter === 'PAST'
          ? "You don't have any past bookings"
          : "You haven't made any bookings yet"}
      </Text>
      <TouchableOpacity
        style={styles.newBookingButton}
        onPress={() => navigation.navigate('Vehicles')}
      >
        <Text style={styles.newBookingButtonText}>Browse Vehicles</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
            All ({bookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'UPCOMING' && styles.filterTabActive]}
          onPress={() => setFilter('UPCOMING')}
        >
          <Text style={[styles.filterTabText, filter === 'UPCOMING' && styles.filterTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'PAST' && styles.filterTabActive]}
          onPress={() => setFilter('PAST')}
        >
          <Text style={[styles.filterTabText, filter === 'PAST' && styles.filterTabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral.text.secondary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.ui.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    ...colors.shadows.small,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.primary.main,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.secondary,
  },
  filterTabTextActive: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...colors.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingNumber: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bookingNumberLabel: {
    fontSize: 12,
    color: colors.neutral.text.secondary,
  },
  bookingNumberValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.neutral.text.secondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  daysSection: {
    alignItems: 'center',
    backgroundColor: colors.primary.main + '10',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  daysLabel: {
    fontSize: 10,
    color: colors.primary.main,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
  },
  priceSubtext: {
    fontSize: 11,
    color: colors.neutral.text.hint,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '05',
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary.main,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  newBookingButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newBookingButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
});