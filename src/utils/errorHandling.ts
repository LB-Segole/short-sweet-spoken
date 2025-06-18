
import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export const handleApiError = (error: any, defaultMessage: string = 'An error occurred'): string => {
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  }
  
  console.error('API Error:', error);
  return errorMessage;
};

export const showErrorToast = (error: any, defaultMessage: string = 'An error occurred') => {
  const errorMessage = handleApiError(error, defaultMessage);
  toast.error(errorMessage);
  return errorMessage;
};

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10;
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length >= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  } else if (cleaned.length >= 3) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return cleaned;
};

export const normalizePhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present
  let normalized = cleaned;
  if (!normalized.startsWith('1') && normalized.length === 10) {
    normalized = '1' + normalized;
  }
  
  // Add + prefix if not present
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};
