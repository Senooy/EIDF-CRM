import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a price string (or number) into a currency string.
 * Defaults to EUR, but can be configured.
 * @param price The price amount (e.g., "123.45" or 123.45)
 * @param currency The currency code (e.g., "USD", "EUR")
 * @param locale The locale for formatting (e.g., "en-US", "de-DE")
 * @returns A formatted currency string (e.g., "€123.45")
 */
export const formatPrice = (
  price: string | number | undefined | null,
  currency: string = "EUR",
  locale: string = "fr-FR" // Default to French locale for EUR
): string => {
  if (price === null || price === undefined || price === "") {
    return "N/A"; // Or some other placeholder for undefined/empty prices
  }

  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numericPrice)) {
    return "Invalid Price"; // Handle cases where conversion to number fails
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(numericPrice);
  } catch (error) {
    console.error("Error formatting price:", error);
    // Fallback to simple formatting if Intl fails for some reason
    return `${currency} ${numericPrice.toFixed(2)}`;
  }
};
