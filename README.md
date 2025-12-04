# @nickkeers/redux-persist-transform-encrypt

Encrypt your Redux store.

> **Note:** This is a fork of [maxdeviant/redux-persist-transform-encrypt](https://github.com/maxdeviant/redux-persist-transform-encrypt) with added support for custom crypto providers (e.g., `react-native-quick-crypto`).

## Installation

`redux-persist-transform-encrypt` must be used in conjunction with `redux-persist`, so make sure you have that installed as well.

```sh
npm install @nickkeers/redux-persist-transform-encrypt
```

## Usage

### Synchronous

```js
import { persistReducer } from 'redux-persist';
import { encryptTransform } from '@nickkeers/redux-persist-transform-encrypt';

const reducer = persistReducer(
  {
    transforms: [
      encryptTransform({
        secretKey: 'my-super-secret-key',
        onError: function (error) {
          // Handle the error.
        },
      }),
    ],
  },
  baseReducer
);
```

### Custom Crypto Provider

You can provide a custom crypto provider to use a different encryption library (e.g., `react-native-quick-crypto` for React Native). I believe the below implementation is compatible with how the crypto-js provider works, but I recommend you also check like I did with tests in your app:

```ts
/**
 * Native crypto provider for redux-persist encryption.
 * 
 * Uses react-native-quick-crypto for native AES encryption,
 * with backwards compatibility for data encrypted by crypto-js.
 */
import { CryptoProvider } from "@nhkeers/redux-persist-transform-encrypt";
import Crypto from 'react-native-quick-crypto';

/**
 * OpenSSL EVP_BytesToKey implementation.
 * This is the key derivation function used by crypto-js when you pass a string passphrase.
 * It derives both key and IV from password + salt using MD5.
 * 
 * Algorithm:
 * 1. D_i = MD5(D_{i-1} + password + salt)  (D_0 is empty)
 * 2. Concatenate D_1, D_2, ... until we have enough bytes for key + IV
 * 3. Key = first 32 bytes (AES-256), IV = next 16 bytes
 */
function evpBytesToKey(
  password: string,
  salt: Buffer,
  keyLen: number = 32,
  ivLen: number = 16
): { key: Buffer; iv: Buffer } {
  const totalLen = keyLen + ivLen;
  const result: any[] = [];
  let resultLen = 0;
  let prev: any = Buffer.alloc(0);

  while (resultLen < totalLen) {
    // MD5(prev + password + salt)
    const hash = Crypto.createHash('md5');
    hash.update(prev);
    hash.update(password, 'utf8');
    hash.update(salt as any);
    prev = hash.digest();
    result.push(prev);
    resultLen += prev.length;
  }

  const derived = Buffer.concat(result);
  return {
    key: derived.slice(0, keyLen) as unknown as Buffer,
    iv: derived.slice(keyLen, keyLen + ivLen) as unknown as Buffer,
  };
}

const OPENSSL_SALT_PREFIX = Buffer.from('Salted__', 'utf8');

/**
 * Native crypto provider using react-native-quick-crypto.
 * 
 * BACKWARDS COMPATIBLE with crypto-js:
 * - Decrypt: Detects OpenSSL format ("Salted__" prefix) and uses EVP_BytesToKey
 * - Encrypt: Uses OpenSSL-compatible format for consistency
 * 
 * Format: base64("Salted__" + salt_8bytes + ciphertext)
 */
export const quickCryptoProvider: CryptoProvider = {
  encrypt(plaintext: string, secretKey: string): string {
    try {
      // Use OpenSSL-compatible format for consistency with existing data
      // Generate random 8-byte salt (OpenSSL uses 8 bytes)
      const salt = Crypto.randomBytes(8) as unknown as Buffer;
      const { key, iv } = evpBytesToKey(secretKey, salt);
      
      const cipher = Crypto.createCipheriv('aes-256-cbc', key as any, iv as any);
      const encryptedPart1 = cipher.update(plaintext, 'utf8');
      const encryptedPart2 = cipher.final();
      
      // OpenSSL format: "Salted__" + salt + ciphertext
      const result = Buffer.concat([
        OPENSSL_SALT_PREFIX,
        salt,
        Buffer.from(encryptedPart1 as any),
        Buffer.from(encryptedPart2 as any),
      ]);
      return result.toString('base64');
    } catch (error) {
      console.error('[quickCryptoProvider] encrypt error:', error);
      throw error;
    }
  },
  
  decrypt(ciphertext: string, secretKey: string): string {
    try {
      const data = Buffer.from(ciphertext, 'base64');
      
      let salt: Buffer;
      let encrypted: Buffer;
      
      // Check for OpenSSL format (crypto-js legacy data)
      if (data.length > 16 && data.slice(0, 8).equals(OPENSSL_SALT_PREFIX)) {
        // OpenSSL format: "Salted__" (8 bytes) + salt (8 bytes) + ciphertext
        salt = data.slice(8, 16) as unknown as Buffer;
        encrypted = data.slice(16) as unknown as Buffer;
      } else {
        // Should not happen with OpenSSL format, but handle gracefully
        console.warn('[quickCryptoProvider] Unknown format, attempting legacy parse');
        salt = data.slice(0, 8) as unknown as Buffer;
        encrypted = data.slice(8) as unknown as Buffer;
      }
      
      const { key, iv } = evpBytesToKey(secretKey, salt);
      
      const decipher = Crypto.createDecipheriv('aes-256-cbc', key as any, iv as any);
      const decryptedPart1 = decipher.update(encrypted);
      const decryptedPart2 = decipher.final();
      
      const decrypted = Buffer.concat([
        Buffer.from(decryptedPart1 as any),
        Buffer.from(decryptedPart2 as any),
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('[quickCryptoProvider] decrypt error:', error);
      console.error('[quickCryptoProvider] ciphertext preview:', ciphertext?.substring(0, 50));
      throw error;
    }
  },
};
```

### Custom Error Handling

The `onError` property given to the `encryptTransform` options is an optional
function that receives an `Error` object as its only parameter. This allows
custom error handling from the parent application.

## Secret Key Selection

The `secretKey` provided to `encryptTransform` is used as a passphrase to generate a 256-bit AES key which is then used to encrypt the Redux store.

You **SHOULD NOT** use a single secret key for all users of your application, as this negates any potential security benefits of encrypting the store in the first place.

You **SHOULD NOT** hard-code or generate your secret key anywhere on the client, as this risks exposing the key since the JavaScript source is ultimately accessible to the end-user.

If you are only interested in persisting the store over the course of a single session and then invalidating the store, consider using the user's access token or session key as the secret key.

For long-term persistence, you will want to use a unique, deterministic key that is provided by the server. For example, the server could derive a hash from the user's ID and a salt (also stored server-side) and then return that hash to the client to use to decrypt the store. Placing this key retrieval behind authentication would prevent someone from accessing the encrypted store data if they are not authenticated as the user.
