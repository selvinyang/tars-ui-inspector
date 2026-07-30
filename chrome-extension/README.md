# TARS UI Inspector Chrome Collector

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this `chrome-extension` folder.
4. In local TARS UI Inspector, open **采集开发属性** and copy the session ID.
5. Open the page to inspect, select the extension, paste the session ID, and select **采集当前页面**.
6. Return to Inspector and select **检查连接并匹配**.

The extension uses `activeTab`, so page access is granted only after the user invokes the extension on the active tab. It requests host access only to the local Inspector endpoint. It does not request cookie, browsing-history, web-request, or all-sites host permissions.
