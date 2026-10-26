import { Language } from './types';

export type TranslationKey =
  | 'title'
  | 'subtitle'
  | 'stationInfo'
  | 'chargingStation'
  | 'location'
  | 'chargerId'
  | 'sessionDate'
  | 'startTime'
  | 'endTime'
  | 'chargingBill'
  | 'energyConsumed'
  | 'tariffPerKwh'
  | 'energyCharge'
  | 'gst'
  | 'serviceFee'
  | 'discount'
  | 'totalAmount'
  | 'payNow'
  | 'processing'
  | 'paymentSuccessful'
  | 'paymentFailed'
  | 'paymentPending'
  | 'downloadInvoice'
  | 'contactSupport'
  | 'needHelp'
  | 'supportText'
  | 'transactionId'
  | 'paidAt'
  | 'paymentMethod'
  | 'retry'
  | 'sessionExpired'
  | 'sessionExpiredDesc'
  | 'invalidSession'
  | 'loadingSession'
  | 'alreadyPaid'
  | 'alreadyPaidDesc'
  | 'verifying'
  | 'amount'
  | 'kwh'
  | 'connectorType'
  | 'paymentFailedDesc'
  | 'paymentPendingDesc'
  | 'invoiceGenerating'
  | 'secure';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  title: 'EV Charging Payment',
  subtitle: 'Redefining the way you recharge',
  stationInfo: 'Station Information',
  chargingStation: 'Charging Station',
  location: 'Location',
  chargerId: 'Charger ID',
  sessionDate: 'Session Date',
  startTime: 'Start Time',
  endTime: 'End Time',
  connectorType: 'Connector',
  chargingBill: 'Charging Bill',
  energyConsumed: 'Energy Consumed',
  tariffPerKwh: 'Tariff',
  energyCharge: 'Energy Charge',
  gst: 'GST (5%)',
  serviceFee: 'Service Fee',
  discount: 'Discount',
  totalAmount: 'Total Payable',
  payNow: 'Pay Now',
  processing: 'Processing Payment…',
  paymentSuccessful: 'Payment Successful',
  paymentFailed: 'Payment Failed',
  paymentPending: 'Payment Pending',
  downloadInvoice: 'Download Invoice',
  contactSupport: 'Contact Support',
  needHelp: 'Need help with your payment?',
  supportText: 'For issues with failed, pending, or duplicate payments, please reach out.',
  transactionId: 'Transaction / Reference ID',
  paidAt: 'Payment Date & Time',
  paymentMethod: 'Payment Method',
  retry: 'Try Again',
  sessionExpired: 'Session Expired',
  sessionExpiredDesc: 'This payment link has expired. Please scan the QR code again at the charger.',
  invalidSession: 'Invalid or unauthorised session. Please scan the QR code again.',
  loadingSession: 'Loading your charging session…',
  alreadyPaid: 'Already Paid',
  alreadyPaidDesc: 'This session has already been paid. You can download your invoice below.',
  verifying: 'Verifying payment…',
  amount: 'Amount',
  kwh: 'kWh',
  paymentFailedDesc: 'Your payment could not be processed. No amount has been charged. Please try again.',
  paymentPendingDesc: 'Your payment is under verification. Please wait — we will update this page shortly.',
  invoiceGenerating: 'Generating invoice…',
  secure: 'Secured Payment',
};

const ta: Translations = {
  title: 'EV சார்ஜிங் பேமென்ட்',
  subtitle: 'உங்கள் சார்ஜிங் அனுபவத்தை புதுப்பிக்கிறோம்',
  stationInfo: 'நிலைய தகவல்',
  chargingStation: 'சார்ஜிங் நிலையம்',
  location: 'இடம்',
  chargerId: 'சார்ஜர் ID',
  sessionDate: 'அமர்வு தேதி',
  startTime: 'தொடக்க நேரம்',
  endTime: 'முடிவு நேரம்',
  connectorType: 'கனெக்டர்',
  chargingBill: 'சார்ஜிங் பில்',
  energyConsumed: 'பயன்படுத்திய ஆற்றல்',
  tariffPerKwh: 'கட்டணம்',
  energyCharge: 'ஆற்றல் கட்டணம்',
  gst: 'GST (5%)',
  serviceFee: 'சேவைக் கட்டணம்',
  discount: 'தள்ளுபடி',
  totalAmount: 'செலுத்த வேண்டிய தொகை',
  payNow: 'இப்போது செலுத்துங்கள்',
  processing: 'பணம் செலுத்துகிறது…',
  paymentSuccessful: 'பணம் செலுத்தல் வெற்றிகரமாக முடிந்தது',
  paymentFailed: 'பணம் செலுத்தல் தோல்வி',
  paymentPending: 'பணம் செலுத்தல் நிலுவையில் உள்ளது',
  downloadInvoice: 'இன்வாய்ஸ் பதிவிறக்கம்',
  contactSupport: 'ஆதரவை தொடர்பு கொள்ளவும்',
  needHelp: 'உங்கள் பணம் செலுத்தலில் உதவி வேண்டுமா?',
  supportText: 'தோல்வி, நிலுவை அல்லது நகல் கொடுப்பனவுகளுக்கு, தயவுசெய்து எங்களை தொடர்பு கொள்ளுங்கள்.',
  transactionId: 'பரிமாற்ற / குறிப்பு ID',
  paidAt: 'பணம் செலுத்திய தேதி & நேரம்',
  paymentMethod: 'பணம் செலுத்தும் முறை',
  retry: 'மீண்டும் முயற்சிக்கவும்',
  sessionExpired: 'அமர்வு காலாவதியானது',
  sessionExpiredDesc: 'இந்த பணம் செலுத்தல் இணைப்பு காலாவதியானது. சார்ஜரில் QR குறியீட்டை மீண்டும் ஸ்கேன் செய்யவும்.',
  invalidSession: 'தவறான அல்லது அங்கீகரிக்கப்படாத அமர்வு. QR குறியீட்டை மீண்டும் ஸ்கேன் செய்யவும்.',
  loadingSession: 'உங்கள் சார்ஜிங் அமர்வை ஏற்றுகிறது…',
  alreadyPaid: 'ஏற்கனவே செலுத்தப்பட்டது',
  alreadyPaidDesc: 'இந்த அமர்வு ஏற்கனவே செலுத்தப்பட்டது. கீழே உங்கள் இன்வாய்ஸை பதிவிறக்கம் செய்யலாம்.',
  verifying: 'பணம் செலுத்தலை சரிபார்க்கிறது…',
  amount: 'தொகை',
  kwh: 'kWh',
  paymentFailedDesc: 'உங்கள் பணம் செலுத்தல் செயல்படுத்தப்படவில்லை. எந்த தொகையும் வசூலிக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்.',
  paymentPendingDesc: 'உங்கள் பணம் செலுத்தல் சரிபார்க்கப்படுகிறது. காத்திருங்கள் — விரைவில் இந்தப் பக்கத்தை புதுப்பிப்போம்.',
  invoiceGenerating: 'இன்வாய்ஸ் உருவாக்கப்படுகிறது…',
  secure: 'பாதுகாப்பான பணம் செலுத்தல்',
};

const translations: Record<Language, Translations> = { en, ta };

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
