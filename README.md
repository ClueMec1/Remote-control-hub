# Checkout Terminal

The register screen for a grocery shop: scan items, weigh produce, apply sale prices and coupons, take cash,
card or "charge to account" payments, and print receipts. It runs in the browser, keeps working with no internet,
and installs as its own app.

It gets its catalogue, customers and settings from the **Owner Manager**, a separate app. This download
does not include it.

| File | What it is |
|---|---|
| `checkout_terminal.html` | The register |
| `sw.js`, `terminal.webmanifest`, `icon-*.png` | Make it installable and available offline |

## Run it

Keep these files together in their own folder and serve that folder from the register computer, then open
the page at a `localhost` address. With Python installed:

    python -m http.server 8000

Open `http://localhost:8000/checkout_terminal.html` in Chrome or Edge. Use the browser's install button to
add it as an app. After the first load it opens with the server stopped.

It also works hosted at an `https://` address. Double-clicking the file works for a quick look, but browsers
only allow the offline cache, app install, scales and serial devices from `localhost` or HTTPS.

## Give it the shop's data

A new register is empty. There are two ways to load it.

**Over Wi-Fi (the owner has switched on Wi-Fi sync in the Owner Manager)**

1. Open the register. It asks for its host and lists the hosts it can see by name.
2. Pick your shop. If none is listed, type the host code from the owner's Settings screen.
3. The owner presses **Allow** on their computer when both screens show the same 4-digit code.

The register loads everything and from then on sends each sale to the host and picks up changes by
itself. If the host or the Wi-Fi is down it keeps selling and shows how much is waiting to be sent.

**With a file**

Drag the `inventory_db.json` exported from the Owner Manager onto the register screen and enter the owner
PIN. The register warns you if the file is older than what it already has.

If the Owner Manager runs in the same browser at the same address (see its README), the register shares
its data directly and needs neither step.

## Keys and buttons

| Key | Action |
|---|---|
| F2 / F3 / F4 | Pay cash / Card / Charge to Account |
| Alt+Shift+H | Owner: choose or change this register's host (PIN) |
| Alt+Shift+E | Owner: export this register's data to a file (PIN) |

Two small buttons sit at the top: **Devices** (this register's card terminal, scale, scanner and printer)
and **Accounts** (look up a customer account or take a payment on one). Typing always goes to the scanner
box unless a dialog is open, so a scanner in keyboard mode works without clicking anywhere.

## Devices: each register sets up its own

Nothing about devices comes from the owner's file. A register asks for a device the first time it needs
one (the first card payment, the first weighed item), and **Devices** changes it at any time. If a device
that was set up is unplugged or gone, the Devices button shows a warning, the register says so when the
device is next needed, and it offers setup again. All of this needs Chrome or Edge on a computer.

### Scale

| Your scale | Choose | Notes |
|---|---|---|
| USB scale of the standard "HID point of sale" kind, which needs no driver (for example a Mettler Toledo Ariva set to "USB HID POS", and Dymo USB scales) | USB scale | Press **Choose the scale** and pick it. |
| RS-232 scale on a USB-to-serial adapter, a "USB virtual COM" scale, or a Bluetooth scale paired as a serial port (Avery Weigh-Tronix and Brecknell 67xx, Mettler Toledo Ariva and Viva, CAS PD-II and PD-1, and scales that follow them) | Serial, USB-COM or Bluetooth serial port | Press **Choose the port**, then **Find my scale**. It tries the usual settings and these protocols: NCI / Weigh-Tronix, Mettler Toledo 8217, CAS, Mettler/Ohaus command mode, and scales that send their weight continuously. |
| The scale inside an in-counter scanner (Datalogic Magellan, Zebra MP7000, NCR, Honeywell) | Serial, as above | Use the scanner's separate scale cable ("dual cable") and set its scale port to NCI or 8217. |
| Wi-Fi or Ethernet scale | Network address | Browsers cannot open a raw network connection to a scale. This option reads a bridge program that offers the scale's output at an `http://` or `ws://` address. |
| Any scale, or none connected | Not connected | The cashier types the weight shown on the scale. |

The setup screen shows the live reading: it must match the scale's own display before you press **Use
this**. When a by-weight item is scanned the register reads the scale and adds the line as soon as the
weight is steady; the cashier can always type the weight instead.

Not supported: single-cable scanner/scale protocols, IBM "USB OEM" mode, Bluetooth Low Energy-only
scales, and the European Dialog 02/04/06 protocols.

**Labels from a deli or meat scale.** Those scales are not connected to the register: they print a
barcode that carries the price. The register reads the US format (a 12-digit code starting with 2, with a
5-digit item number and a 4-digit price). Ask the owner to save the item under that 5-digit item number.

### Barcode scanner

Hand-held, in-counter and Bluetooth scanners nearly all work as a keyboard, which needs no setup. Set an
in-counter scanner to "USB keyboard" for this. For a scanner on a serial or USB-COM port, choose the port
under Devices. A UPC is found whether the scanner sends it with or without the leading 0.

### Card terminal

| Choice | When |
|---|---|
| Not connected to this register | Works with every terminal: the register shows the amount and the cashier keys it on the terminal, then confirms it was approved. |
| On the network | A terminal or bridge program that accepts the sale message below at an address. |
| On a serial or USB-COM port | The same message as one line of text. |
| A device saved by the owner | Ready-made choices from the Owner Manager's Payment devices page. |
| Practice device | Training only. Needs the owner PIN, charges nothing, and marks receipts "Test mode". |

    { "type": "sale", "amount": "24.18", "amount_cents": 2418,
      "currency": "USD", "reference": "SALE-ID", "station": "REG-AB12" }

The sale completes only on a reply whose `status` is `approved` (also `success`, `ok`, `paid`). A decline,
an unrecognised reply or no answer within two minutes leaves the sale open and offers **Send again**,
**Set up the terminal again** or **Manual Standalone Card Device Capture**.

Clover, Square, Verifone, Ingenico, PAX, Dejavoo and Stripe terminals only take amounts from software
registered with the maker or the card processor, so a web page cannot push to them directly. Use "Not
connected" with those, or a bridge program supplied for your terminal that translates the message above.

### Receipt printer

Receipts go to the computer's default printer. The page sent to the printer is exactly the receipt: as
wide as the paper roll (80 mm, or 58 mm if you choose it under Devices) and as long as the text, in black
only, with the text kept inside the printable strip. A thermal printer therefore gets no blank half page,
and a print preview shows only the receipt. **Print a test receipt** under Devices lets you check it.

Browsers show a print dialog unless told otherwise. For zero-click printing, make the receipt printer the
computer's default printer and start Chrome like this:

    chrome --kiosk --kiosk-printing https://your-address/checkout_terminal.html

Without the flag, the first print shows the dialog; choose the receipt printer and the browser remembers
it. In the printer's own settings choose its roll paper, not Letter or A4. The owner can switch printing
off for all registers.

## Prices, coupons and tax

- An item's sale price always applies. The regular price is shown struck through in red with the price
  charged beneath it.
- Percentage and dollar coupons apply when the cashier scans or types the code. A dollar coupon comes off
  each matching unit, or once off the whole order when it applies to everything.
- An item sold by weight is priced per lb, kg or oz. The register weighs it and each weighing is its own
  line. A scale that weighs in another unit is converted.
- An item the owner gave no fixed price asks the cashier to type one each time it is scanned. Each price
  typed gets its own line. A barcode scanned into the price box by mistake is rejected.
- Clearance markdowns are always on, and coupons skip clearance items.
- Tax is charged on items the owner marked as taxed, after discounts.

## Customer accounts

No account is asked for when paying by cash or card. **Charge to Account** asks for the account number
(the customer's phone number), with the owner's starting digits, such as an area code, already typed.

- If the number is not on file, the cashier can open an account on the spot, filling in whatever the owner
  chose to ask for. The owner can switch this off. The new account reaches the host like a sale does.
- An account past its due date with a balance is frozen. Nothing more can go on it until the balance is
  collected, which the register offers right there. Cash or card for the sale is always possible.
- **Accounts** at the top looks an account up, shows what is owed, and takes a payment on it.

## Things to know

- Wi-Fi sync needs every computer on the same network with router "client isolation" off, and internet
  for a moment when a page opens or reconnects. Two free public services make the introduction
  (`ntfy.sh` and `api.ipify.org`); prices, sales and customer details never pass through them. This was
  tested with a stand-in for those services on one machine, so try it on your own network first.
- Link a register to its host before it starts trading. Sales made on a never-linked register reach the
  host as history when it joins, but their stock changes do not.
- Scales, serial scanners and serial card devices were tested against simulated devices that follow the
  published protocols, not against real hardware. Check the live reading on the setup screen with your
  own scale before trusting it.
- A network card device or scale bridge must be given as an IP address (for example `192.168.1.45:8080`).
  From an `https://` page Chrome asks once for permission to reach devices on the local network, and
  `ws://` addresses are blocked; they work when the register is opened at `localhost`.
- Device choices are kept in this browser on this computer. Update both apps together: an older Owner
  Manager does not understand accounts opened at a newer register.
- Clearing the browser's site data erases this register's data, including sales not yet sent to the host.
- After replacing these files with a newer version, raise the version number in `sw.js` (for example `v3` to `v4`) so browsers pick up the
  update.
