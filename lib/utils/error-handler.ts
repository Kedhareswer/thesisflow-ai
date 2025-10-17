/**
 * Comprehensive Error Handler for Summarizer Feature
 * Provides contextual error processing with actionable guidance
 */

export interface UserFriendlyError {
  title: string
  message: string
  actions: string[]
  fallbackOptions?: string[]
  helpLinks?: string[]
  errorType: ErrorType
  technicalDetails?: string
}

export type ErrorType = 
  | 'api_response_mismatch'
  | 'file_processing'
  | 'url_extraction'
  | 'ai_generation'
  | 'network'
  | 'authentication'
  | 'validation'
  | 'rate_limit'
  | 'provider_failure'
  | 'content_too_large'
  | 'unsupported_format'
  | 'generic'

export interface ErrorContext {
  operation: string
  provider?: string
  fileType?: string
  url?: string
  contentLength?: number
  userId?: string
  originalError?: Error | string
}

export class ErrorHandler {
  /**
   * Check if error is from Chrome extension and should be suppressed
   */
  static isChromeExtensionError(error: unknown): boolean {
    const errorMessage = this.extractErrorMessage(error)
    const errorLower = errorMessage.toLowerCase()
    
    // Common Chrome extension error patterns
    return (
      errorLower.includes('chrome-extension://') ||
      errorLower.includes('contentscript.bundle.js') ||
      errorLower.includes('web_accessible_resources') ||
      errorLower.includes('extension context invalidated') ||
      errorLower.includes('could not establish connection') ||
      (errorLower.includes('net::err_failed') && errorLower.includes('chrome-extension'))
    )
  }

  /**
   * Initialize global error suppression for Chrome extensions
   */
  static initializeChromeExtensionErrorSuppression() {
    if (typeof window === 'undefined') return

    // Suppress Chrome extension console errors
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const errorString = args.join(' ')
      if (this.isChromeExtensionError(errorString)) {
        // Silently ignore Chrome extension errors
        return
      }
      originalConsoleError.apply(console, args)
    }

    // Suppress Chrome extension window errors
    window.addEventListener('error', (event) => {
      if (this.isChromeExtensionError(event.error || event.message)) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    })

    // Suppress Chrome extension unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChromeExtensionError(event.reason)) {
        event.preventDefault()
        return false
      }
    })
  }

  /**
   * Process any error and return user-friendly error information
   */
  static processError(error: unknown, context: ErrorContext): UserFriendlyError {
    const errorMessage = this.extractErrorMessage(error)
    const errorType = this.determineErrorType(errorMessage, context)
    
    console.error(`ErrorHandler: Processing ${errorType} error in ${context.operation}:`, {
      error: errorMessage,
      context
    })

    switch (errorType) {
      case 'api_response_mismatch':
        return this.handleAPIResponseMismatch(errorMessage, context)
      
      case 'file_processing':
        return this.handleFileProcessingError(errorMessage, context)
      
      case 'url_extraction':
        return this.handleURLExtractionError(errorMessage, context)
      
      case 'ai_generation':
        return this.handleAIGenerationError(errorMessage, context)
      
      case 'network':
        return this.handleNetworkError(errorMessage, context)
      
      case 'authentication':
        return this.handleAuthenticationError(errorMessage, context)
      
      case 'validation':
        return this.handleValidationError(errorMessage, context)
      
      case 'rate_limit':
        return this.handleRateLimitError(errorMessage, context)
      
      case 'provider_failure':
        return this.handleProviderFailureError(errorMessage, context)
      
      case 'content_too_large':
        return this.handleContentTooLargeError(errorMessage, context)
      
      case 'unsupported_format':
        return this.handleUnsupportedFormatError(errorMessage, context)
      
      default:
        return this.handleGenericError(errorMessage, context)
    }
  }

  /**
   * Handle API response field mismatch errors
   */
  private static handleAPIResponseMismatch(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "API Response Error",
      message: "The AI service returned an unexpected response format. This is usually a temporary issue.",
      actions: [
        "Try again in a few moments",
        "Switch to a different AI provider in Settings",
        "Check if your API keys are still valid"
      ],
      fallbackOptions: [
        "Copy your content and try pasting it in smaller chunks",
        "Use a different summarization style or length setting"
      ],
      helpLinks: [
        "/settings - Check your AI provider settings"
      ],
      errorType: 'api_response_mismatch',
      technicalDetails: error
    }
  }

  /**
   * Handle file processing errors
   */
  private static handleFileProcessingError(error: string, context: ErrorContext): UserFriendlyError {
    const fileType = context.fileType || 'unknown'
    const isUnsupportedFormat = error.toLowerCase().includes('unsupported') || 
                               error.toLowerCase().includes('format')
    
    if (isUnsupportedFormat) {
      return {
        title: "Unsupported File Format",
        message: `The file format "${fileType}" is not supported or the file may be corrupted.`,
        actions: [
          "Try converting the file to PDF, DOCX, or TXT format",
          "Ensure the file is not password-protected or corrupted",
          "Try uploading a different file"
        ],
        fallbackOptions: [
          "Copy the text content manually and paste it directly",
          "Use QuantumPDF for advanced PDF processing",
          "Convert the file using online conversion tools"
        ],
        helpLinks: [
          "https://quantumn-pdf-chatapp.netlify.app/ - Advanced PDF processing"
        ],
        errorType: 'file_processing',
        technicalDetails: error
      }
    }

    return {
      title: "File Processing Failed",
      message: "We couldn't extract text from your file. This might be due to complex formatting or file corruption.",
      actions: [
        "Try uploading the file again",
        "Ensure the file is not corrupted or password-protected",
        "Try a different file format (PDF, DOCX, TXT)"
      ],
      fallbackOptions: [
        "Copy the text content manually and paste it directly",
        "Use QuantumPDF for enhanced PDF processing",
        "Try breaking large files into smaller sections"
      ],
      helpLinks: [
        "https://quantumn-pdf-chatapp.netlify.app/ - Advanced PDF processing"
      ],
      errorType: 'file_processing',
      technicalDetails: error
    }
  }

  /**
   * Handle URL content extraction errors
   */
  private static handleURLExtractionError(error: string, context: ErrorContext): UserFriendlyError {
    const url = context.url || 'the provided URL'
    
    if (error.includes('403') || error.includes('forbidden')) {
      return {
        title: "Access Blocked",
        message: `The website at ${url} doesn't allow automated content extraction.`,
        actions: [
          "Visit the website directly and copy the content manually",
          "Try a different URL from the same website",
          "Check if the website requires login or subscription"
        ],
        fallbackOptions: [
          "Use the website's RSS feed if available",
          "Try accessing an archived version of the page",
          "Contact the website owner for permission"
        ],
        errorType: 'url_extraction',
        technicalDetails: error
      }
    }

    if (error.includes('404') || error.includes('not found')) {
      return {
        title: "Page Not Found",
        message: `The page at ${url} could not be found.`,
        actions: [
          "Check if the URL is correct and complete",
          "Try removing any tracking parameters from the URL",
          "Search for the content on the website directly"
        ],
        fallbackOptions: [
          "Try an archived version using web.archive.org",
          "Search for similar content on the same website"
        ],
        errorType: 'url_extraction',
        technicalDetails: error
      }
    }

    if (error.includes('timeout')) {
      return {
        title: "Connection Timeout",
        message: `The website took too long to respond.`,
        actions: [
          "Try again in a few moments",
          "Check your internet connection",
          "Try a different URL from the same website"
        ],
        fallbackOptions: [
          "Copy the content manually from your browser",
          "Try accessing the page during off-peak hours"
        ],
        errorType: 'url_extraction',
        technicalDetails: error
      }
    }

    return {
      title: "URL Content Extraction Failed",
      message: `We couldn't extract content from ${url}. The website might be blocking automated access or have dynamic content.`,
      actions: [
        "Try visiting the URL directly and copying the content",
        "Check if the URL is accessible in your browser",
        "Try a different page from the same website"
      ],
      fallbackOptions: [
        "Use the website's RSS feed if available",
        "Try an archived version using web.archive.org",
        "Contact the website for API access"
      ],
      errorType: 'url_extraction',
      technicalDetails: error
    }
  }

  /**
   * Handle AI generation errors
   */
  private static handleAIGenerationError(error: string, context: ErrorContext): UserFriendlyError {
    const provider = context.provider || 'AI provider'
    
    if (error.toLowerCase().includes('api key') || error.toLowerCase().includes('unauthorized')) {
      return {
        title: "API Key Issue",
        message: `There's a problem with your ${provider} API key.`,
        actions: [
          "Check your API key in Settings",
          "Verify the API key is still valid and active",
          "Try regenerating your API key from the provider's dashboard"
        ],
        fallbackOptions: [
          "Switch to a different AI provider",
          "Use a different API key if you have multiple"
        ],
        helpLinks: [
          "/settings - Manage your API keys"
        ],
        errorType: 'ai_generation',
        technicalDetails: error
      }
    }

    if (error.toLowerCase().includes('quota') || error.toLowerCase().includes('limit')) {
      return {
        title: "Usage Limit Reached",
        message: `You've reached the usage limit for ${provider}.`,
        actions: [
          "Wait for your quota to reset (usually monthly)",
          "Upgrade your plan with the AI provider",
          "Switch to a different AI provider"
        ],
        fallbackOptions: [
          "Try summarizing smaller chunks of content",
          "Use a different AI provider with available quota"
        ],
        helpLinks: [
          "/settings - Switch AI providers"
        ],
        errorType: 'ai_generation',
        technicalDetails: error
      }
    }

    return {
      title: "AI Generation Failed",
      message: `The ${provider} service encountered an error while generating your summary.`,
      actions: [
        "Try again in a few moments",
        "Switch to a different AI provider",
        "Try with a shorter piece of content"
      ],
      fallbackOptions: [
        "Break your content into smaller chunks",
        "Try a different summarization style or length"
      ],
      helpLinks: [
        "/settings - Switch AI providers"
      ],
      errorType: 'ai_generation',
      technicalDetails: error
    }
  }

  /**
   * Handle network-related errors
   */
  private static handleNetworkError(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "Connection Problem",
      message: "There was a network issue while processing your request.",
      actions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Refresh the page and try again"
      ],
      fallbackOptions: [
        "Try with a smaller piece of content",
        "Save your content and try again later"
      ],
      errorType: 'network',
      technicalDetails: error
    }
  }

  /**
   * Handle authentication errors
   */
  private static handleAuthenticationError(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "Authentication Required",
      message: "You need to be logged in to use the summarizer.",
      actions: [
        "Log in to your account",
        "Refresh the page after logging in",
        "Check if your session has expired"
      ],
      fallbackOptions: [
        "Create a new account if you don't have one",
        "Try logging out and back in"
      ],
      helpLinks: [
        "/login - Sign in to your account",
        "/signup - Create a new account"
      ],
      errorType: 'authentication',
      technicalDetails: error
    }
  }

  /**
   * Handle validation errors
   */
  private static handleValidationError(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "Invalid Input",
      message: "The content you provided doesn't meet the requirements for summarization.",
      actions: [
        "Check that your content is not empty",
        "Ensure the content is in a supported language",
        "Try with different content"
      ],
      fallbackOptions: [
        "Break large content into smaller pieces",
        "Remove any special characters or formatting"
      ],
      errorType: 'validation',
      technicalDetails: error
    }
  }

  /**
   * Handle rate limiting errors
   */
  private static handleRateLimitError(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "Too Many Requests",
      message: "You're making requests too quickly. Please slow down.",
      actions: [
        "Wait a few minutes before trying again",
        "Reduce the frequency of your requests",
        "Try processing content in smaller batches"
      ],
      fallbackOptions: [
        "Switch to a different AI provider",
        "Upgrade to a higher tier plan"
      ],
      errorType: 'rate_limit',
      technicalDetails: error
    }
  }

  /**
   * Handle provider failure errors
   */
  private static handleProviderFailureError(error: string, context: ErrorContext): UserFriendlyError {
    const provider = context.provider || 'AI provider'
    
    return {
      title: "Service Unavailable",
      message: `The ${provider} service is currently unavailable.`,
      actions: [
        "Try again in a few minutes",
        "Switch to a different AI provider",
        "Check the provider's status page"
      ],
      fallbackOptions: [
        "Use a different AI provider",
        "Try again during off-peak hours"
      ],
      helpLinks: [
        "/settings - Switch AI providers"
      ],
      errorType: 'provider_failure',
      technicalDetails: error
    }
  }

  /**
   * Handle content too large errors
   */
  private static handleContentTooLargeError(error: string, context: ErrorContext): UserFriendlyError {
    const contentLength = context.contentLength || 0
    
    return {
      title: "Content Too Large",
      message: `Your content (${Math.round(contentLength / 1000)}k characters) exceeds the maximum size limit.`,
      actions: [
        "Break your content into smaller sections",
        "Try summarizing individual chapters or sections",
        "Remove unnecessary formatting or metadata"
      ],
      fallbackOptions: [
        "Use QuantumPDF for large document processing",
        "Try a different AI provider with higher limits",
        "Focus on the most important sections first"
      ],
      helpLinks: [
        "https://quantumn-pdf-chatapp.netlify.app/ - Advanced PDF processing"
      ],
      errorType: 'content_too_large',
      technicalDetails: error
    }
  }

  /**
   * Handle unsupported format errors
   */
  private static handleUnsupportedFormatError(error: string, context: ErrorContext): UserFriendlyError {
    const fileType = context.fileType || 'file format'
    
    return {
      title: "Unsupported Format",
      message: `The ${fileType} format is not supported for automatic processing.`,
      actions: [
        "Convert to PDF, DOCX, or TXT format",
        "Copy the text content manually",
        "Try a different file"
      ],
      fallbackOptions: [
        "Use online conversion tools",
        "Export from the original application in a supported format",
        "Use QuantumPDF for advanced PDF processing"
      ],
      helpLinks: [
        "https://quantumn-pdf-chatapp.netlify.app/ - Advanced PDF processing"
      ],
      errorType: 'unsupported_format',
      technicalDetails: error
    }
  }

  /**
   * Handle generic/unknown errors
   */
  private static handleGenericError(error: string, context: ErrorContext): UserFriendlyError {
    return {
      title: "Something Went Wrong",
      message: "An unexpected error occurred while processing your request.",
      actions: [
        "Try again in a few moments",
        "Refresh the page and try again",
        "Try with different content or settings"
      ],
      fallbackOptions: [
        "Contact support if the problem persists",
        "Try using a different browser",
        "Clear your browser cache and cookies"
      ],
      errorType: 'generic',
      technicalDetails: error
    }
  }

  /**
   * Extract error message from various error types
   */
  private static extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error
    }
    
    if (error instanceof Error) {
      return error.message
    }
    
    if (error && typeof error === 'object') {
      // Handle API error responses
      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
      
      if ('error' in error && typeof error.error === 'string') {
        return error.error
      }
      
      // Handle response objects
      if ('response' in error && error.response && typeof error.response === 'object') {
        const response = error.response as any
        if (response.data && response.data.error) {
          return response.data.error
        }
        if (response.statusText) {
          return response.statusText
        }
      }
    }
    
    return 'Unknown error occurred'
  }

  /**
   * Determine error type based on error message and context
   */
  private static determineErrorType(error: string, context: ErrorContext): ErrorType {
    const errorLower = error.toLowerCase()
    
    // Check for specific error patterns
    if (errorLower.includes('response') && errorLower.includes('content')) {
      return 'api_response_mismatch'
    }
    
    if (context.operation.includes('file') || errorLower.includes('file') || errorLower.includes('pdf')) {
      return 'file_processing'
    }
    
    if (context.operation.includes('url') || context.url || errorLower.includes('fetch')) {
      return 'url_extraction'
    }
    
    if (errorLower.includes('api key') || errorLower.includes('unauthorized') || errorLower.includes('401')) {
      return 'authentication'
    }
    
    if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      return 'rate_limit'
    }
    
    if (errorLower.includes('quota') || errorLower.includes('limit') || errorLower.includes('usage')) {
      return 'ai_generation'
    }
    
    if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('connection')) {
      return 'network'
    }
    
    if (errorLower.includes('too large') || errorLower.includes('size') || (context.contentLength && context.contentLength > 50000)) {
      return 'content_too_large'
    }
    
    if (errorLower.includes('unsupported') || errorLower.includes('format')) {
      return 'unsupported_format'
    }
    
    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return 'validation'
    }
    
    if (context.provider && (errorLower.includes('provider') || errorLower.includes('service'))) {
      return 'provider_failure'
    }
    
    if (context.operation.includes('ai') || context.operation.includes('generate')) {
      return 'ai_generation'
    }
    
    return 'generic'
  }

  /**
   * Format error for API response
   */
  static formatErrorResponse(error: UserFriendlyError): {
    error: string
    errorType: string
    userMessage: string
    actions: string[]
    fallbackOptions?: string[]
    helpLinks?: string[]
    technicalDetails?: string
  } {
    return {
      error: error.title,
      errorType: error.errorType,
      userMessage: error.message,
      actions: error.actions,
      fallbackOptions: error.fallbackOptions,
      helpLinks: error.helpLinks,
      technicalDetails: error.technicalDetails
    }
  }

  /**
   * Format error for UI display
   */
  static formatErrorForUI(error: UserFriendlyError): {
    title: string
    message: string
    actionableGuidance: string
    showTechnicalDetails: boolean
    technicalDetails?: string
  } {
    let actionableGuidance = ""
    
    if (error.actions.length > 0) {
      actionableGuidance += "**What you can do:**\n"
      actionableGuidance += error.actions.map(action => `• ${action}`).join("\n")
    }
    
    if (error.fallbackOptions && error.fallbackOptions.length > 0) {
      if (actionableGuidance) actionableGuidance += "\n\n"
      actionableGuidance += "**Alternative options:**\n"
      actionableGuidance += error.fallbackOptions.map(option => `• ${option}`).join("\n")
    }
    
    if (error.helpLinks && error.helpLinks.length > 0) {
      if (actionableGuidance) actionableGuidance += "\n\n"
      actionableGuidance += "**Helpful links:**\n"
      actionableGuidance += error.helpLinks.map(link => `• ${link}`).join("\n")
    }
    
    return {
      title: error.title,
      message: error.message,
      actionableGuidance,
      showTechnicalDetails: !!error.technicalDetails,
      technicalDetails: error.technicalDetails
    }
  }
}