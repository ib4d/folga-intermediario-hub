export const ACCOUNT_PASSWORD_MIN_CHARACTERS = 12;
export const ACCOUNT_PASSWORD_MAX_UTF8_BYTES = 72;

export function isValidAccountPassword(password: string) {
  const characterCount = Array.from(password).length;
  const byteCount = Buffer.byteLength(password, "utf8");

  return (
    characterCount >= ACCOUNT_PASSWORD_MIN_CHARACTERS &&
    byteCount <= ACCOUNT_PASSWORD_MAX_UTF8_BYTES
  );
}
