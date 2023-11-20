import { storage } from "../storage";

chrome.runtime.onInstalled.addListener(() => {
    storage.get().then(console.log);
});

chrome.action.onClicked.addListener((activeTab) => {
    chrome.tabs.create({url: chrome.runtime.getURL('/src/tablist/tablist.html')});
})

chrome.tabs.onCreated.addListener((tab) => {
    console.log('Opened tab: %o', tab);

    let timestamp = Math.floor(Date.now()/1000);

    let entry = {}
    entry[tab.id+''] = timestamp;

    console.log(`Tab ${tab.id} entry: ${entry}`);
    chrome.storage.local.set(entry);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    // TODO: Remove from db
    chrome.storage.local.remove(tabId+'');
});