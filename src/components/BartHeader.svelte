<script lang="ts">
    export let tabs: chrome.tabs.Tab[];
    export let windows: chrome.windows.Window[];
    export let selectedTabs: Set<number>;
    export let filteredTabs: chrome.tabs.Tab[];

    $: totalWindowCount = `${windows.length} Window${windows.length == 1 ? "": "s"}`;
    $: totalTabCount = `${tabs.length} Tab${tabs.length == 1 ? "" : "s"}`;
    $: selectedTabCount = `${selectedTabs.size} selected`;
    $: filteredTabCount = `${filteredTabs.length} filtered`;

</script>


<h1>{totalWindowCount} | {totalTabCount} | {selectedTabCount} | {filteredTabCount}</h1>