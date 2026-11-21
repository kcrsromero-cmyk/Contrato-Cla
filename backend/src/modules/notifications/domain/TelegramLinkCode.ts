import { randomInt } from 'node:crypto';

export const TELEGRAM_LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TELEGRAM_LINK_CODE_LENGTH = 8;
export const TELEGRAM_LINK_CODE_TTL_MS = 15 * 60 * 1000;
export const TELEGRAM_LINK_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function generateTelegramLinkCode(): string {
  let code = '';
  for (let i = 0; i < TELEGRAM_LINK_CODE_LENGTH; i++) {
    code += TELEGRAM_LINK_CODE_ALPHABET[randomInt(0, TELEGRAM_LINK_CODE_ALPHABET.length)];
  }
  return code;
}
