import { storage } from "../storage";

chrome.runtime.onInstalled.addListener(() => {
    storage.get().then(console.log);
});

chrome.action.onClicked.addListener((activeTab) => {
    chrome.tabs.create({url: chrome.runtime.getURL('/src/tablist/tablist.html')});
})