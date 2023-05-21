<script lang='ts'>
    import { onMount } from "svelte";

    type Tab = chrome.tabs.Tab;

    let tabs: Tab[] = [];
    let selectedTabIds: Set<number> = new Set();

    $: selections = Array.from(selectedTabIds).sort()
    $: {
        console.log('selections');
        console.log(selectedTabIds);
    }

    // TODO: Place in onMount
    async function fetchTabs() {
        tabs = await chrome.tabs.query({});
    }

    function selectTab(tab: Tab) {
        console.log(selectedTabIds);
        if (selectedTabIds.has(tab.id)) {
            selectedTabIds.delete(tab.id);
        } else {
            selectedTabIds.add(tab.id);
        }

        selectedTabIds = new Set(selectedTabIds);
    }

    function tabBackgroundColor(tab: Tab): String {
        if (selectedTabIds.has(tab.id)) {
            return "orange";
        } else {
            return "white";
        }
    }

    function closeSelectedTabs() {
        for (const tabId of selectedTabIds) {
            console.log('Closing tab: ' + tabId);
            chrome.tabs.remove(tabId);
        }

        selectedTabIds = new Set();
        tabs = [];
        // WIP: Reloading tab list after deletion 
        fetchTabs().then(() => console.log('Reloaded tab list.'));
    }

    onMount(async () => {
        await fetchTabs();
    })
</script>

<div class="container">
    <button on:click={closeSelectedTabs}>Close selected</button>
    {#each tabs as tab (tab.id)}
        <div class="tab" on:click={() => selectTab(tab)} style="background-color: {selectedTabIds.has(tab.id) ? "orange" : "white"}">{tab.title}</div>
    {/each}
</div>