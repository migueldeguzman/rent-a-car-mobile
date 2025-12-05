import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

interface AdminBookingViewerScreenProps {
  navigation: any;
}

export default function AdminBookingViewerScreen({ navigation }: AdminBookingViewerScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  }>({
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    loadBookings();
    loadStatusCounts();
  }, [filter, currentPage]);

  const loadBookings = async () => {
    try {
      const statusFilter = filter === 'ALL' ? undefined : filter;
      const result = await bookingAPI.getAllBookings(currentPage, 10, statusFilter);

      setBookings(result.bookings);
      setTotalCount(result.pagination.totalCount);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadStatusCounts = async () => {
    try {
      const [allCount, pendingCount, confirmedCount, completedCount, cancelledCount] = await Promise.all([
        bookingAPI.getBookingCount(),
        bookingAPI.getBookingCount('PENDING'),
        bookingAPI.getBookingCount('CONFIRMED'),
        bookingAPI.getBookingCount('COMPLETED'),
        bookingAPI.getBookingCount('CANCELLED'),
      ]);

      setStatusCounts({
        all: allCount.total,
        pending: pendingCount.total,
        confirmed: confirmedCount.total,
        completed: completedCount.total,
        cancelled: cancelledCount.total,
      });
    } catch (error) {
      console.error('Failed to load status counts:', error);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    loadBookings();
    loadStatusCounts();
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

    // Parse totalAmount and calculate VAT
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

        {/* Customer Info */}
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={colors.neutral.text.secondary} />
          <Text style={styles.infoText}>
            {booking.customer_email || 'N/A'}
          </Text>
        </View>

        {/* Vehicle Info */}
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={18} color={colors.neutral.text.secondary} />
          <Text style={styles.infoText}>
            {booking.vehicle_name || 'N/A'}
          </Text>
        </View>

        {/* Company Info */}
        {booking.company_name && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color={colors.neutral.text.secondary} />
            <Text style={styles.infoText}>{booking.company_name}</Text>
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

        {/* Add-ons Display */}
        {booking.addons && booking.addons.length > 0 && (
          <View style={styles.addonsSection}>
            <Text style={styles.addonsLabel}>Add-ons:</Text>
            <View style={styles.addonsList}>
              {booking.addons.map((addon: any, index: number) => (
                <View key={index} style={styles.addonChip}>
                  <Text style={styles.addonText}>{addon.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={80} color={colors.neutral.text.disabled} />
      <Text style={styles.emptyStateTitle}>No Bookings Found</Text>
      <Text style={styles.emptyStateText}>
        {filter === 'ALL'
          ? "No bookings have been made yet"
          : `No ${filter.toLowerCase()} bookings found`}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Total Count */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Booking Management</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countLabel}>Total Bookings</Text>
            <Text style={styles.countValue}>{statusCounts.all}</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => {
            setFilter('ALL');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
            All ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'PENDING' && styles.filterTabActive]}
          onPress={() => {
            setFilter('PENDING');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.filterTabText, filter === 'PENDING' && styles.filterTabTextActive]}>
            Pending ({statusCounts.pending})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'CONFIRMED' && styles.filterTabActive]}
          onPress={() => {
            setFilter('CONFIRMED');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.filterTabText, filter === 'CONFIRMED' && styles.filterTabTextActive]}>
            Confirmed ({statusCounts.confirmed})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'COMPLETED' && styles.filterTabActive]}
          onPress={() => {
            setFilter('COMPLETED');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.filterTabText, filter === 'COMPLETED' && styles.filterTabTextActive]}>
            Completed ({statusCounts.completed})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'CANCELLED' && styles.filterTabActive]}
          onPress={() => {
            setFilter('CANCELLED');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.filterTabText, filter === 'CANCELLED' && styles.filterTabTextActive]}>
            Cancelled ({statusCounts.cancelled})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
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
        showsVerticalScrollIndicator={true}
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? colors.neutral.text.disabled : colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.paginationText}>
                Page {currentPage} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? colors.neutral.text.disabled : colors.primary.main} />
              </TouchableOpacity>
            </View>
          ) : null
        }
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
  header: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    ...colors.shadows.medium,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 11,
    color: colors.neutral.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  countValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.ui.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    ...colors.shadows.small,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: colors.primary.main,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.text.secondary,
    textAlign: 'center',
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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral.text.primary,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
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
    fontSize: 13,
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
  addonsSection: {
    marginBottom: 12,
  },
  addonsLabel: {
    fontSize: 12,
    color: colors.neutral.text.secondary,
    marginBottom: 6,
  },
  addonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  addonChip: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addonText: {
    fontSize: 11,
    color: colors.primary.main,
    fontWeight: '500',
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
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.ui.cardBackground,
    ...colors.shadows.small,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationText: {
    fontSize: 14,
    color: colors.neutral.text.primary,
    fontWeight: '500',
  },
});
