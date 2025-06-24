const validatePassword = (password) => {
  const errors = [];
  
  // Longueur minimale
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Au moins une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Au moins un chiffre
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Au moins un caractère spécial
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }  
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export {
  validatePassword
};