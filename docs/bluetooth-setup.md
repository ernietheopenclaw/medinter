# Bluetooth PAN Setup — DGX Spark GB10

Connect a phone to the GB10 via Bluetooth Personal Area Network (PAN). No WiFi or internet needed.

## On the GB10

### 1. Install Bluetooth PAN packages

```bash
sudo apt install bluez bridge-utils
sudo systemctl enable bluetooth
sudo systemctl start bluetooth
```

### 2. Make GB10 discoverable

```bash
sudo bluetoothctl
[bluetooth]# power on
[bluetooth]# discoverable on
[bluetooth]# pairable on
[bluetooth]# agent on
[bluetooth]# default-agent
```

### 3. Enable NAP (Network Access Point)

Create `/etc/systemd/system/bt-nap.service`:

```ini
[Unit]
Description=Bluetooth NAP
After=bluetooth.service
Requires=bluetooth.service

[Service]
ExecStart=/usr/bin/bt-network -s nap bridge0
Restart=always

[Install]
WantedBy=multi-user.target
```

### 4. Configure network bridge

```bash
sudo brctl addbr bridge0
sudo ip addr add 192.168.44.1/24 dev bridge0
sudo ip link set bridge0 up
```

### 5. Start DHCP for connected devices

Install `dnsmasq`:

```bash
sudo apt install dnsmasq
```

Add to `/etc/dnsmasq.d/bt-pan.conf`:

```
interface=bridge0
dhcp-range=192.168.44.10,192.168.44.50,255.255.255.0,24h
```

```bash
sudo systemctl restart dnsmasq
```

## On the Phone

### Android
1. Settings → Connected devices → Bluetooth
2. Pair with "DGX-Spark-GB10" (or your GB10's hostname)
3. After pairing, tap the device → Enable "Internet access"
4. Open Chrome → Navigate to `http://192.168.44.1:3000`

### iPhone
1. Settings → Bluetooth → Pair with GB10
2. Bluetooth PAN is limited on iOS — consider WiFi hotspot instead
3. Alternatively, use USB-C tethering

## Verify Connection

From the phone's browser:
```
http://192.168.44.1:3000
```

You should see the MedInter landing page. The connection indicator should show 🟢 Connected.

## Troubleshooting

- **Can't discover GB10**: Ensure `discoverable on` in bluetoothctl
- **Paired but no network**: Check that bt-nap service is running and bridge0 has an IP
- **Phone can't reach web app**: Verify DHCP lease with `cat /var/lib/misc/dnsmasq.leases`
- **Slow connection**: Bluetooth PAN tops out at ~2 Mbps — sufficient for audio streaming
