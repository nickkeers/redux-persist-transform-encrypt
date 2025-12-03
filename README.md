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

You can provide a custom crypto provider to use a different encryption library (e.g., `react-native-quick-crypto` for React Native):

```ts
import { encryptTransform, CryptoProvider } from '@nickkeers/redux-persist-transform-encrypt';
import Crypto from 'react-native-quick-crypto';

const quickCryptoProvider: CryptoProvider = {
  encrypt(plaintext: string, secretKey: string): string {
    // Your encryption implementation
    const cipher = Crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    return cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64');
  },
  decrypt(ciphertext: string, secretKey: string): string {
    // Your decryption implementation
    const decipher = Crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    return decipher.update(ciphertext, 'base64', 'utf8') + decipher.final('utf8');
  },
};

const reducer = persistReducer(
  {
    transforms: [
      encryptTransform({
        secretKey: 'my-super-secret-key',
        cryptoProvider: quickCryptoProvider,
      }),
    ],
  },
  baseReducer
);
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
