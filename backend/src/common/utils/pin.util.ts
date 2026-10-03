import { randomInt } from 'node:crypto';

const PIN_LENGTH = 4;

/**
 * FR9 — the code a recipient reads out to the volunteer at hand-over. Generated with a CSPRNG
 * so it cannot be guessed from a sequence of earlier deliveries.
 */
export function generateDeliveryPin(): string {
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0');
}
