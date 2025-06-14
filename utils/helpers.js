export function generateRandomPassword(length = 10) {
  const minLength = 8;
  const finalLength = Math.max(length, minLength);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < finalLength; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
