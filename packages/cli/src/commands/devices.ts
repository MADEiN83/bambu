import { loadClient } from "../lib/client.js";

export async function devices(): Promise<void> {
  const client = await loadClient();
  const list = await client.devices();

  if (list.length === 0) {
    console.log("No devices bound to this account.");
    return;
  }

  for (const d of list) {
    const onlineMark = d.online ? "●" : "○";
    console.log(
      `${onlineMark} ${d.name.padEnd(20)} ${d.dev_product_name.padEnd(8)} ${d.dev_id}  ${d.print_status}`,
    );
  }
}
