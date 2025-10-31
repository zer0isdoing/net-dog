import validator from 'validator';
import xss from 'xss';

export const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return xss(validator.trim(str));
};

export const validateIP = (ip) => {
  const sanitized = sanitize(ip);
  if (!validator.isIP(sanitized)) {
    throw new Error('Invalid IP address format');
  }
  return sanitized;
};

export const validateMAC = (mac) => {
  const sanitized = sanitize(mac);
  const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
  if (!macRegex.test(sanitized)) {
    throw new Error('Invalid MAC address format (use XX:XX:XX:XX:XX:XX)');
  }
  return sanitized.toUpperCase();
};

export const validateVLAN = (vlanId) => {
  const id = parseInt(vlanId);
  if (isNaN(id) || id < 1 || id > 4094) {
    throw new Error('VLAN ID must be between 1 and 4094');
  }
  return id;
};

export const validateUsername = (username) => {
  const sanitized = sanitize(username);
  if (!validator.isLength(sanitized, { min: 3, max: 50 })) {
    throw new Error('Username must be 3-50 characters');
  }
  if (!validator.isAlphanumeric(sanitized, 'en-US', { ignore: '_-' })) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
  }
  return sanitized;
};

export const validatePassword = (password) => {
  if (!validator.isLength(password, { min: 8, max: 128 })) {
    throw new Error('Password must be 8-128 characters');
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (strength < 3) {
    throw new Error('Password must contain at least 3 of: uppercase, lowercase, numbers, special characters');
  }
  
  return password;
};

export const validateRole = (role) => {
  const sanitized = sanitize(role);
  if (!['admin', 'viewer'].includes(sanitized)) {
    throw new Error('Invalid role');
  }
  return sanitized;
};

export const sanitizeText = (text) => {
  if (!text) return null;
  const sanitized = sanitize(text);
  if (!validator.isLength(sanitized, { max: 1000 })) {
    throw new Error('Text field too long (max 1000 characters)');
  }
  return sanitized;
};

export const validateAccessType = (accessType) => {
  const sanitized = sanitize(accessType);
  if (!['full', 'limited', 'blocked'].includes(sanitized)) {
    throw new Error('Invalid access type');
  }
  return sanitized;
};

export const validateTagType = (tagType) => {
  const sanitized = sanitize(tagType);
  if (!['tagged', 'untagged', 'not_member'].includes(sanitized)) {
    throw new Error('Invalid tag type');
  }
  return sanitized;
};

export const validatePortNumber = (port) => {
  const num = parseInt(port);
  if (isNaN(num) || num < 1 || num > 128) {
    throw new Error('Port number must be between 1 and 128');
  }
  return num;
};
