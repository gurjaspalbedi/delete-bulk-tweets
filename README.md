# Tweet Deleter Chrome Extension

A simple Chrome Extension to Selectively delete tweets from X.com (formerly Twitter).

## Features
- **Manual Selection**: Select specific tweets to delete using checkboxes.
- **Bulk Deletion**: Delete all selected tweets with one click.
- **Safe Automation**: Simulates user clicks to avoid account flagging (no direct API calls).

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top-right corner).
4.  Click **Load unpacked**.
5.  Select the `tweet-deleter` directory.

## Usage

1.  Navigate to your X.com profile (e.g., `https://x.com/your_username`).
2.  Click the **Tweet Deleter** extension icon in your toolbar.
3.  Click **"Start Selection Mode"**.
    - Checkboxes will appear on your tweets.
4.  Select the tweets you want to remove.
5.  Open the extension popup again and click **"Delete Selected"**.
6.  **Wait** for the process to finish. Do not interact with the page while deletion is in progress.

## Disclaimer
This tool automates user actions. Use responsibly. The author is not responsible for any account issues.
