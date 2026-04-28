import { loadClient } from "../lib/client.js";

export async function status(devId?: string): Promise<void> {
  const client = await loadClient();

  if (devId) {
    const s = await client.getDeviceStatusById(devId);
    if (!s) {
      console.error(`No device found with id ${devId}`);
      process.exit(1);
    }
    console.log(s);
    return;
  }

  const res = await client.getDeviceStatuses();
  for (const d of res.devices) {
    const onlineMark = d.dev_online ? "●" : "○";
    console.log(
      `${onlineMark} ${d.dev_name.padEnd(20)} ${d.dev_product_name.padEnd(8)} ${d.dev_id}`,
    );
  }
}
