import Aes from 'crypto-js/aes.js';
import CryptoJsCore from 'crypto-js/core.js';
import type { CryptoProvider } from './types.js';

/**
 * Default crypto provider using crypto-js AES encryption.
 */
export const cryptoJsProvider: CryptoProvider = {
  encrypt(plaintext: string, secretKey: string): string {
    return Aes.encrypt(plaintext, secretKey).toString();
  },

  decrypt(ciphertext: string, secretKey: string): string {
    return Aes.decrypt(ciphertext, secretKey).toString(CryptoJsCore.enc.Utf8);
  },
};
