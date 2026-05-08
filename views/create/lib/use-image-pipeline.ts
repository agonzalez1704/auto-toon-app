/**
 * Image pickup + upload + analyze pipeline.
 * Encapsulates ImagePicker permissions + upload + AI analysis side effects.
 */
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { useCallback, useState } from 'react'
import { analyzeProduct } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { useProductEnhancerStore } from '@/stores/use-product-enhancer-store'

export function useImagePipeline() {
  const [isPicking, setIsPicking] = useState(false)
  const store = useProductEnhancerStore()

  const handleResult = useCallback(
    async (uri: string) => {
      store.setLocalImageUri(uri)
      store.setUploadedImageUrl(null)
      store.setAnalysisState(true, null)
      try {
        const publicUrl = await uploadImage(uri)
        store.setUploadedImageUrl(publicUrl)
        const analysis = await analyzeProduct(publicUrl)
        store.applyAnalysisSuggestions(analysis)
      } catch (err) {
        console.error('Upload/analysis failed:', err)
      } finally {
        store.setAnalysisState(false)
      }
    },
    [store]
  )

  const pickFromGallery = useCallback(async () => {
    setIsPicking(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      })
      if (!result.canceled && result.assets[0]) {
        await handleResult(result.assets[0].uri)
      }
    } finally {
      setIsPicking(false)
    }
  }, [handleResult])

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.')
      return
    }
    setIsPicking(true)
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      })
      if (!result.canceled && result.assets[0]) {
        await handleResult(result.assets[0].uri)
      }
    } finally {
      setIsPicking(false)
    }
  }, [handleResult])

  return { isPicking, pickFromGallery, takePhoto }
}
