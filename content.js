// Basic visual styling for our injected elements
const style = document.createElement('style');
style.textContent = `
  .td-checkbox-container {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 9999;
    background: rgba(0,0,0,0.5);
    padding: 5px;
    border-radius: 4px;
  }
  .td-checkbox {
    transform: scale(1.5);
    cursor: pointer;
  }
  .td-selected {
    border: 2px solid #f4212e !important;
    background-color: rgba(244, 33, 46, 0.05) !important;
  }
`;
document.head.appendChild(style);

// State
let selectedConfigs = new Set();
let isSelecting = false;
// Since DOM nodes disappear/reappear in virtual lists (like Twitter's feed), 
// we simply re-scan often or just handle visible ones. 
// For simplicity V1: We mark visible DOM elements. User scrolls, we mark more. 
// If they scroll away, those nodes might be destroyed by React. 
// Handling virtualized lists perfectly is hard. 
// Approach: We attach a property to the DOM node `dataset.tdId`.

console.log("Tweet Deleter Content Script Loaded");

function getTweetArticles() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
}

function injectCheckboxes() {
    if (!isSelecting) return;
    const tweets = getTweetArticles();
    let newInjections = 0;

    tweets.forEach((tweet, index) => {
        if (tweet.querySelector('.td-checkbox-container')) return; // Already injected

        // Try to find a stable ID or just use memory reference for now
        // Ideally we'd find the tweet ID link

        // Create Checkbox
        const container = document.createElement('div');
        container.className = 'td-checkbox-container';
        container.onclick = (e) => e.stopPropagation(); // Prevent clicking tweet

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'td-checkbox';


        // Check if previously selected (resurrection of virtual node) - skipping complexity for now
        if (tweet.dataset.tdSelected === "true") {
            checkbox.checked = true;
            tweet.classList.add('td-selected');
        }

        checkbox.onchange = (e) => {
            if (e.target.checked) {
                tweet.classList.add('td-selected');
                tweet.dataset.tdSelected = "true";
            } else {
                tweet.classList.remove('td-selected');
                delete tweet.dataset.tdSelected;
            }
            updateCount();
        };

        container.appendChild(checkbox);
        tweet.style.position = 'relative'; // Ensure absolute positioning works relative to this
        tweet.appendChild(container); // Append to article
        newInjections++;
    });

    if (newInjections > 0) console.log(`Injected ${newInjections} checkboxes`);
}

function updateCount() {
    const count = document.querySelectorAll('article[data-testid="tweet"][data-td-selected="true"]').length;
    chrome.runtime.sendMessage({ action: 'UPDATE_COUNT', count: count }).catch(() => { });
}

// Continuous injection observer to handle scrolling
let observer = null;
function startObserver() {
    isSelecting = true;
    if (observer) return;

    injectCheckboxes(); // Initial run

    observer = new MutationObserver(() => {
        injectCheckboxes();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// --- Deletion Logic ---

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deleteSelectedTweets() {
    const selectedTweets = Array.from(document.querySelectorAll('article[data-testid="tweet"][data-td-selected="true"]'));
    const total = selectedTweets.length;
    let deleted = 0;

    console.log(`Starting deletion of ${total} tweets...`);

    for (const tweet of selectedTweets) {
        try {
            // Scroll into view if needed
            tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);

            // 1. Find Caret (More Options)
            const caret = tweet.querySelector('[data-testid="caret"]');
            if (!caret) {
                console.warn("Caret not found for tweet", tweet);
                continue;
            }
            caret.click();
            await sleep(1000 + Math.random() * 500); // Wait for menu

            // 2. Find Delete Menu Item
            // Twitter menus are often in a portal at the end of body usually `[data-testid="Dropdown"]`
            const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
            const deleteItem = menuItems.find(el => el.textContent.includes('Delete'));

            if (!deleteItem) {
                console.warn("Delete option not found in menu (maybe not your tweet?)");
                // Click background to close menu?
                document.body.click();
                await sleep(500);
                continue;
            }
            deleteItem.click();
            await sleep(1000 + Math.random() * 500); // Wait for confirmation dialog

            // 3. Confirm Delete
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
                confirmBtn.click();
                deleted++;
                // Wait for animation/removal
                await sleep(1500 + Math.random() * 1000);
            } else {
                console.warn("Confirmation button not found");
            }

            // Update Popup
            chrome.runtime.sendMessage({
                action: 'DELETION_PROGRESS',
                current: deleted,
                total: total
            }).catch(() => { });

        } catch (err) {
            console.error("Error deleting tweet:", err);
        }
    }

    chrome.runtime.sendMessage({ action: 'DELETION_COMPLETE', count: deleted }).catch(() => { });
    // Cleanup?
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'START_SELECTION') {
        startObserver();
        sendResponse({ status: 'started' });
    } else if (msg.action === 'DELETE_SELECTED') {
        deleteSelectedTweets();
    } else if (msg.action === 'GET_STATUS') {
        const count = document.querySelectorAll('article[data-testid="tweet"][data-td-selected="true"]').length;
        sendResponse({ selecting: isSelecting, count: count });
    }
});
