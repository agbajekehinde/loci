export interface VerificationRequest {
  full_name?: string;
  typed_address: string;
  utility_bill: string;
  id_document: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

export function validateVerificationRequest(data: VerificationRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.typed_address || typeof data.typed_address !== 'string' || data.typed_address.trim().length === 0) {
    errors.push('typed_address is required and must be a non-empty string');
  }

  if (!data.utility_bill || typeof data.utility_bill !== 'string' || data.utility_bill.trim().length === 0) {
    errors.push('utility_bill is required and must be a non-empty string');
  }

  if (!data.id_document || typeof data.id_document !== 'string' || data.id_document.trim().length === 0) {
    errors.push('id_document is required and must be a non-empty string');
  }

  // Validate base64 format
  if (data.utility_bill) {
    const cleanUtilityBill = data.utility_bill.startsWith('data:') 
      ? data.utility_bill.split(',')[1] 
      : data.utility_bill;
    
    if (!isValidBase64(cleanUtilityBill)) {
      errors.push('utility_bill must be a valid base64 encoded image');
    }
  }

  if (data.id_document) {
    const cleanIdDocument = data.id_document.startsWith('data:') 
      ? data.id_document.split(',')[1] 
      : data.id_document;
    
    if (!isValidBase64(cleanIdDocument)) {
      errors.push('id_document must be a valid base64 encoded image');
    }
  }

  // Validate GPS coordinates if provided
  if (data.gps_latitude !== undefined) {
    if (typeof data.gps_latitude !== 'number' || data.gps_latitude < -90 || data.gps_latitude > 90) {
      errors.push('gps_latitude must be a valid number between -90 and 90');
    }
  }

  if (data.gps_longitude !== undefined) {
    if (typeof data.gps_longitude !== 'number' || data.gps_longitude < -180 || data.gps_longitude > 180) {
      errors.push('gps_longitude must be a valid number between -180 and 180');
    }
  }

  // Validate name if provided
  if (data.full_name !== undefined) {
    if (typeof data.full_name !== 'string' || data.full_name.trim().length === 0) {
      errors.push('full_name must be a non-empty string if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function isValidBase64(str: string): boolean {
  try {
    // Check if it's a valid base64 string
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }

    // Try to decode it
    const buffer = Buffer.from(str, 'base64');
    return buffer.length > 0;
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
} 