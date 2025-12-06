import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const steps = [
  { number: 1, label: 'Vehicle', shortLabel: 'Vehicle', icon: 'car' as const },
  { number: 2, label: 'Eligibility', shortLabel: 'KYC', icon: 'shield-checkmark' as const },
  { number: 3, label: 'Payment', shortLabel: 'Pay', icon: 'card' as const },
  { number: 4, label: 'Confirm', shortLabel: 'Done', icon: 'checkmark-circle' as const },
];

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Container */}
              <View style={styles.stepContainer}>
                {/* Step Circle with Gradient for current/completed */}
                {isCompleted || isCurrent ? (
                  <LinearGradient
                    colors={isCompleted ? [colors.financial.positive, '#27ae60'] : gradients.primaryButton.colors}
                    start={gradients.primaryButton.start}
                    end={gradients.primaryButton.end}
                    style={[
                      styles.stepCircle,
                      isCurrent && styles.stepCircleCurrent,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={28} color={colors.neutral.white} />
                    ) : (
                      <View style={styles.currentIconContainer}>
                        <Ionicons name={step.icon} size={24} color={colors.neutral.white} />
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.stepCircleUpcoming}>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                )}

                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                  ]}
                >
                  {step.shortLabel}
                </Text>
              </View>

              {/* Connector Line (except after last step) */}
              {index < steps.length - 1 && (
                <View style={styles.connectorContainer}>
                  <View style={styles.connectorBackground} />
                  {step.number < currentStep && (
                    <LinearGradient
                      colors={[colors.financial.positive, '#27ae60']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.connectorCompleted}
                    />
                  )}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Progress Percentage Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={gradients.primaryButton.colors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressBarFill, { width: `${((currentStep - 1) / 3) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep} of 4
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.neutral.white,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.divider,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        ...colors.shadows.medium,
      },
    }),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  stepCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(44, 95, 45, 0.25)',
      },
      default: {
        ...colors.shadows.medium,
      },
    }),
  },
  stepCircleCurrent: {
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(44, 95, 45, 0.35)',
      },
      default: {
        ...colors.shadows.large,
      },
    }),
  },
  stepCircleUpcoming: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: colors.neutral.background,
    borderWidth: 2,
    borderColor: colors.neutral.border,
  },
  currentIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.text.disabled,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stepLabelCompleted: {
    color: colors.financial.positive,
    fontWeight: '700',
  },
  stepLabelCurrent: {
    color: colors.primary.main,
    fontWeight: '800',
    fontSize: 12,
  },
  stepLabelUpcoming: {
    color: colors.neutral.text.disabled,
    fontWeight: '500',
  },
  connectorContainer: {
    flex: 1,
    height: 3,
    marginHorizontal: 6,
    marginBottom: 36,
    position: 'relative',
    maxWidth: 60,
  },
  connectorBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.neutral.border,
    borderRadius: 2,
  },
  connectorCompleted: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: colors.neutral.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
