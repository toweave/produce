export function isApiKeyMissing(error) {
  if (!error) return false
  const msg = typeof error === 'string' ? error : error.message || ''
  return msg.includes('API key is not configured')
}

const PRODUCT_NAME = new Map([
  ['1.5', 'Seedance-1.5'],
  ['2.0', 'Seedance-2.0'],
  ['5.0', 'Seedream-5.0']
])

export function getApiKeyErrorMessage(version) {
  const product = PRODUCT_NAME.get(version) || `Seedance-${version}`
  return `${product} API 密钥未配置，请先在设置页面配置密钥后再使用`
}

/**
 * Handle an API error in seedance pages:
 * - If API key is missing, return a user-friendly Chinese message
 * - Otherwise, return the original message or fallback
 * Also returns whether it's an API key missing error (for settings navigation)
 */
export function handleApiError(err, version, fallbackMsg) {
  const rawMsg = err instanceof Error ? err.message : fallbackMsg
  if (isApiKeyMissing(err)) {
    return { message: getApiKeyErrorMessage(version), isMissing: true }
  }
  return { message: rawMsg, isMissing: false }
}
