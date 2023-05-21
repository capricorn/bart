<script lang='ts'>
    import { onMount } from "svelte";

    let tabs: chrome.tabs.Tab[] = [];

    // TODO: Place in onMount
    async function fetchTabs() {
        tabs = await chrome.tabs.query({});
    }

    onMount(async () => {
        await fetchTabs();
    })
</script>

{#each tabs as tab (tab.id)}
    <p>{tab.title}</p>
{/each}