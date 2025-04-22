import crypto from 'node:crypto';

const key = crypto.randomBytes(32); // keep safe!
const iv = crypto.randomBytes(16); // acts like a salt

async function encryptEmail(email: string) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(email, "utf8", "hex");
  encrypted += cipher.final("hex");
  console.log(encrypted)

  return {
    encryptedEmail: encrypted,
    iv: iv.toString("hex"), // Store this for decryption
  };
}

export { encryptEmail };
