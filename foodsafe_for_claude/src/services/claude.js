// FoodSafe Backend Service Wrapper
// This replaces the old direct Groq calls to ensure all scans are 
// processed by the FastAPI backend and saved to your history.

import { 
  scanFoodAPI, 
  scanCombinationAPI, 
  analyzeSymptomsAPI, 
  scanImageAPI 
} from './api'

/**
 * Scans a single food item via text.
 * Triggers seasonal and personalized risk scoring on the backend.
 */
export async function scanFood({ foodName, memberProfile, lang = 'en', city }) {
  return scanFoodAPI({
    food_name: foodName,
    lang: lang,
    member_profile: memberProfile,
    city: city
  })
}

/**
 * Analyzes risks for multiple foods consumed together.
 */
export async function scanCombination({ foods, memberProfile, lang = 'en' }) {
  return scanCombinationAPI({
    foods: foods,
    lang: lang,
    member_profile: memberProfile
  })
}

/**
 * Analyzes health symptoms against recently consumed foods.
 */
export async function analyzeSymptoms({ symptoms, recentFoods, lang = 'en' }) {
  return analyzeSymptomsAPI({
    symptoms: symptoms,
    recent_foods: recentFoods,
    lang: lang
  })
}

/**
 * Handles image-based scanning.
 * Converts base64 image data to a File object for YOLOv8 processing on the backend.
 */
export async function analyzeLabel({ imageBase64, lang = 'en' }) {
  try {
    // 1. Convert the base64 string (from the camera) into a Blob
    const res = await fetch(imageBase64)
    const blob = await res.blob()
    
    // 2. Prepare FormData for file upload
    const formData = new FormData()
    formData.append('file', blob, 'scan.jpg')
    formData.append('lang', lang)

    // 3. Send to FastAPI image endpoint (/api/scan/image)
    return scanImageAPI(formData)
  } catch (error) {
    console.error("Image analysis failed:", error)
    throw error
  }
}