/**
 * @name DEFAULT_SENSITIVE_FIELDS
 * @description Default sensitive fields that should be filtered from logs
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'creditCard',
  'credit_card',
  'ssn',
  'social_security_number',
  'api_key',
  'apiKey',
  'access_token',
  'refresh_token',
  'private_key',
  'privateKey',
  'certificate',
  'key',
  'passphrase',
  'pin',
  'cvv',
  'cvc',
  'security_code',
]

/**
 * @name isSensitiveField
 * @description Helper function to check if a field is sensitive
 * @param fieldName
 * @returns
 */
export function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase()
  return DEFAULT_SENSITIVE_FIELDS.some((sensitiveField) =>
    lowerFieldName.includes(sensitiveField.toLowerCase())
  )
}

/**
 * @name filterSensitiveData
 * @description Helper function to filter object removing sensitive fields
 * @param data
 * @param customSensitiveFields
 * @returns
 */
export function filterSensitiveData(
  data: any,
  customSensitiveFields: string[] = []
): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const allSensitiveFields = [
    ...DEFAULT_SENSITIVE_FIELDS,
    ...customSensitiveFields,
  ]

  if (Array.isArray(data)) {
    return data.map((item) => filterSensitiveData(item, customSensitiveFields))
  }

  const filtered: any = {}
  Object.keys(data).forEach((key) => {
    if (allSensitiveFields.includes(key.toLowerCase())) {
      filtered[key] = '[REDACTED]'
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      filtered[key] = filterSensitiveData(data[key], customSensitiveFields)
    } else {
      filtered[key] = data[key]
    }
  })

  return filtered
}

/**
 * @name maskSensitiveString
 * @description Helper function to mask sensitive data in strings
 * @param str
 * @param sensitiveFields
 * @returns
 */
export function maskSensitiveString(
  str: string,
  sensitiveFields: string[] = DEFAULT_SENSITIVE_FIELDS
): string {
  let maskedStr = str

  sensitiveFields.forEach((field) => {
    const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi')
    maskedStr = maskedStr.replace(regex, `"${field}":"[REDACTED]"`)
  })

  return maskedStr
}
