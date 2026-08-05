// lib/pricing/countryData.ts
//
// ISO 3166-1 alpha-2 country codes mapped to their real local currency
// and whether they're eligible for the flat 20% discount. Every one of
// the 54 UN-recognized African countries is included, not just the
// subset discussed earlier in the payment-routing conversation, since
// the actual decision was "all African countries," not a shorter list.
//
// Currency codes are standard ISO 4217. A handful of West/Central African
// countries share a currency (XOF, the West African CFA franc; XAF, the
// Central African CFA franc), that's real, not a mistake, several
// countries genuinely use the same currency.

export interface CountryPricing {
  currency: string   // ISO 4217 code
  isAfrican: boolean // discount eligibility
}

export const COUNTRY_DATA: Record<string, CountryPricing> = {
  // ── Africa (54 countries, all discount-eligible) ──────────────
  DZ: { currency: 'DZD', isAfrican: true }, // Algeria
  AO: { currency: 'AOA', isAfrican: true }, // Angola
  BJ: { currency: 'XOF', isAfrican: true }, // Benin
  BW: { currency: 'BWP', isAfrican: true }, // Botswana
  BF: { currency: 'XOF', isAfrican: true }, // Burkina Faso
  BI: { currency: 'BIF', isAfrican: true }, // Burundi
  CV: { currency: 'CVE', isAfrican: true }, // Cabo Verde
  CM: { currency: 'XAF', isAfrican: true }, // Cameroon
  CF: { currency: 'XAF', isAfrican: true }, // Central African Republic
  TD: { currency: 'XAF', isAfrican: true }, // Chad
  KM: { currency: 'KMF', isAfrican: true }, // Comoros
  CG: { currency: 'XAF', isAfrican: true }, // Congo (Republic)
  CD: { currency: 'CDF', isAfrican: true }, // Congo (DRC)
  DJ: { currency: 'DJF', isAfrican: true }, // Djibouti
  EG: { currency: 'EGP', isAfrican: true }, // Egypt
  GQ: { currency: 'XAF', isAfrican: true }, // Equatorial Guinea
  ER: { currency: 'ERN', isAfrican: true }, // Eritrea
  SZ: { currency: 'SZL', isAfrican: true }, // Eswatini
  ET: { currency: 'ETB', isAfrican: true }, // Ethiopia
  GA: { currency: 'XAF', isAfrican: true }, // Gabon
  GM: { currency: 'GMD', isAfrican: true }, // Gambia
  GH: { currency: 'GHS', isAfrican: true }, // Ghana
  GN: { currency: 'GNF', isAfrican: true }, // Guinea
  GW: { currency: 'XOF', isAfrican: true }, // Guinea-Bissau
  CI: { currency: 'XOF', isAfrican: true }, // Ivory Coast
  KE: { currency: 'KES', isAfrican: true }, // Kenya
  LS: { currency: 'LSL', isAfrican: true }, // Lesotho
  LR: { currency: 'LRD', isAfrican: true }, // Liberia
  LY: { currency: 'LYD', isAfrican: true }, // Libya
  MG: { currency: 'MGA', isAfrican: true }, // Madagascar
  MW: { currency: 'MWK', isAfrican: true }, // Malawi
  ML: { currency: 'XOF', isAfrican: true }, // Mali
  MR: { currency: 'MRU', isAfrican: true }, // Mauritania
  MU: { currency: 'MUR', isAfrican: true }, // Mauritius
  MA: { currency: 'MAD', isAfrican: true }, // Morocco
  MZ: { currency: 'MZN', isAfrican: true }, // Mozambique
  NA: { currency: 'NAD', isAfrican: true }, // Namibia
  NE: { currency: 'XOF', isAfrican: true }, // Niger
  NG: { currency: 'NGN', isAfrican: true }, // Nigeria
  RW: { currency: 'RWF', isAfrican: true }, // Rwanda
  ST: { currency: 'STN', isAfrican: true }, // Sao Tome and Principe
  SN: { currency: 'XOF', isAfrican: true }, // Senegal
  SC: { currency: 'SCR', isAfrican: true }, // Seychelles
  SL: { currency: 'SLL', isAfrican: true }, // Sierra Leone
  SO: { currency: 'SOS', isAfrican: true }, // Somalia
  ZA: { currency: 'ZAR', isAfrican: true }, // South Africa
  SS: { currency: 'SSP', isAfrican: true }, // South Sudan
  SD: { currency: 'SDG', isAfrican: true }, // Sudan
  TZ: { currency: 'TZS', isAfrican: true }, // Tanzania
  TG: { currency: 'XOF', isAfrican: true }, // Togo
  TN: { currency: 'TND', isAfrican: true }, // Tunisia
  UG: { currency: 'UGX', isAfrican: true }, // Uganda
  ZM: { currency: 'ZMW', isAfrican: true }, // Zambia
  ZW: { currency: 'ZWL', isAfrican: true }, // Zimbabwe

  // ── Rest of world, expanded from the original 16-country starting
  // set after a real visitor (Kuala Lumpur) hit a country that wasn't
  // covered at all, not exhaustive, but meaningfully broader now,
  // covering every major region rather than just North America/Europe. ──
  US: { currency: 'USD', isAfrican: false },
  GB: { currency: 'GBP', isAfrican: false },
  CA: { currency: 'CAD', isAfrican: false },
  AU: { currency: 'AUD', isAfrican: false },
  NZ: { currency: 'NZD', isAfrican: false },
  DE: { currency: 'EUR', isAfrican: false },
  FR: { currency: 'EUR', isAfrican: false },
  ES: { currency: 'EUR', isAfrican: false },
  IT: { currency: 'EUR', isAfrican: false },
  IE: { currency: 'EUR', isAfrican: false },
  NL: { currency: 'EUR', isAfrican: false },
  MY: { currency: 'MYR', isAfrican: false }, // Malaysia
  SG: { currency: 'SGD', isAfrican: false },
  TH: { currency: 'THB', isAfrican: false },
  ID: { currency: 'IDR', isAfrican: false },
  PH: { currency: 'PHP', isAfrican: false },
  VN: { currency: 'VND', isAfrican: false },
  JP: { currency: 'JPY', isAfrican: false },
  KR: { currency: 'KRW', isAfrican: false },
  CN: { currency: 'CNY', isAfrican: false },
  HK: { currency: 'HKD', isAfrican: false },
  TW: { currency: 'TWD', isAfrican: false },
  IN: { currency: 'INR', isAfrican: false },
  PK: { currency: 'PKR', isAfrican: false },
  BD: { currency: 'BDT', isAfrican: false },
  AE: { currency: 'AED', isAfrican: false },
  SA: { currency: 'SAR', isAfrican: false },
  IL: { currency: 'ILS', isAfrican: false },
  TR: { currency: 'TRY', isAfrican: false },
  BR: { currency: 'BRL', isAfrican: false },
  MX: { currency: 'MXN', isAfrican: false },
  AR: { currency: 'ARS', isAfrican: false },
  CO: { currency: 'COP', isAfrican: false },
  JM: { currency: 'JMD', isAfrican: false },
  TT: { currency: 'TTD', isAfrican: false },
}

// Anything not in the table above, fall back to full-price USD rather
// than guessing at a currency or, worse, silently applying the African
// discount to an undetected country. Being wrong toward "shows USD,
// full price" is a far safer default than being wrong toward "gave
// someone a discount they weren't meant to get."
export const DEFAULT_PRICING: CountryPricing = { currency: 'USD', isAfrican: false }

export function getCountryPricing(countryCode: string | null | undefined): CountryPricing {
  if (!countryCode) return DEFAULT_PRICING
  return COUNTRY_DATA[countryCode.toUpperCase()] ?? DEFAULT_PRICING
}
