import React, { createContext, useState, useEffect, useContext } from 'react';

// Create context
const SettingsContext = createContext();

// Settings options
const themeOptions = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const currencyOptions = {
  AFN: {
    code: 'AFN',
    symbol: '؋',
    name: 'Afghan Afghani',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
  },
};

// Custom hook to use the settings context
export const useSettings = () => {
  return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('erpSettings');
    return savedSettings
      ? JSON.parse(savedSettings)
      : {
          theme: themeOptions.LIGHT,
          language: 'en',
          defaultCurrency: 'AFN',
          secondaryCurrency: 'USD',
          currencyFormat: 'symbol-first',
          dateFormat: 'MM/DD/YYYY',
          directionRTL: false,
          exchangeRates: {
            AFN: 1,
            USD: 0.01142, // 1 AFN = 0.01142 USD (example)
          },
          notifications: {
            lowStock: true,
            payments: true,
            orders: true,
          },
        };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('erpSettings', JSON.stringify(settings));
  }, [settings]);

  // Update a specific setting
  const updateSetting = (key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  // Update nested settings
  const updateNestedSetting = (parentKey, key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [parentKey]: {
        ...prevSettings[parentKey],
        [key]: value,
      },
    }));
  };

  // Update exchange rate for a currency
  const updateExchangeRate = (currencyCode, rate) => {
    updateNestedSetting('exchangeRates', currencyCode, rate);
  };

  // Calculate the value in the secondary currency
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    const { exchangeRates } = settings;
    
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      return amount;
    }
    
    // Convert amount to base currency (AFN) first
    const valueInBase = amount / exchangeRates[fromCurrency];
    
    // Then convert from base to target currency
    return valueInBase * exchangeRates[toCurrency];
  };

  // Format currency according to settings
  const formatCurrency = (amount, currencyCode = settings.defaultCurrency) => {
    const currency = currencyOptions[currencyCode] || currencyOptions.AFN;
    const { symbol, decimals } = currency;
    
    const formattedAmount = Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    return settings.currencyFormat === 'symbol-first' 
      ? `${symbol}${formattedAmount}`
      : `${formattedAmount} ${symbol}`;
  };

  // Toggle between light and dark theme
  const toggleTheme = () => {
    updateSetting('theme', settings.theme === themeOptions.LIGHT ? themeOptions.DARK : themeOptions.LIGHT);
  };

  // Toggle RTL direction
  const toggleDirection = () => {
    updateSetting('directionRTL', !settings.directionRTL);
  };

  // Context value
  const value = {
    ...settings,
    themeOptions,
    currencyOptions,
    updateSetting,
    updateNestedSetting,
    updateExchangeRate,
    convertCurrency,
    formatCurrency,
    toggleTheme,
    toggleDirection,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}; 