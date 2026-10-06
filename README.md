# Checkout Terminal

The register screen for a grocery shop: scan items, apply sale prices and coupons, take cash, card or
"charge to account" payments, and print receipts. It runs in the browser, keeps working with no internet,
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

Double-clicking the file works for a quick look, but browsers only allow the offline cache and app install
from `localhost` or HTTPS.

## Give it the shop's data

A new register is empty. There are two ways to load it.

**Over Wi-Fi (the owner has switched on Wi-Fi sync in the Owner Manager)**

1. Open the register. It asks for its host and lists the hosts it can see by name.
2. Pick your shop. If none is listed, type the host code from the owner's Settings screen.
3. The owner presses **Allow** on their computer when both screens show the same 4-digit code.

The register loads everything and from then on sends each sale to the host and picks up changes by
itself. If the host or the Wi-Fi is down it keeps selling and shows how many sales are waiting.

**With a file**

Drag the `inventory_db.json` exported from the Owner Manager onto the register screen and enter the owner
PIN. The register warns you if the file is older than what it already has.

If the Owner Manager runs in the same browser at the same address (see its README), the register shares
its data directly and needs neither step.

## Keys

| Key | Action |
|---|---|
| F2 / F3 / F4 | Pay cash / Card / Charge to Account |
| Alt+Shift+H | Owner: choose or change this register's host (PIN) |
| Alt+Shift+D | Owner: change which card device this register uses (PIN) |
| Alt+Shift+E | Owner: export this register's data to a file (PIN) |

There are no visible admin controls. Typing always goes to the scanner box unless the phone field or a
dialog is open, so a USB or Bluetooth scanner in keyboard mode works without clicking anywhere.

## Prices, coupons and tax

- An item's sale price always applies. The regular price is shown struck through in red with the price
  charged beneath it.
- Percentage and dollar coupons apply when the cashier scans or types the code. A dollar coupon comes off
  each matching unit, or once off the whole order when it applies to everything.
- Clearance markdowns are always on, and coupons skip clearance items.
- Tax is charged on items the owner marked as taxed, after discounts.

## Customer accounts

Type the customer's phone number in the account field and press Enter. **Charge to Account** appears when
the owner allows credit. An account that is past its due date with a balance is frozen: the sale is locked
until the balance is collected with **Collect balance**, or the customer is removed from the sale and pays
another way.

## Receipt printing with no clicks

Browsers show a print dialog unless told otherwise. For zero-click printing, make the receipt printer the
computer's default printer and start Chrome like this:

    chrome --kiosk --kiosk-printing http://localhost:8000/checkout_terminal.html

Without the flag, the first print shows the dialog; choose the receipt printer and the browser remembers
it. Receipts are laid out for 80 mm paper. The owner can switch printing off for all registers.

## Card devices

The first card sale asks which of the owner's device profiles this register uses and remembers it. The
register then sends the amount and waits up to two minutes:

    { "type": "sale", "amount": "24.18", "amount_cents": 2418,
      "currency": "USD", "reference": "SALE-ID", "station": "REG-AB12" }

- A LAN address such as `110.12.0.45:8080/v2/sale` gets an HTTP POST; a `ws://` address gets a WebSocket
  message; a serial profile gets one line on the port chosen on this register (Chrome or Edge only; the
  serial path has not been tried with a real device).
- The sale completes only on a reply whose `status` is `approved` (also `success`, `ok`, `paid`). A
  decline, an unrecognised reply or no answer leaves the sale open and offers **Send again** or
  **Manual Standalone Card Device Capture**.

Clover, Verifone, Ingenico, PAX and Square terminals speak their makers' own protocols and will not answer
this message directly. Each needs a small bridge program on the LAN that translates and allows
cross-origin requests. Until you have one, switch on **Manual Standalone Card Device Capture** and key
amounts on the device.

## Things to know

- Wi-Fi sync needs every computer on the same network with router "client isolation" off, and internet
  for a moment when a page opens or reconnects. Two free public services make the introduction
  (`ntfy.sh` and `api.ipify.org`); prices, sales and customer details never pass through them. This was
  tested with a stand-in for those services on one machine, so try it on your own network first.
- Link a register to its host before it starts trading. Sales made on a never-linked register reach the
  host as history when it joins, but their stock changes do not.
- Clearing the browser's site data erases this register's data, including sales not yet sent to the host.
- After replacing these files with a newer version, change `v1` in `sw.js` to `v2` so browsers pick up the
  update.
