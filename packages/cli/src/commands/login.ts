import { BambuClient } from "@crazydev/bambu";
import { prompt } from "../lib/client.js";
import { getStore, TOKENS_PATH } from "../lib/store.js";

export async function login(): Promise<void> {
  const email = process.env.BAMBU_EMAIL ?? (await prompt("Email: "));
  const password = process.env.BAMBU_PASSWORD ?? (await prompt("Password: "));

  if (!email || !password) {
    console.error("Email and password required.");
    process.exit(1);
  }

  const store = getStore();
  await BambuClient.connect({
    email,
    password,
    tokenStore: store,
    onVerifyCode: () => prompt("2FA code (6 digits): "),
  });

  console.log(`Logged in. Tokens saved to ${TOKENS_PATH} (chmod 600).`);
}
