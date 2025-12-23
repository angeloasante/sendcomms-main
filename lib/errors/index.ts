/**
 * Error Handling Module
 * 
 * Central exports for error handling, classification, and escalation
 */

// Error handler and error classes
export {
  handleProviderError,
  handleSystemError,
  ProviderError,
  CustomerError,
  SystemError,
  CustomerErrors,
  isCustomerError,
  isProviderError,
  isSystemError,
  type ErrorContext,
  type ErrorSeverity,
  type ServiceType,
  type ProviderType
} from './handler';

// Provider-specific error mappers
export {
  mapDataMartError,
  mapReloadlyError,
  mapTwilioError,
  mapTermiiError,
  mapHubtelError,
  mapResendError,
  mapGenericProviderError
} from './providers';
