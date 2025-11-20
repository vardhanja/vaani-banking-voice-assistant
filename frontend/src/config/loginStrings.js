import { DEFAULT_LANGUAGE } from "./voiceConfig.js";

/**
 * Login Page String Assets
 * 
 * Centralized location for all login page text content in multiple languages.
 * This ensures consistency and makes it easy to maintain and extend translations.
 */

export const LOGIN_STRINGS = {
  "en-IN": {
    // Voice login section
    voiceLogin: {
      firstTimeBanner: {
        text: "First time with voice login? We'll capture the passphrase",
        textAfter: "twice to enroll your voice securely. From the next login you can speak any short phrase.",
      },
      referenceBox: {
        header: "These are example phrases to record voice:",
        languageLabel: "English:",
        phrase: "Sun Bank is my companion, a promise of secure banking at every step",
      },
      recording: {
        statusFirstTime: "Recording… Speak clearly:",
        statusNormal: "Recording… Speak naturally in your own words.",
        statusFirstSample: "First sample captured. Please re-record the passphrase to confirm your voice.",
        statusConfirmed: "Voice sample confirmed. You can proceed to login.",
        statusProcessing: "Processing voice sample…",
        statusError: "Unable to process the voice sample.",
        statusPermissionDenied: "Microphone permission denied by the browser.",
        statusNotSupported: "Microphone access is not supported on this device.",
        statusRequesting: "Requesting microphone access…",
      },
      controls: {
        recordButton: "Record voice sample",
        stopButton: "Stop recording",
        resetButton: "Reset voice capture",
        sampleReady: "Sample ready",
        sample1Ready: "Sample 1 ready",
        sample2Ready: "Sample 2 ready",
        captured: "Captured",
      },
      errors: {
        noVoiceSample: "Please capture and confirm your voice sample before continuing. (If this is your first time enrolling for voice login, record the passphrase twice.)",
      },
    },
    // Language toggle
    languageToggle: {
      switchTo: "Switch to Hindi",
      targetLanguage: "हिंदी", // Language name shown on button (the language it will switch TO) - in Hindi script
      ariaLabel: "Switch language to Hindi",
    },
    // General login
    general: {
      welcomeTitle: "Welcome back.",
      welcomeSubtitle: "Sign in to continue to your Sun National Bank profile.",
      userIdLabel: "User ID",
      userIdPlaceholder: "Enter your customer ID",
      passwordLabel: "Password",
      voiceLabel: "Voice",
      passwordPlaceholder: "Enter your password",
      showPassword: "Show",
      hidePassword: "Hide",
      loginButton: "Log in",
      verifyOtpButton: "Verify OTP",
      verifying: "Verifying…",
      verifyingVoice: "Verifying voice…",
      otpLabel: "Enter OTP",
      otpPlaceholder: "Enter the 5-digit OTP",
      showOtp: "Show",
      hideOtp: "Hide",
      editDetails: "Edit details",
      needHelp: "Need help signing in?",
    },
    // Errors
    errors: {
      noUserId: "Please enter your User ID to continue.",
      invalidPassword: "Enter a valid password (minimum 4 characters).",
      invalidOtp: "The OTP you entered is incorrect. Please try again.",
      credentialsError: "Credentials could not be verified. Try again.",
      authError: "We could not verify those credentials. Try again.",
      serverError: "Something went wrong while contacting the bank. Please try again.",
    },
  },
  "hi-IN": {
    // Voice login section
    voiceLogin: {
      firstTimeBanner: {
        text: "पहली बार वॉइस लॉगिन कर रहे हैं? हम पासफ़्रेज़",
        textAfter: "को दो बार कैप्चर करेंगे ताकि आपकी आवाज़ सुरक्षित रूप से पंजीकृत हो जाए। अगली बार से आप कोई भी छोटा वाक्य बोल सकते हैं।",
      },
      referenceBox: {
        header: "ये आवाज़ रिकॉर्ड करने के लिए उदाहरण वाक्य हैं:",
        languageLabel: "हिंदी:",
        phrase: "सन बैंक मेरा साथी, हर कदम सुरक्षित बैंकिंग का वादा",
      },
      recording: {
        statusFirstTime: "रिकॉर्डिंग… साफ़ बोलें:",
        statusNormal: "रिकॉर्डिंग… अपने शब्दों में स्वाभाविक रूप से बोलें।",
        statusFirstSample: "पहला नमूना कैप्चर हो गया। कृपया अपनी आवाज़ की पुष्टि के लिए पासफ़्रेज़ को फिर से रिकॉर्ड करें।",
        statusConfirmed: "आवाज़ का नमूना पुष्ट हो गया। आप लॉगिन कर सकते हैं।",
        statusProcessing: "आवाज़ का नमूना प्रसंस्करण कर रहे हैं…",
        statusError: "आवाज़ का नमूना प्रसंस्कृत नहीं कर सका।",
        statusPermissionDenied: "ब्राउज़र द्वारा माइक्रोफ़ोन अनुमति अस्वीकार कर दी गई।",
        statusNotSupported: "इस डिवाइस पर माइक्रोफ़ोन एक्सेस समर्थित नहीं है।",
        statusRequesting: "माइक्रोफ़ोन एक्सेस का अनुरोध कर रहे हैं…",
      },
      controls: {
        recordButton: "आवाज़ का नमूना रिकॉर्ड करें",
        stopButton: "रिकॉर्डिंग रोकें",
        resetButton: "आवाज़ कैप्चर रीसेट करें",
        sampleReady: "नमूना तैयार",
        sample1Ready: "नमूना 1 तैयार",
        sample2Ready: "नमूना 2 तैयार",
        captured: "कैप्चर किया गया",
      },
      errors: {
        noVoiceSample: "कृपया आगे बढ़ने से पहले अपना आवाज़ का नमूना कैप्चर और पुष्टि करें। (यदि यह आपका पहली बार वॉइस लॉगिन के लिए पंजीकरण है, तो पासफ़्रेज़ को दो बार रिकॉर्ड करें।)",
      },
    },
    // Language toggle
    languageToggle: {
      switchTo: "अंग्रेज़ी में बदलें",
      targetLanguage: "English", // Language name shown on button (the language it will switch TO)
      ariaLabel: "भाषा को अंग्रेज़ी में बदलें",
    },
    // General login
    general: {
      welcomeTitle: "वापसी पर स्वागत है।",
      welcomeSubtitle: "अपने सन नेशनल बैंक प्रोफ़ाइल पर जारी रखने के लिए साइन इन करें।",
      userIdLabel: "उपयोगकर्ता आईडी",
      userIdPlaceholder: "अपना ग्राहक आईडी दर्ज करें",
      passwordLabel: "पासवर्ड",
      voiceLabel: "आवाज़",
      passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
      showPassword: "दिखाएँ",
      hidePassword: "छुपाएँ",
      loginButton: "लॉग इन करें",
      verifyOtpButton: "OTP सत्यापित करें",
      verifying: "सत्यापित कर रहे हैं…",
      verifyingVoice: "आवाज़ सत्यापित कर रहे हैं…",
      otpLabel: "OTP दर्ज करें",
      otpPlaceholder: "5 अंकों का OTP दर्ज करें",
      showOtp: "दिखाएँ",
      hideOtp: "छुपाएँ",
      editDetails: "विवरण संपादित करें",
      needHelp: "साइन इन करने में मदद चाहिए?",
    },
    // Errors
    errors: {
      noUserId: "कृपया आगे बढ़ने के लिए अपना उपयोगकर्ता आईडी दर्ज करें।",
      invalidPassword: "एक वैध पासवर्ड दर्ज करें (न्यूनतम 4 वर्ण)।",
      invalidOtp: "आपके द्वारा दर्ज किया गया OTP गलत है। कृपया पुनः प्रयास करें।",
      credentialsError: "क्रेडेंशियल सत्यापित नहीं किए जा सके। पुनः प्रयास करें।",
      authError: "हम उन क्रेडेंशियल को सत्यापित नहीं कर सके। पुनः प्रयास करें।",
      serverError: "बैंक से संपर्क करते समय कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
    },
  },
};

/**
 * Get login strings for a specific language
 * @param {string} languageCode - Language code (e.g., 'en-IN', 'hi-IN')
 * @returns {object} Login strings for the specified language
 */
export const getLoginStrings = (languageCode) => {
  return LOGIN_STRINGS[languageCode] || LOGIN_STRINGS[DEFAULT_LANGUAGE];
};

/**
 * Voice phrases for each language
 */
export const VOICE_PHRASES = {
  "en-IN": "Sun Bank is my companion, a promise of secure banking at every step",
  "hi-IN": "सन बैंक मेरा साथी, हर कदम सुरक्षित बैंकिंग का वादा",
};

/**
 * Get voice phrase for a specific language
 * @param {string} languageCode - Language code (e.g., 'en-IN', 'hi-IN')
 * @returns {string} Voice phrase for the specified language
 */
export const getVoicePhrase = (languageCode) => {
  return VOICE_PHRASES[languageCode] || VOICE_PHRASES[DEFAULT_LANGUAGE];
};

export default LOGIN_STRINGS;

