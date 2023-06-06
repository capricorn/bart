<script lang='ts'>
    import { onMount } from "svelte";
    import * as _ from "lodash";

    type Tab = chrome.tabs.Tab;

    let tabs: Tab[] = [];
    let selectedTabIds: Set<number> = new Set();
    let metaKeyPressed = false;
    let shiftKeyPressed = false;
    let hoveredTab: Tab = undefined;

    let lastTabSelected: Tab = undefined;

    $: selections = Array.from(selectedTabIds).sort()
    $: {
        console.log('selections');
        console.log(selectedTabIds);
    }

    function mouseOverTab(tab: Tab) {
        console.log('mouse over tab. meta pressed: ' + metaKeyPressed);
        if (metaKeyPressed || shiftKeyPressed) {
            hoveredTab = tab;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key == 'Meta') {
            console.log('meta down');
            metaKeyPressed = true;
        } else if (event.key == 'Shift') {
            console.log('shift pressed');
            shiftKeyPressed = true;
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        console.log('up: ' + event.key);
        console.log('up: ' + event.metaKey);
        if (event.key == 'Meta') {
            console.log('meta up');
            metaKeyPressed = false;
        } else if (event.key == 'Shift') {
            console.log('shift up');
            shiftKeyPressed = false;
        }

        hoveredTab = undefined;
    }

    // TODO: Place in onMount
    async function fetchTabs() {
        tabs = await chrome.tabs.query({});
    }

    function selectTab(tab: Tab) {
        console.log(selectedTabIds);
        if (metaKeyPressed) {
            console.log('switching to tab');
            chrome.tabs.update(tab.id, { active: true })
            chrome.windows.update(tab.windowId, { focused: true })
        } else if (shiftKeyPressed) {
            console.log('shift select occurring')
            // TODO: Better optional handling?
            let startIndex = tabs.map(f => f.id).indexOf(lastTabSelected!.id);
            let endIndex = tabs.map(f => f.id).indexOf(tab.id);

            let selectedTabIdsRegion = Array.from(tabs.entries())
                .filter(val => (val[0] >= startIndex && val[0] <= endIndex))
                .map(f => f[1].id);
            
            /*
            let tabIdsToRemove = selectedTabIdsRegion.filter(f => selectedTabIds.has(f));

            console.log('tab region: ' + selectedTabIdsRegion);

            selectedTabIds = new Set(_.union(
                _.difference(...selectedTabIds, tabIdsToRemove),
                selectedTabIdsRegion
            ));
            */
            selectedTabIds = new Set([...selectedTabIds, ...selectedTabIdsRegion]);
        } else if (selectedTabIds.has(tab.id)) {
            selectedTabIds.delete(tab.id);
        } else {
            lastTabSelected = tab;
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

    async function closeSelectedTabs() {
        for (const tabId of selectedTabIds) {
            console.log('Closing tab: ' + tabId);
            await chrome.tabs.remove(tabId);
        }

        selectedTabIds = new Set();
        await fetchTabs();
    }

    onMount(async () => {
        await fetchTabs();
    })
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp}/>

<div class="container" >
    <h1>{tabs.length} {tabs.length == 1 ? "Tab" : "Tabs"}</h1>
    <button on:click={closeSelectedTabs}>Close selected</button>
    {#each tabs as tab (tab.id)}
        <div class="{hoveredTab?.id == tab.id ? "tab hovered_tab" : "tab"}"
            on:click={() => selectTab(tab)} 
            on:mouseover={() => mouseOverTab(tab)}
            style="background-color: {selectedTabIds.has(tab.id) ? "orange" : "white"}">{tab.title}</div>
    {/each}
</div>

<style>
    .tab {
        font-size: 24px;
        padding-top: 4px;
        padding-bottom: 4px;
    }

    .hovered_tab {
        text-decoration: underline;
        cursor: pointer;
    }
</style>