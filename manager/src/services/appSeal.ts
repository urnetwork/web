// Seals the auth code to the app's per-attempt public key (NaCl box).
//
// Kept apart from appAuth.ts on purpose: this file pulls in tweetnacl, and the
// page loads it with a dynamic import() only once an approval is about to
// happen, so it is its own chunk and no other page pays for it. No React, no
// DOM: node --test loads it directly.
//
// The construction is the one the SDK's wallet bridge already uses
// (GenerateSharedSecret / EncryptData / DecryptData in urnetwork/sdk sdk.go):
// X25519 key agreement, XSalsa20-Poly1305, a 24-byte nonce, base58 on the wire.
// The app opens it with those same functions; tests/app-auth-vector.test.mjs
// pins one fixed vector that both sides must reproduce.
import nacl from "tweetnacl";
import bs58 from "bs58";
import { BadPublicKeyError, type AppRequest, type Sealed } from "./appAuth.ts";

/** Tests inject a fixed key pair and nonce; the page always uses the defaults
 * (a fresh key pair and 24 fresh random bytes for every approval). */
export interface SealInject {
	keyPair?: () => nacl.BoxKeyPair;
	nonce?: () => Uint8Array;
}

/** Seals {"c": code, "s": state} to request.pk. The ephemeral secret key, the
 * shared key and the plaintext bytes are zeroed before this returns. */
export function sealCode(
	code: string,
	request: AppRequest,
	inject: SealInject = {},
): Sealed {
	if (typeof code !== "string" || code === "")
		throw new Error("no code to seal");
	const appKey = bs58.decode(request.pk);
	if (appKey.length !== nacl.box.publicKeyLength)
		throw new BadPublicKeyError();

	const ephemeral = (inject.keyPair ?? nacl.box.keyPair)();
	let shared: Uint8Array | null = null;
	let message: Uint8Array | null = null;
	try {
		const nonce = (
			inject.nonce ?? (() => nacl.randomBytes(nacl.box.nonceLength))
		)();
		if (nonce.length !== nacl.box.nonceLength) throw new Error("bad nonce");
		// a key of small order (all-zero, 1, p-1, ...) makes every shared secret the
		// same all-zero point, so anyone could open the box: refuse it, as libsodium does
		const point = nacl.scalarMult(ephemeral.secretKey, appKey);
		const smallOrder = point.every((byte) => byte === 0);
		point.fill(0);
		if (smallOrder) throw new BadPublicKeyError();
		shared = nacl.box.before(appKey, ephemeral.secretKey);
		message = new TextEncoder().encode(
			JSON.stringify({ c: code, s: request.state }),
		);
		const sealed = nacl.box.after(message, nonce, shared);
		return {
			epk: bs58.encode(ephemeral.publicKey),
			n: bs58.encode(nonce),
			d: bs58.encode(sealed),
		};
	} finally {
		ephemeral.secretKey.fill(0);
		shared?.fill(0);
		message?.fill(0);
	}
}
