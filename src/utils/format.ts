/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);
};

/**
 * Format a token amount with 4 decimal places and thousand separators
 * @param amount The token amount to format
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    useGrouping: true,
  }).format(amount);
};

/**
 * Format a percentage
 * @param value The value to format as percentage
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a date
 * @param date The date to format
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}; 