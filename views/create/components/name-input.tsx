import { StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '@/constants/theme'

interface NameInputProps {
  value: string
  onChange: (v: string) => void
}

export function NameInput({ value, onChange }: NameInputProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="e.g. Organic Face Cream"
        placeholderTextColor={theme.colors.textDisabled}
        accessibilityLabel="Product name"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textDim,
  },
  input: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.glass.tintLow,
    borderColor: theme.glass.border,
  },
})
