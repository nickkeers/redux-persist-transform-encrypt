/**
 * Interface for crypto providers.
 * Implement this interface to use a custom encryption library
 * (e.g., react-native-quick-crypto).
 */
export interface CryptoProvider {
  /**
   * Encrypt a plaintext string.
   * @param plaintext - The string to encrypt
   * @param secretKey - The secret key to use for encryption
   * @returns The encrypted ciphertext as a string
   */
  encrypt(plaintext: string, secretKey: string): string;

  /**
   * Decrypt a ciphertext string.
   * @param ciphertext - The encrypted string to decrypt
   * @param secretKey - The secret key to use for decryption
   * @returns The decrypted plaintext as a string
   */
  decrypt(ciphertext: string, secretKey: string): string;
}
