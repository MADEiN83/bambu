# Examples

Runnable TypeScript examples for [`@crazydev/bambu`](../packages/sdk). Each file
demonstrates a single SDK method and is meant to be skimmed, copy-pasted, and
adapted.

## Running an example

```bash
# from the repo root
bun examples/<path>.ts
```

All examples expect credentials via environment variables. Export them in your
shell or use a `.env` file with [`bun --env-file`](https://bun.sh/docs/runtime/env).

## Required environment variables

| Variable | Used by | What it is |
|---|---|---|
| `BAMBU_EMAIL` | Cloud examples | Bambu Lab account email |
| `BAMBU_PASSWORD` | Cloud examples | Bambu Lab account password |
| `BAMBU_DEV_ID` | per-device Cloud examples + LAN | Printer serial (15 chars, e.g. `00M09B461100094`) |
| `BAMBU_TASK_ID` | task-by-id examples | A print task id (any from `bun examples/cloud/list-tasks.ts`) |
| `BAMBU_PROJECT_INSTANCE_ID` | `get-printed-plates.ts` | A model instance id (integer) |
| `BAMBU_LAN_IP` | LAN examples | Local IP of the printer |
| `BAMBU_ACCESS_CODE` | LAN examples | 8-digit access code shown on the printer screen |

> 💡 The first Cloud run triggers a 2FA email. Subsequent runs reuse cached
> tokens from `.bambu-tokens.json` (chmod 600).

## Reading order

Pick whatever is closest to what you need; the order below is also a sane
onboarding path.

### Cloud — Authentication

| Example | Method |
|---|---|
| [`cloud/connect-basic.ts`](./cloud/connect-basic.ts) | `BambuClient.connect()` without persistence |
| [`cloud/connect-with-token-store.ts`](./cloud/connect-with-token-store.ts) | `connect()` + `fileTokenStore()` |
| [`cloud/login-low-level.ts`](./cloud/login-low-level.ts) | `login` → `sendVerifyCode` → `loginWithCode` |
| [`cloud/refresh-tokens.ts`](./cloud/refresh-tokens.ts) | `BambuClient.refreshTokens(refreshToken)` |
| [`cloud/get-tokens.ts`](./cloud/get-tokens.ts) | `client.getTokens()` for custom persistence |

### Cloud — Devices

| Example | Method |
|---|---|
| [`cloud/list-devices.ts`](./cloud/list-devices.ts) | `client.devices()` |
| [`cloud/get-device-by-id.ts`](./cloud/get-device-by-id.ts) | `client.getDeviceById(devId)` |
| [`cloud/get-device-firmware-version.ts`](./cloud/get-device-firmware-version.ts) | `client.getDeviceFirmwareVersion(devId)` |

### Cloud — Status

| Example | Method |
|---|---|
| [`cloud/get-device-statuses.ts`](./cloud/get-device-statuses.ts) | `client.getDeviceStatuses()` |
| [`cloud/get-device-status-by-id.ts`](./cloud/get-device-status-by-id.ts) | `client.getDeviceStatusById(devId)` |

### Cloud — Projects & Tasks

| Example | Method |
|---|---|
| [`cloud/list-projects.ts`](./cloud/list-projects.ts) | `client.listProjects()` |
| [`cloud/list-tasks.ts`](./cloud/list-tasks.ts) | `client.tasks(limit)` |
| [`cloud/get-task-by-id.ts`](./cloud/get-task-by-id.ts) | `client.getTaskById(taskId)` |
| [`cloud/get-my-task.ts`](./cloud/get-my-task.ts) | `client.getMyTask(taskId)` |
| [`cloud/get-printed-plates.ts`](./cloud/get-printed-plates.ts) | `client.getPrintedPlates(instanceId)` |
| [`cloud/get-device-task-notifications.ts`](./cloud/get-device-task-notifications.ts) | `client.getDeviceTaskNotifications()` |

### LAN — MQTT

| Example | Method |
|---|---|
| [`lan/connect-and-disconnect.ts`](./lan/connect-and-disconnect.ts) | `LanClient.connect()` + `disconnect()` |
| [`lan/push-all.ts`](./lan/push-all.ts) | `client.pushAll()` to fetch full state |
| [`lan/on-message-stream.ts`](./lan/on-message-stream.ts) | `client.onMessage(fn)` live stream |
| [`lan/send-command.ts`](./lan/send-command.ts) | `client.sendCommand()` (pause/resume/stop) |

### Combo — Cloud + LAN

| Example | What it does |
|---|---|
| [`combo/cloud-then-lan.ts`](./combo/cloud-then-lan.ts) | Resolve serial via Cloud, stream live status via LAN |
| [`combo/status-watcher.ts`](./combo/status-watcher.ts) | Cloud polling + LAN stream side by side |
