#pragma once
// Copy to secrets.h and fill in. secrets.h is git-ignored.
// Use a 2.4 GHz network (ESP32 does not support 5 GHz).
#define WIFI_SSID   "your-2.4ghz-wifi"
#define WIFI_PASS   "your-password"
// IP of the laptop running `npm run dev`.
// With a Windows Mobile Hotspot the laptop is always 192.168.137.1
#define SERVER_HOST "192.168.137.1"
#define SERVER_PORT 3000
