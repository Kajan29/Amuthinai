import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

export default function ImpactScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Impact</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>COMMUNITY RELIEF EFFORTS</Text>
          <Text style={styles.heroTitle}>Together Reducing Food Waste & Hunger</Text>
          <Text style={styles.heroSubtitle}>
            Every shared meal connects generous donors, dedicated volunteers, and families in need across Northern Province.
          </Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          <Card style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FCECEF' }]}>
              <Ionicons name="restaurant" size={22} color="#7A1D34" />
            </View>
            <Text style={styles.metricValue}>12,450+</Text>
            <Text style={styles.metricLabel}>Meals Delivered</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#E5F6EE' }]}>
              <Ionicons name="leaf" size={22} color="#0F7B4F" />
            </View>
            <Text style={styles.metricValue}>5,200 kg</Text>
            <Text style={styles.metricLabel}>CO₂ Emissions Saved</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF4E8' }]}>
              <Ionicons name="people" size={22} color="#C97A24" />
            </View>
            <Text style={styles.metricValue}>850+</Text>
            <Text style={styles.metricLabel}>Families Supported</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="location" size={22} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>12 Hubs</Text>
            <Text style={styles.metricLabel}>Across Jaffna Region</Text>
          </Card>
        </View>

        {/* Sustainability note */}
        <Card style={styles.noteCard}>
          <Ionicons name="heart-circle-outline" size={28} color="#0F7B4F" />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Direct Food Dignity</Text>
            <Text style={styles.noteText}>
              Food packages are freshly prepared, verified for quality, and distributed promptly to ensure freshness and safety.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFBF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: '#1A1A1A',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 90,
  },
  heroCard: {
    backgroundColor: '#3B121E',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    ...typography.caption,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EAE1',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    ...typography.h3,
    color: '#1A1A1A',
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  noteCard: {
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#E6F7ED',
    borderWidth: 1,
    borderColor: '#C3ECD6',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    ...typography.bodyStrong,
    color: '#0F7B4F',
    marginBottom: 4,
  },
  noteText: {
    ...typography.caption,
    color: '#166534',
    lineHeight: 18,
  },
});
