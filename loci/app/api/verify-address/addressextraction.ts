// app/api/verify-address/addressextraction.ts

export interface AddressMatchResult {
  score: number;
  details: {
    exactMatches: string[];
    partialMatches: string[];
    keywordMatches: string[];
    streetNumberMatch: boolean;
    streetNameMatch: boolean;
    cityMatch: boolean;
    stateMatch: boolean;
    postalCodeMatch: boolean;
  };
}

// Check if document contains address information
export function checkDocumentContainsAddress(
  documentText: string, 
  userAddress: string
): AddressMatchResult {
  const cleanDocText = documentText.toLowerCase().trim();
  const cleanUserAddress = userAddress.toLowerCase().trim();
  
  console.log(`Checking address match in document text (${cleanDocText.length} chars)`);
  
  // Parse user address components
  const addressComponents = parseAddressComponents(cleanUserAddress);
  const documentComponents = parseAddressComponents(cleanDocText);
  
  // Find matches
  const exactMatches: string[] = [];
  const partialMatches: string[] = [];
  const keywordMatches: string[] = [];
  
  // Check for exact phrase matches
  if (cleanDocText.includes(cleanUserAddress)) {
    exactMatches.push(cleanUserAddress);
  }
  
  // Check individual components
  let streetNumberMatch = false;
  let streetNameMatch = false;
  let cityMatch = false;
  let stateMatch = false;
  let postalCodeMatch = false;
  
  // Street number matching
  if (addressComponents.streetNumber && documentComponents.streetNumbers.includes(addressComponents.streetNumber)) {
    streetNumberMatch = true;
    exactMatches.push(addressComponents.streetNumber);
  }
  
  // Street name matching
  if (addressComponents.streetName) {
    const streetWords = addressComponents.streetName.split(' ');
    const matchingStreetWords = streetWords.filter(word => 
      word.length > 2 && cleanDocText.includes(word)
    );
    
    if (matchingStreetWords.length > 0) {
      streetNameMatch = matchingStreetWords.length / streetWords.length > 0.5;
      if (streetNameMatch) {
        partialMatches.push(addressComponents.streetName);
      }
    }
  }
  
  // City matching
  if (addressComponents.city) {
    const cityWords = addressComponents.city.split(' ');
    const matchingCityWords = cityWords.filter(word => 
      word.length > 2 && cleanDocText.includes(word)
    );
    
    if (matchingCityWords.length > 0) {
      cityMatch = matchingCityWords.length / cityWords.length > 0.7;
      if (cityMatch) {
        partialMatches.push(addressComponents.city);
      }
    }
  }
  
  // State matching
  if (addressComponents.state && cleanDocText.includes(addressComponents.state)) {
    stateMatch = true;
    exactMatches.push(addressComponents.state);
  }
  
  // Postal code matching
  if (addressComponents.postalCode && cleanDocText.includes(addressComponents.postalCode)) {
    postalCodeMatch = true;
    exactMatches.push(addressComponents.postalCode);
  }
  
  // Check for common address keywords
  const addressKeywords = [
    'street', 'road', 'avenue', 'drive', 'lane', 'close', 'crescent',
    'estate', 'junction', 'area', 'district', 'local government',
    'lga', 'ward', 'village', 'town', 'city', 'state'
  ];
  
  addressKeywords.forEach(keyword => {
    if (cleanDocText.includes(keyword)) {
      keywordMatches.push(keyword);
    }
  });
  
  // Calculate overall score
  let score = 0;
  
  // Exact matches are worth the most
  score += exactMatches.length * 0.3;
  
  // Component matches
  if (streetNumberMatch) score += 0.2;
  if (streetNameMatch) score += 0.25;
  if (cityMatch) score += 0.2;
  if (stateMatch) score += 0.15;
  if (postalCodeMatch) score += 0.1;
  
  // Partial matches
  score += partialMatches.length * 0.1;
  
  // Keyword matches (less important)
  score += Math.min(keywordMatches.length * 0.02, 0.1);
  
  // Normalize score to 0-1 range
  score = Math.min(score, 1);
  
  const result: AddressMatchResult = {
    score,
    details: {
      exactMatches,
      partialMatches,
      keywordMatches,
      streetNumberMatch,
      streetNameMatch,
      cityMatch,
      stateMatch,
      postalCodeMatch
    }
  };
  
  console.log(`Address match analysis complete. Score: ${score.toFixed(3)}`);
  return result;
}

// Parse address into components
function parseAddressComponents(address: string) {
  const components = {
    streetNumber: '',
    streetName: '',
    city: '',
    state: '',
    postalCode: '',
    streetNumbers: [] as string[]
  };
  
  // Extract street numbers (digits at the beginning or standalone)
  const numberMatches = address.match(/\b\d+\b/g);
  if (numberMatches) {
    components.streetNumbers = numberMatches;
    components.streetNumber = numberMatches[0]; // Take the first one as primary
  }
  
  // Extract postal codes (Nigerian format: 6 digits)
  const postalMatch = address.match(/\b\d{6}\b/);
  if (postalMatch) {
    components.postalCode = postalMatch[0];
  }
  
  // Common Nigerian states
  const nigerianStates = [
    'lagos', 'abuja', 'kano', 'kaduna', 'rivers', 'oyo', 'ogun', 'imo', 'anambra',
    'delta', 'edo', 'kwara', 'osun', 'ondo', 'abia', 'adamawa', 'akwa ibom',
    'bauchi', 'bayelsa', 'benue', 'borno', 'cross river', 'ebonyi', 'enugu',
    'gombe', 'jigawa', 'kebbi', 'kogi', 'nassarawa', 'niger', 'plateau',
    'sokoto', 'taraba', 'yobe', 'zamfara', 'fct'
  ];
  
  // Find state
  const foundState = nigerianStates.find(state => address.includes(state));
  if (foundState) {
    components.state = foundState;
  }
  
  // Common Nigerian cities
  const nigerianCities = [
    'ikeja', 'victoria island', 'lekki', 'surulere', 'yaba', 'ikoyi', 'festac',
    'abuja', 'garki', 'wuse', 'maitama', 'gwarinpa', 'kubwa', 'nyanya',
    'kano', 'kaduna', 'ibadan', 'benin', 'port harcourt', 'jos', 'ilorin',
    'ogbomoso', 'abeokuta', 'onitsha', 'warri', 'calabar', 'uyo', 'aba',
    'owerri', 'enugu', 'minna', 'bauchi', 'gombe', 'sokoto', 'maiduguri'
  ];
  
  // Find city
  const foundCity = nigerianCities.find(city => address.includes(city));
  if (foundCity) {
    components.city = foundCity;
  }
  
  // Extract street name (everything between number and city/state)
  let streetName = address;
  if (components.streetNumber) {
    streetName = streetName.replace(components.streetNumber, '').trim();
  }
  if (components.city) {
    streetName = streetName.replace(components.city, '').trim();
  }
  if (components.state) {
    streetName = streetName.replace(components.state, '').trim();
  }
  if (components.postalCode) {
    streetName = streetName.replace(components.postalCode, '').trim();
  }
  
  // Clean up street name
  streetName = streetName.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  if (streetName.length > 3) {
    components.streetName = streetName;
  }
  
  return components;
}