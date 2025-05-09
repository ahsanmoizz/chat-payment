// tests/app.e2e.spec.js
import { test, expect } from '@playwright/test';

test.describe('App E2E Tests', () => {
  test('should load the chat window and display call components', async ({ page }) => {
    // Navigate to your app (adjust the URL as needed)
    await page.goto('http://localhost:3000');

    // Example: Wait for the ChatWindow component to be visible
    // This selector should target an element from your ChatWindow component
    const chatWindow = await page.locator('.chat-window-container');
    await expect(chatWindow).toBeVisible();

    // Simulate clicking the call button (adjust selector based on your UI)
    const callButton = page.locator('button', { hasText: /Call/i });
    await callButton.click();

    // Wait for the call modal to appear
    const callModal = page.locator('.call-modal-container');
    await expect(callModal).toBeVisible();

    // Optionally, you could click on the "End Call" button to simulate ending the call.
    const endCallButton = page.locator('button', { hasText: /End Call/i });
    await expect(endCallButton).toBeVisible();

    // Simulate clicking "End Call" and wait for modal to close
    await endCallButton.click();
    await expect(callModal).toBeHidden();
  });

  test('should display call logs correctly', async ({ page }) => {
    // Navigate to a page or route that displays the call logs component.
    await page.goto('http://localhost:3000/call-logs');

    // Wait for the CallLogs title to appear
    const title = page.locator('h2', { hasText: /Call Logs/i });
    await expect(title).toBeVisible();

    // Verify that either a log is displayed or the "No call logs available" message appears.
    const noLogsMessage = page.locator('p', { hasText: /No call logs available/i });
    const logItem = page.locator('li'); // assuming each log is rendered as an <li> element

    // At least one of these should be visible
    await expect(noLogsMessage.or(logItem)).toBeVisible();
  });
});
