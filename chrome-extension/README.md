# TARS UI Inspector Chrome Collector

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this `chrome-extension` folder.
4. In local TARS UI Inspector, open **采集开发属性** and copy the session ID.
5. Open the page to inspect, select the extension, paste the session ID, and select **采集当前页面**. On first use, allow access to the local collector when Chrome prompts.
6. Return to Inspector and select **检查连接并匹配**.

The extension uses `activeTab`, so page access is granted only after the user invokes the extension on the active tab. A capture includes the current visible viewport screenshot plus visible text and component computed styles such as colors, borders, radii, spacing, typography, and bounds. It requests optional host access only to the dedicated receiver at `http://localhost:3001` or `http://127.0.0.1:3001` when capture is used. It does not request cookie, browsing-history, web-request, or all-sites host permissions.

The manifest contains a public key so the unpacked extension keeps the stable ID `mkkmglbjagilaopdopnockajmiafbcdp`. After updating the extension, select **Reload** for it in `chrome://extensions`. Restart `npm run dev` after updating the receiver so both ports `3000` and `3001` are available.
