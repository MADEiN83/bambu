import { getStore, TOKENS_PATH } from "../lib/store.js";

export async function logout(): Promise<void> {
  await getStore().clear();
  console.log(`Logged out. Tokens cleared at ${TOKENS_PATH}.`);
}
