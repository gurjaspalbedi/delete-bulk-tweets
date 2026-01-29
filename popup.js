document.addEventListener('DOMContentLoaded', () => {
    const selectBtn = document.getElementById('select-mode-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const countArea = document.getElementById('count-area');
    const countSpan = document.getElementById('selected-count');
    const statusDiv = document.getElementById('status');

    // Helper to send message to active tab
    async function sendMessageToTab(message) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                statusDiv.textContent = "No active tab found.";
                return;
            }

            // Ensure content script is ready (simple error handling)
            try {
                const response = await chrome.tabs.sendMessage(tab.id, message);
                return response;
            } catch (e) {
                // If content script isn't loaded, we might need to inject it or warn user 
                // (in MV3 regular content_scripts in manifest usually load automatically)
                statusDiv.textContent = "Error: Refresh the page.";
                console.error(e);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Check status on load
    async function checkStatus() {
        // We use tabs.sendMessage directly here to get a return value
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (response) => {
                // Ignore weird specific hydration errors that happen in chrome extensions sometimes
                if (chrome.runtime.lastError) {
                    // Content script likely not injected yet or page fresh
                    return;
                }

                if (response && response.selecting) {
                    selectBtn.style.display = 'none';
                    countArea.style.display = 'block';
                    deleteBtn.style.display = 'block';
                    countSpan.textContent = response.count;
                    statusDiv.textContent = "Selection active.";
                }
            });
        } catch (e) { console.error(e); }
    }
    checkStatus();

    selectBtn.addEventListener('click', async () => {
        statusDiv.textContent = "Injecting checkboxes...";
        await sendMessageToTab({ action: 'START_SELECTION' });
        selectBtn.style.display = 'none';
        countArea.style.display = 'block';
        deleteBtn.style.display = 'block';
        statusDiv.textContent = "Select tweets to delete.";
    });

    deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm("Are you sure you want to PERMANENTLY delete the selected tweets?");
        if (confirmed) {
            statusDiv.textContent = "Deleting...";
            deleteBtn.disabled = true;
            await sendMessageToTab({ action: 'DELETE_SELECTED' });
        }
    });

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'UPDATE_COUNT') {
            countSpan.textContent = message.count;
        } else if (message.action === 'DELETION_COMPLETE') {
            statusDiv.textContent = `Done! Deleted ${message.count} tweets.`;
            deleteBtn.disabled = false;
            countSpan.textContent = '0';
        } else if (message.action === 'DELETION_PROGRESS') {
            statusDiv.textContent = `Deleted ${message.current} of ${message.total}...`;
        }
    });
});
