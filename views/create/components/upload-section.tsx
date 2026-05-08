import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '@/constants/theme'
import {
  CameraUploadIcon,
  EditPencilIcon,
  GalleryUploadIcon,
} from '../icons'

interface UploadSectionProps {
  localImageUri: string | null
  productName: string
  isAnalyzing: boolean
  isPicking: boolean
  onProductNameChange: (v: string) => void
  onPickGallery: () => void
  onTakePhoto: () => void
}

/**
 * Upload section.
 * Two states:
 *   1. No image — Gallery + Camera dashed buttons
 *   2. Image picked — preview with analyzing overlay + name input overlay
 */
export function UploadSection({
  localImageUri,
  productName,
  isAnalyzing,
  isPicking,
  onProductNameChange,
  onPickGallery,
  onTakePhoto,
}: UploadSectionProps) {
  if (localImageUri) {
    return (
      <View style={styles.section}>
        <View style={styles.preview}>
          <TouchableOpacity onPress={onPickGallery} activeOpacity={0.9} style={{ flex: 1 }}>
            <Image
              source={{ uri: localImageUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>

          {isAnalyzing && (
            <View style={styles.analyzeOverlay}>
              <ActivityIndicator color={theme.colors.text} />
              <Text style={styles.analyzeText}>Analyzing...</Text>
            </View>
          )}

          <View style={styles.nameOverlay} pointerEvents="box-none">
            <LinearGradient
              colors={['transparent', 'rgba(25,49,83,0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                value={productName}
                onChangeText={onProductNameChange}
                placeholder="Product name"
                placeholderTextColor={theme.colors.textDisabled}
                accessibilityLabel="Product name"
              />
              <EditPencilIcon />
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onPickGallery}
          disabled={isPicking}
          activeOpacity={0.7}
          accessibilityLabel="Pick from gallery"
          accessibilityRole="button"
        >
          <GalleryUploadIcon />
          <Text style={styles.uploadLabel}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onTakePhoto}
          disabled={isPicking}
          activeOpacity={0.7}
          accessibilityLabel="Take photo"
          accessibilityRole="button"
        >
          <CameraUploadIcon />
          <Text style={styles.uploadLabel}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.xl },
  uploadRow: { flexDirection: 'row', gap: theme.spacing.md },
  uploadButton: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.glass.border,
    backgroundColor: theme.glass.tintLow,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.glass.border,
  },
  previewImage: { width: '100%', height: '100%' },
  analyzeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeText: {
    color: theme.colors.text,
    fontSize: 14,
    marginTop: theme.spacing.sm,
    fontWeight: '500',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.glass.tint,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.border,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    padding: 0,
  },
})
