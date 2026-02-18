# WiFi Hotspot Setup — DGX Spark GB10

Create a WiFi hotspot on the GB10 so phones can connect directly. No internet or external router needed.

## Prerequisites

- GB10 with a WiFi adapter (built-in or USB)
- NetworkManager installed (default on DGX OS)

## Setup

### 1. Create the hotspot

```bash
sudo nmcli device wifi hotspot \
  ifname wlan0 \
  ssid "MedInter-GB10" \
  password "med1nterpret" \
  band bg \
  channel 6
```

### 2. Make it persistent

```bash
# Get the connection name
nmcli connection show

# Set to autoconnect
sudo nmcli connection modify "Hotspot" autoconnect yes
```

### 3. Assign a static IP

The hotspot typically assigns `10.42.0.1` to the GB10. Verify:

```bash
ip addr show wlan0
```

### 4. Verify MedInter is accessible

```bash
curl http://10.42.0.1:3000/api/health
```

## On the Phone

### Android
1. Settings → WiFi → Connect to "MedInter-GB10"
2. Password: `med1nterpret`
3. You'll see "Connected, no internet" — that's expected
4. Open Chrome → `http://10.42.0.1:3000`

### iPhone
1. Settings → Wi-Fi → Join "MedInter-GB10"
2. Password: `med1nterpret`
3. iOS may warn "No Internet Connection" — tap "Use Without Internet"
4. Open Safari → `http://10.42.0.1:3000`

## USB-C Tethering (Alternative)

For the most reliable connection:

1. Connect phone to GB10 via USB-C cable
2. On Android: Settings → Network → USB tethering → ON
3. GB10 will appear as a network device
4. Find the GB10's USB network IP:

```bash
ip addr show usb0  # or enx...
```

5. Open browser on phone → `http://<GB10_USB_IP>:3000`

## Performance Notes

| Method | Bandwidth | Latency | Reliability |
|--------|-----------|---------|-------------|
| WiFi Hotspot | ~50 Mbps | ~5ms | High |
| Bluetooth PAN | ~2 Mbps | ~20ms | Medium |
| USB-C | ~100 Mbps | ~1ms | Highest |

All methods provide more than enough bandwidth for real-time audio streaming.

## Troubleshooting

- **No WiFi adapter**: Check `nmcli device` — if no wifi device, use USB WiFi adapter or USB-C
- **Phone warns "no internet"**: Expected — MedInter runs locally
- **Can't reach web app**: Check firewall: `sudo ufw allow 3000/tcp`
