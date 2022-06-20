export const encode = <T>(x: T): string => bytesToHex(stringToUTF8Bytes(JSON.stringify(x)));
export const decode = <T>(x: string): T | null => {
  try {
    return JSON.parse(UTF8BytesToString(hexToBytes(x)));
  } catch (e) {
    return null;
  }
};

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i !== bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}
function bytesToHex(bytes: Uint8Array) {
  return Array.from(
    bytes,
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
}

function stringToUTF8Bytes(string) {
  return new TextEncoder().encode(string);
}
function UTF8BytesToString(bytes) {
  return new TextDecoder().decode(bytes);
}
