import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Vehicle, AddOn, NotificationPreferences, PriceBreakdown } from '../types';
import { useBookingFlow } from '../contexts/BookingFlowContext';
import { colors, gradients, financialFormatting } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProgressIndicator from '../components/ProgressIndicator';

interface BookingScreenProps {
  navigation: any;
  route: {
    params: {
      vehicle: Vehicle;
    };
  };
}

// Default add-on services (monthly rates)
const DEFAULT_ADDONS: AddOn[] = [
  { id: 'additional-driver', name: 'Additional Driver', description: 'Add one extra authorized driver', dailyRate: 100, totalAmount: 0, selected: false },
  { id: 'insurance-upgrade', name: 'Premium Insurance', description: 'Zero deductible comprehensive coverage', dailyRate: 200, totalAmount: 0, selected: false },
];

type RentalPeriodOption = '1_MONTH' | '3_MONTHS' | '6_MONTHS' | 'CUSTOM';

export default function BookingScreen({ navigation, route }: BookingScreenProps) {
  const { vehicle } = route.params;
  const { setVehicleSelection, nextStep } = useBookingFlow();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default to 1 month
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<RentalPeriodOption>('1_MONTH'); // Default to 1 month
  const [isLoading, setIsLoading] = useState(false);


  // State management
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Week 3 states
  const [addOns, setAddOns] = useState<AddOn[]>(DEFAULT_ADDONS);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    whatsapp: false,
  });

  // Monthly discount tiers
  const getMonthlyRateForPeriod = (months: number): number => {
    const baseMonthlyRate = typeof vehicle.monthlyRate === 'string' ? parseFloat(vehicle.monthlyRate) : vehicle.monthlyRate;

    if (months >= 6) {
      return baseMonthlyRate - 100; // 6+ months: 100 AED cheaper per month
    } else if (months >= 3) {
      return baseMonthlyRate - 50; // 3-5 months: 50 AED cheaper per month
    } else {
      return baseMonthlyRate; // 1-2 months: base rate
    }
  };

  // Handle period selection changes
  const handlePeriodChange = (period: RentalPeriodOption) => {
    setSelectedPeriod(period);
    const today = new Date();

    if (period === '1_MONTH') {
      setEndDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
    } else if (period === '3_MONTHS') {
      setEndDate(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000));
    } else if (period === '6_MONTHS') {
      setEndDate(new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000));
    }
    // For CUSTOM, don't change the end date - let user pick
  };

  // Calculate rates based on selected period
  const calculatePanelBasedRate = (): {
    totalAmount: number;
    breakdown: string;
    totalDays: number;
    savings: number;
    monthlyRate: number;
    months: number;
  } => {
    const diffTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
      return { totalAmount: 0, breakdown: 'Invalid date range', totalDays: 0, savings: 0, monthlyRate: 0, months: 0 };
    }

    const daily = typeof vehicle.dailyRate === 'string' ? parseFloat(vehicle.dailyRate) : vehicle.dailyRate;
    const baseMonthlyRate = typeof vehicle.monthlyRate === 'string' ? parseFloat(vehicle.monthlyRate) : vehicle.monthlyRate;

    const months = Math.floor(totalDays / 30);
    const remainingDays = totalDays % 30;

    const applicableMonthlyRate = getMonthlyRateForPeriod(months);

    let totalAmount: number;
    let breakdown: string;
    let savings = 0;

    if (months > 0) {
      totalAmount = (months * applicableMonthlyRate) + (remainingDays * daily);
      breakdown = `${months} month${months > 1 ? 's' : ''} × ${financialFormatting.formatCurrency(applicableMonthlyRate)}`;
      if (remainingDays > 0) {
        breakdown += ` + ${remainingDays} day${remainingDays > 1 ? 's' : ''} × ${financialFormatting.formatCurrency(daily)}`;
      }

      // Calculate savings compared to base rate
      const baseTotal = (months * baseMonthlyRate) + (remainingDays * daily);
      savings = baseTotal - totalAmount;
    } else {
      // Less than a month - use daily rate
      totalAmount = totalDays * daily;
      breakdown = `${totalDays} day${totalDays > 1 ? 's' : ''} × ${financialFormatting.formatCurrency(daily)}/day`;
    }

    return { totalAmount, breakdown, totalDays, savings, monthlyRate: applicableMonthlyRate, months };
  };

  const rateCalculation = calculatePanelBasedRate();

  // Calculate add-ons total (monthly rates)
  const calculateAddOnsTotal = (): number => {
    return addOns
      .filter(addon => addon.selected)
      .reduce((total, addon) => total + (addon.dailyRate * rateCalculation.months), 0);
  };

  // Calculate complete price breakdown with VAT
  const calculatePriceBreakdown = (): PriceBreakdown => {
    const subtotal = rateCalculation.totalAmount;
    const addOnsTotal = calculateAddOnsTotal();
    const subtotalWithAddons = subtotal + addOnsTotal;
    const vatAmount = financialFormatting.calculateVAT(subtotalWithAddons);
    const totalWithVat = subtotalWithAddons + vatAmount;

    return {
      subtotal,
      vatRate: 5,
      vatAmount,
      totalWithVat,
      securityDeposit: 0, // Security deposit removed
      addOnsTotal,
      grandTotal: totalWithVat,
    };
  };

  const priceBreakdown = useMemo(() => calculatePriceBreakdown(), [rateCalculation, addOns]);

  // Calculate savings percentage
  const savingsPercentage = rateCalculation.savings > 0
    ? ((rateCalculation.savings / (rateCalculation.totalDays * parseFloat(String(vehicle.dailyRate)))) * 100).toFixed(0)
    : 0;

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      // Ensure end date is after start date
      if (selectedDate >= endDate) {
        setEndDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const validateMinimumPeriod = (): boolean => {
    const days = rateCalculation.totalDays;

    // For preset periods, validation is built-in
    // For custom period, ensure minimum 1 day
    if (selectedPeriod === 'CUSTOM' && days < 1) {
      Alert.alert('Minimum Period', 'Rental requires at least 1 day');
      return false;
    }

    // Check for short notice booking
    const hoursUntilStart = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilStart < 2) {
      Alert.alert(
        'Short Notice Booking',
        'This booking is less than 2 hours from now. Additional charges may apply. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => true },
        ]
      );
    }

    return true;
  };

  const toggleAddOn = (addonId: string) => {
    setAddOns(prevAddOns =>
      prevAddOns.map(addon =>
        addon.id === addonId
          ? { ...addon, selected: !addon.selected }
          : addon
      )
    );
  };

  const handleBooking = async () => {
    console.log('🚗 Booking button clicked');

    if (startDate >= endDate) {
      const msg = 'End date must be after start date';
      console.error('❌ Invalid dates:', msg);
      if (Platform.OS === 'web') {
        window.alert('Invalid Dates: ' + msg);
      } else {
        Alert.alert('Invalid Dates', msg);
      }
      return;
    }

    if (!validateMinimumPeriod()) {
      console.log('❌ Minimum period validation failed');
      return;
    }

    if (!termsAccepted) {
      const msg = 'Please accept the terms and conditions to proceed';
      console.error('❌ Terms not accepted');
      if (Platform.OS === 'web') {
        window.alert('Terms & Conditions: ' + msg);
      } else {
        Alert.alert('Terms & Conditions', msg);
      }
      return;
    }

    console.log('✅ All validations passed, showing confirmation dialog');

    const selectedAddOns = addOns.filter(addon => addon.selected);
    const addOnsText = selectedAddOns.length > 0
      ? `\n\nAdd-ons:\n${selectedAddOns.map(a => `• ${a.name}: ${financialFormatting.formatCurrency(a.dailyRate)}/month`).join('\n')}`
      : '';

    const periodLabel = selectedPeriod === '1_MONTH' ? '1 Month' :
                        selectedPeriod === '3_MONTHS' ? '3 Months' :
                        selectedPeriod === '6_MONTHS' ? '6 Months' : 'Custom Period';

    const confirmMessage =
      `Book ${vehicle.make} ${vehicle.model} for ${rateCalculation.totalDays} days?\n\n` +
      `Rental Period: ${periodLabel}\n` +
      `Subtotal: ${financialFormatting.formatCurrency(priceBreakdown.subtotal)}\n` +
      `Add-ons: ${financialFormatting.formatCurrency(priceBreakdown.addOnsTotal || 0)}${addOnsText}\n` +
      `VAT (5%): ${financialFormatting.formatCurrency(priceBreakdown.vatAmount)}\n` +
      `Total: ${financialFormatting.formatCurrency(priceBreakdown.totalWithVat)}`;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Confirm Booking',
            confirmMessage,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Confirm', onPress: () => resolve(true) },
            ]
          );
        });

    if (confirmed) {
      setIsLoading(true);
      try {
        // Save Step 1 data to BookingFlowContext
        const selectedAddOns = addOns.filter(addon => addon.selected);

        setVehicleSelection(
          vehicle,
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays: rateCalculation.totalDays,
            monthlyPeriods: rateCalculation.months,
            remainingDays: rateCalculation.totalDays % 30,
          },
          selectedAddOns,
          priceBreakdown
        );

        console.log('✅ Vehicle selection saved to context');

        // Move to Step 2: KYC/Eligibility
        nextStep();
        navigation.navigate('KYCEligibility');
      } catch (error: any) {
        console.error('❌ Error saving vehicle selection:', error);

        if (Platform.OS === 'web') {
          window.alert('Error: Could not proceed to next step');
        } else {
          Alert.alert('Error', 'Could not proceed to next step');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openTermsAndConditions = () => {
    // In a real app, this would open the T&C page
    Linking.openURL('https://www.example.com/terms-and-conditions');
  };

  return (
    <>
      <ProgressIndicator currentStep={1} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <View style={styles.content}>
        {/* Vehicle Info */}
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleName}>
            {vehicle.make} {vehicle.model} {vehicle.year}
          </Text>
          <Text style={styles.vehicleDetails}>
            {vehicle.plateNumber} • {vehicle.color ?? 'N/A'}
          </Text>
          {vehicle.description && (
            <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
          )}
        </View>

        {/* Rental Period Selection - Panel-Based UI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Rental Period</Text>
          <Text style={styles.sectionSubtitle}>Save more with longer rentals!</Text>

          <View style={styles.periodGrid}>
            {/* 1 Month Panel */}
            <TouchableOpacity
              style={[styles.periodPanel, selectedPeriod === '1_MONTH' && styles.periodPanelActive]}
              onPress={() => handlePeriodChange('1_MONTH')}
            >
              <Text style={[styles.periodTitle, selectedPeriod === '1_MONTH' && styles.periodTitleActive]}>
                1 Month
              </Text>
              <Text style={[styles.periodRate, selectedPeriod === '1_MONTH' && styles.periodRateActive]}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(1))}
              </Text>
              <Text style={styles.periodLabel}>per month</Text>
              <Text style={styles.periodNote}>Base rate</Text>
            </TouchableOpacity>

            {/* 3 Months Panel - Popular */}
            <TouchableOpacity
              style={[
                styles.periodPanel,
                styles.popularPeriod,
                selectedPeriod === '3_MONTHS' && styles.periodPanelActive
              ]}
              onPress={() => handlePeriodChange('3_MONTHS')}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
              <Text style={[styles.periodTitle, selectedPeriod === '3_MONTHS' && styles.periodTitleActive]}>
                3 Months
              </Text>
              <Text style={[styles.periodRate, selectedPeriod === '3_MONTHS' && styles.periodRateActive]}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(3))}
              </Text>
              <Text style={styles.periodLabel}>per month</Text>
              <View style={styles.savingsBadgeInline}>
                <Text style={styles.savingsTextInline}>Save 50 AED/mo</Text>
              </View>
            </TouchableOpacity>

            {/* 6 Months Panel - Best Value */}
            <TouchableOpacity
              style={[
                styles.periodPanel,
                styles.bestValuePeriod,
                selectedPeriod === '6_MONTHS' && styles.periodPanelActive
              ]}
              onPress={() => handlePeriodChange('6_MONTHS')}
            >
              <View style={[styles.popularBadge, styles.bestValueBadge]}>
                <Text style={styles.popularBadgeText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.periodTitle, selectedPeriod === '6_MONTHS' && styles.periodTitleActive]}>
                6 Months
              </Text>
              <Text style={[styles.periodRate, selectedPeriod === '6_MONTHS' && styles.periodRateActive]}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(6))}
              </Text>
              <Text style={styles.periodLabel}>per month</Text>
              <View style={styles.savingsBadgeInline}>
                <Text style={styles.savingsTextInline}>Save 100 AED/mo</Text>
              </View>
            </TouchableOpacity>

            {/* Custom Period Panel */}
            <TouchableOpacity
              style={[styles.periodPanel, selectedPeriod === 'CUSTOM' && styles.periodPanelActive]}
              onPress={() => handlePeriodChange('CUSTOM')}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color={selectedPeriod === 'CUSTOM' ? colors.primary.main : colors.neutral.text.secondary}
                style={{ marginBottom: 8 }}
              />
              <Text style={[styles.periodTitle, selectedPeriod === 'CUSTOM' && styles.periodTitleActive]}>
                Custom
              </Text>
              <Text style={styles.periodNote}>Pick your dates</Text>
            </TouchableOpacity>
          </View>

          {/* Comparison Summary */}
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonTitle}>💰 Pricing Comparison</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>1 Month:</Text>
              <Text style={styles.comparisonValue}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(1))}/mo
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>3 Months:</Text>
              <Text style={[styles.comparisonValue, styles.comparisonSavings]}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(3))}/mo
                <Text style={styles.comparisonSavingsText}> (Save 50 AED/mo)</Text>
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>6 Months:</Text>
              <Text style={[styles.comparisonValue, styles.comparisonSavings]}>
                {financialFormatting.formatCurrency(getMonthlyRateForPeriod(6))}/mo
                <Text style={styles.comparisonSavingsText}> (Save 100 AED/mo)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Date Selection - Only show for Custom period */}
        {selectedPeriod === 'CUSTOM' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Date Range</Text>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Start Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setStartDate(newDate);
                  if (newDate >= endDate) {
                    setEndDate(new Date(newDate.getTime() + 24 * 60 * 60 * 1000));
                  }
                }}
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
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {startDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleStartDateChange}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>End Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                min={new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                onChange={(e) => {
                  setEndDate(new Date(e.target.value));
                }}
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
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {endDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
                    onChange={handleEndDateChange}
                  />
                )}
              </>
            )}
          </View>
        </View>
        )}

        {/* Add-on Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add-on Services (Optional)</Text>
          {addOns.map((addon) => (
            <TouchableOpacity
              key={addon.id}
              style={[styles.addonItem, addon.selected && styles.addonItemActive]}
              onPress={() => toggleAddOn(addon.id)}
            >
              <View style={styles.addonLeft}>
                <View style={[styles.checkbox, addon.selected && styles.checkboxActive]}>
                  {addon.selected && <Ionicons name="checkmark" size={16} color={colors.neutral.white} />}
                </View>
                <View style={styles.addonInfo}>
                  <Text style={styles.addonName}>{addon.name}</Text>
                  {addon.description && <Text style={styles.addonDescription}>{addon.description}</Text>}
                </View>
              </View>
              <Text style={styles.addonPrice}>
                {financialFormatting.formatCurrency(addon.dailyRate)}/month
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <View style={styles.notificationContainer}>
            <View style={styles.notificationOption}>
              <Text style={styles.notificationText}>Email</Text>
              <Switch
                value={notificationPrefs.email}
                onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, email: value }))}
                trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                thumbColor={notificationPrefs.email ? colors.primary.main : colors.neutral.text.secondary}
              />
            </View>
            <View style={styles.notificationOption}>
              <Text style={styles.notificationText}>SMS</Text>
              <Switch
                value={notificationPrefs.sms}
                onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, sms: value }))}
                trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                thumbColor={notificationPrefs.sms ? colors.primary.main : colors.neutral.text.secondary}
              />
            </View>
            <View style={styles.notificationOption}>
              <Text style={styles.notificationText}>WhatsApp</Text>
              <Switch
                value={notificationPrefs.whatsapp}
                onValueChange={(value) => setNotificationPrefs(prev => ({ ...prev, whatsapp: value }))}
                trackColor={{ false: colors.neutral.border, true: colors.primary.light }}
                thumbColor={notificationPrefs.whatsapp ? colors.primary.main : colors.neutral.text.secondary}
              />
            </View>
          </View>
        </View>

        {/* Price Breakdown with VAT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rental Period:</Text>
              <Text style={styles.priceValue}>
                {selectedPeriod === '1_MONTH' ? '1 Month' :
                 selectedPeriod === '3_MONTHS' ? '3 Months' :
                 selectedPeriod === '6_MONTHS' ? '6 Months' : 'Custom'}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Days:</Text>
              <Text style={styles.priceValue}>{rateCalculation.totalDays} days</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Breakdown:</Text>
              <Text style={[styles.priceValue, { fontSize: 12, flex: 1, textAlign: 'right' }]}>
                {rateCalculation.breakdown}
              </Text>
            </View>
            {rateCalculation.savings > 0 && (
              <View style={styles.savingsRow}>
                <Text style={styles.savingsLabel}>You Save:</Text>
                <Text style={styles.savingsValue}>
                  {financialFormatting.formatCurrency(rateCalculation.savings)} ({savingsPercentage}%)
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Vehicle Rental:</Text>
              <Text style={styles.priceValue}>{financialFormatting.formatCurrency(priceBreakdown.subtotal)}</Text>
            </View>

            {priceBreakdown.addOnsTotal && priceBreakdown.addOnsTotal > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Add-ons:</Text>
                <Text style={styles.priceValue}>{financialFormatting.formatCurrency(priceBreakdown.addOnsTotal)}</Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal:</Text>
              <Text style={styles.priceValue}>
                {financialFormatting.formatCurrency(priceBreakdown.subtotal + (priceBreakdown.addOnsTotal || 0))}
              </Text>
            </View>

            <View style={[styles.priceRow, styles.vatRow]}>
              <Text style={styles.vatLabel}>VAT (5%):</Text>
              <Text style={styles.vatValue}>{financialFormatting.formatCurrency(priceBreakdown.vatAmount)}</Text>
            </View>

            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>{financialFormatting.formatCurrency(priceBreakdown.totalWithVat)}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Important Information:</Text>
            <Text style={styles.infoText}>• Price includes 5% VAT as per UAE regulations</Text>
            <Text style={styles.infoText}>• Additional charges may apply for late returns</Text>
            <Text style={styles.infoText}>• Fuel policy: Return with same fuel level</Text>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.termsCheckbox}
            onPress={() => {
              console.log('📋 Terms checkbox clicked! Current:', termsAccepted);
              setTermsAccepted(!termsAccepted);
              console.log('📋 Terms set to:', !termsAccepted);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <Ionicons name="checkmark" size={16} color={colors.neutral.white} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={(e) => {
                  e.stopPropagation();
                  openTermsAndConditions();
                }}
              >
                Terms & Conditions
              </Text>
              {' '}and understand that the total amount of{' '}
              <Text style={styles.termsHighlight}>
                {financialFormatting.formatCurrency(priceBreakdown.totalWithVat)}
              </Text>
              {' '}includes 5% VAT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Book Button with Gradient */}
        <TouchableOpacity
          style={[styles.bookButton, (!termsAccepted || isLoading) && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={!termsAccepted || isLoading}
        >
          <LinearGradient
            colors={termsAccepted ? gradients.primaryButton.colors : [colors.neutral.text.disabled, colors.neutral.text.disabled]}
            start={gradients.primaryButton.start}
            end={gradients.primaryButton.end}
            style={styles.bookButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.background,
    ...Platform.select({
      web: {
        height: '100%',
      },
      default: {
        flex: 1,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 700,
  },
  vehicleCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...colors.shadows.medium,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral.text.primary,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    marginBottom: 8,
  },
  vehicleDescription: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 12,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  popularMode: {
    borderColor: colors.ui.popularBadge,
  },
  modeButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.secondary,
    marginBottom: 4,
  },
  modeButtonTextActive: {
    color: colors.primary.main,
  },
  modeRate: {
    fontSize: 12,
    color: colors.neutral.text.hint,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.ui.popularBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
  savingsBadge: {
    marginTop: 4,
    backgroundColor: colors.ui.savingsBadge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 1,
    borderColor: colors.ui.inputBorder,
    borderRadius: 8,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: colors.neutral.text.primary,
  },
  paymentContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  paymentOptionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  paymentText: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
  },
  paymentTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addonItemActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '05',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  addonDescription: {
    fontSize: 12,
    color: colors.neutral.text.secondary,
    marginTop: 2,
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  notificationContainer: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 8,
    padding: 12,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notificationText: {
    fontSize: 14,
    color: colors.neutral.text.primary,
  },
  priceCard: {
    backgroundColor: colors.ui.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...colors.shadows.medium,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    flex: 0,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.ui.savingsBadge + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ui.savingsBadge,
  },
  savingsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.ui.savingsBadge,
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
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.financial.warning + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  depositLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.financial.warning,
  },
  depositValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.financial.warning,
  },
  infoBox: {
    backgroundColor: colors.financial.info + '10',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.financial.info,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.neutral.text.secondary,
    marginBottom: 4,
  },
  termsContainer: {
    marginVertical: 20,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.text.secondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  termsHighlight: {
    fontWeight: '600',
    color: colors.primary.main,
  },
  bookButton: {
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 30,
    overflow: 'hidden',
    ...colors.shadows.large,
  },
  bookButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // New Panel-Based Pricing Styles
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
    marginBottom: 16,
    marginTop: -8,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  periodPanel: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.ui.cardBackground,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    ...colors.shadows.small,
  },
  periodPanelActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
    ...colors.shadows.medium,
  },
  popularPeriod: {
    borderColor: colors.ui.popularBadge + '80',
  },
  bestValuePeriod: {
    borderColor: colors.ui.savingsBadge + '80',
  },
  bestValueBadge: {
    backgroundColor: colors.ui.savingsBadge,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 8,
  },
  periodTitleActive: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  periodRate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral.text.primary,
    marginBottom: 4,
  },
  periodRateActive: {
    color: colors.primary.main,
  },
  periodLabel: {
    fontSize: 12,
    color: colors.neutral.text.secondary,
    marginBottom: 8,
  },
  periodNote: {
    fontSize: 11,
    color: colors.neutral.text.hint,
    fontStyle: 'italic',
  },
  savingsBadgeInline: {
    marginTop: 8,
    backgroundColor: colors.ui.savingsBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsTextInline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  comparisonBox: {
    backgroundColor: colors.primary.main + '08',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text.primary,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  comparisonLabel: {
    fontSize: 14,
    color: colors.neutral.text.secondary,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text.primary,
  },
  comparisonSavings: {
    fontWeight: '600',
    color: colors.ui.savingsBadge,
  },
  comparisonSavingsText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: colors.neutral.text.secondary,
  },
});