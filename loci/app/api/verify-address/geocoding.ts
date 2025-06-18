// app/api/verify-address/geocoding.ts

export interface ReverseGeocodeResult {
  success: boolean;
  address?: string;
  error?: string;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface DistanceResult {
  success: boolean;
  distance?: {
    distanceKm: number;
    similarity: number;
  };
  error?: string;
}

// Reverse geocode coordinates to address using OpenStreetMap Nominatim
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  try {
    console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    
    // Use OpenStreetMap Nominatim API (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LandVerify-AddressVerification/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: data.error
      };
    }
    
    // Extract address components
    const address = data.address || {};
    const components = {
      street: address.road || address.street || '',
      city: address.city || address.town || address.village || address.suburb || '',
      state: address.state || address.region || '',
      country: address.country || '',
      postalCode: address.postcode || ''
    };
    
    // Build display address
    const displayAddress = data.display_name || buildDisplayAddress(components);
    
    console.log(`Reverse geocoding successful: ${displayAddress}`);
    
    return {
      success: true,
      address: displayAddress,
      components
    };
    
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Calculate distance between two addresses
export async function calculateAddressDistance(address1: string, address2: string): Promise<DistanceResult> {
  try {
    console.log(`Calculating distance between addresses: "${address1}" and "${address2}"`);
    
    // Geocode both addresses
    const coords1 = await geocodeAddress(address1);
    const coords2 = await geocodeAddress(address2);
    
    if (!coords1.success || !coords2.success) {
      return {
        success: false,
        error: 'Failed to geocode one or both addresses'
      };
    }
    
    // Calculate Haversine distance
    const distanceKm = calculateHaversineDistance(
      coords1.latitude!,
      coords1.longitude!,
      coords2.latitude!,
      coords2.longitude!
    );
    
    // Calculate similarity score based on distance
    // Closer addresses get higher similarity scores
    const similarity = calculateDistanceSimilarity(distanceKm);
    
    console.log(`Distance calculation successful: ${distanceKm.toFixed(2)}km, similarity: ${similarity.toFixed(3)}`);
    
    return {
      success: true,
      distance: {
        distanceKm,
        similarity
      }
    };
    
  } catch (error) {
    console.error('Error calculating address distance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Geocode address to coordinates
async function geocodeAddress(address: string): Promise<{
  success: boolean;
  latitude?: number;
  longitude?: number;
  error?: string;
}> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LandVerify-AddressVerification/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Address not found'
      };
    }
    
    const result = data[0];
    
    return {
      success: true,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Calculate Haversine distance between two points
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate similarity score based on distance
function calculateDistanceSimilarity(distanceKm: number): number {
  // Distance-based similarity scoring
  // 0km = 1.0 similarity
  // 1km = 0.8 similarity
  // 5km = 0.5 similarity
  // 10km+ = 0.1 similarity
  
  if (distanceKm <= 0.1) return 1.0;
  if (distanceKm <= 0.5) return 0.9;
  if (distanceKm <= 1.0) return 0.8;
  if (distanceKm <= 2.0) return 0.7;
  if (distanceKm <= 5.0) return 0.5;
  if (distanceKm <= 10.0) return 0.3;
  return 0.1;
}

// Calculate address similarity using text comparison
export function calculateAddressSimilarity(address1: string, address2: string): number {
  const clean1 = address1.toLowerCase().trim();
  const clean2 = address2.toLowerCase().trim();
  
  // Exact match
  if (clean1 === clean2) return 1.0;
  
  // Calculate Levenshtein distance
  const maxLength = Math.max(clean1.length, clean2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(clean1, clean2);
  const similarity = 1 - (distance / maxLength);
  
  // Also check for word overlap
  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);
  
  const commonWords = words1.filter(word => 
    word.length > 2 && words2.includes(word)
  );
  
  const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
  
  // Combine text similarity and word similarity
  return (similarity * 0.6) + (wordSimilarity * 0.4);
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Build display address from components
function buildDisplayAddress(components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}): string {
  const parts = [];
  
  if (components.street) parts.push(components.street);
  if (components.city) parts.push(components.city);
  if (components.state) parts.push(components.state);
  if (components.country) parts.push(components.country);
  
  return parts.join(', ');
}