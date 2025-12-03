import stringify from 'json-stringify-safe';
import { createTransform } from 'redux-persist';
import type { TransformConfig } from 'redux-persist/lib/createTransform';
import { cryptoJsProvider } from './crypto-js-provider.js';
import type { CryptoProvider } from './types.js';

export interface EncryptTransformConfig {
  secretKey: string;
  onError?: (err: Error) => void;
  /**
   * Custom crypto provider. Defaults to crypto-js AES encryption.
   * Implement the CryptoProvider interface to use a different library
   * (e.g., react-native-quick-crypto).
   */
  cryptoProvider?: CryptoProvider;
}

const makeError = (message: string) =>
  new Error(`redux-persist-transform-encrypt: ${message}`);

export const encryptTransform = <HSS, S = any, RS = any>(
  config: EncryptTransformConfig,
  transformConfig?: TransformConfig
) => {
  if (typeof config === 'undefined') {
    throw makeError('No configuration provided.');
  }

  const { secretKey } = config;
  if (!secretKey) {
    throw makeError('No secret key provided.');
  }

  const onError =
    typeof config.onError === 'function' ? config.onError : console.warn;

  const provider = config.cryptoProvider ?? cryptoJsProvider;

  return createTransform<HSS, string, S, RS>(
    (inboundState, _key) => provider.encrypt(stringify(inboundState), secretKey),
    (outboundState, _key) => {
      if (typeof outboundState !== 'string') {
        return onError(makeError('Expected outbound state to be a string.'));
      }

      try {
        const decryptedString = provider.decrypt(outboundState, secretKey);
        if (!decryptedString) {
          throw new Error('Decrypted string is empty.');
        }

        try {
          return JSON.parse(decryptedString);
        } catch {
          return onError(makeError('Failed to parse state as JSON.'));
        }
      } catch {
        return onError(
          makeError(
            'Could not decrypt state. Please verify that you are using the correct secret key.'
          )
        );
      }
    },
    transformConfig
  );
};
