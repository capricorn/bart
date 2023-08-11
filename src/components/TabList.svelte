<script lang="ts">
    import { onMount } from "svelte";
    import * as _ from "lodash";
    import { Bart } from "src/bart/bart";

    type Tab = chrome.tabs.Tab;

    let tabs: Tab[] = [];
    let selectedTabIds: Set<number> = new Set();
    let metaKeyPressed = false;
    let shiftKeyPressed = false;
    let hoveredTab: Tab = undefined;
    let bartFilterInput = '';

    // TODO: A better default?
    let groupBySelection = "";

    let showTabDomain = false;
    let showTabWindow = false;

    let lastTabSelected: Tab = undefined;
    let tabRegionEnd: Tab = undefined;

    let filteredTabs = tabs;

    function parseAST(input: string): Bart.Parser.FilterCombinator {
        try {
            return Bart.Parser.parse(input);
        } catch (error) {
            return new Bart.Parser.MatchAllFilterCombinator();
        }
    }

    // TODO: Handle parse error
    $: ast = parseAST(bartFilterInput);
    $: console.dir(ast, { depth: null });

    $: {
        console.log('updating filter: ' + groupBySelection);
        console.log(groupBySelection);
        if (groupBySelection == "domain") {
            filteredTabs = filterTabs();
            filteredTabs = filteredTabs;
            console.log(filteredTabs.map(f => new URL(f.url).hostname));
        } else {
            console.log('restoring tabs');
            filteredTabs = tabs;
            filteredTabs = filteredTabs;
            console.log(filteredTabs.map(f => new URL(f.url).hostname));
        }
    }

    $: selections = Array.from(selectedTabIds).sort()
    $: {
        console.log('selections');
        console.log(selectedTabIds);
    }

    function filterTabs(): Tab[] {
        return [...tabs].sort((a,b) => {
            let aHost = new URL(a.url).hostname;
            let bHost = new URL(b.url).hostname;

            if (aHost < bHost) {
                return -1;
            } else if (aHost > bHost) {
                return 1;
            } else {
                return 0;
            }
        })
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
            let relIndex = tabs.map(f => f.id).indexOf(lastTabSelected!.id);
            let tabIndex = tabs.map(f => f.id).indexOf(tab.id);

            let startIndex = Math.min(relIndex, tabIndex);
            let endIndex = Math.max(relIndex, tabIndex);

            console.log('start: ' + startIndex);
            console.log('end: ' + endIndex);

            let selectedTabIdsRegion = Array.from(tabs.entries())
                .filter(val => (val[0] >= startIndex && val[0] <= endIndex))
                .map(f => f[1].id);
            
            // This is the previous tab region spot
            if (tabRegionEnd != undefined) {
                let regionStartIndex = tabs.map(f => f.id).indexOf(lastTabSelected!.id);
                let regionEndIndex = tabs.map(f => f.id).indexOf(tabRegionEnd.id);

                let startIndex = Math.min(regionStartIndex, regionEndIndex);
                let endIndex = Math.max(regionStartIndex, regionEndIndex);

                console.log('prev start: ' + startIndex);
                console.log('prev end: ' + endIndex);

                let prevRegionIds = Array.from(tabs.entries())
                    .filter(val => (val[0] >= startIndex && val[0] <= endIndex))
                    .map(f => f[1].id);

                console.log('Prev region ids: ' + prevRegionIds);

                // Take the intersection
                for (const id of prevRegionIds) {
                    selectedTabIds.delete(id);
                }

            }

            tabRegionEnd = tab;
            selectedTabIds = new Set([...selectedTabIds, ...selectedTabIdsRegion]);
        } else if (selectedTabIds.has(tab.id)) {
            selectedTabIds.delete(tab.id);
            tabRegionEnd = undefined;
        } else {
            tabRegionEnd = undefined;
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
    <div id="control-header">
        <h1>{tabs.length} {tabs.length == 1 ? "Tab" : "Tabs"} | {selectedTabIds.size} selected</h1>
        <div>
            <label for="bart-filter">Filter</label>
            <input type="text" id="bart-filter" bind:value={bartFilterInput}/>
        </div>
        <div>
            <label for="group-select">Group by</label>
            <select name="group-by" id="group-select" bind:value={groupBySelection}>
                <option value="">None</option>
                <option value="domain">Domain</option>
                <option value="window">Window</option>
            </select>
        </div>

        <div id="visual-toggles">
            <h4>Display</h4>
            <label style="display: block">
                <input type="checkbox" bind:checked={showTabDomain} />
                Show domain
            </label>
            <label style="display: block; bottom-padding: 16px">
                <input type="checkbox" bind:checked={showTabWindow} />
                Show window
            </label>
        </div>
        
        <button on:click={closeSelectedTabs}>Close selected</button>
    </div>
    {#each filteredTabs as tab (tab.id)}
        <div class="{hoveredTab?.id == tab.id ? "tab hovered_tab" : "tab"}"
            on:click={() => selectTab(tab)} 
            on:mouseover={() => mouseOverTab(tab)}
            style="background-color: {selectedTabIds.has(tab.id) ? "orange" : "white"}">

            {tab.title}
            <br>
            {#if showTabDomain}
            <span class="tab-link">{tab.url}</span>
            <br>
            {/if}
            {#if showTabWindow}
            <span class="tab-link">Window {tab.windowId}</span>
            {/if}

        </div>
    {/each}
</div>

<style>
    .tab {
        font-size: 24px;
        padding-top: 4px;
        padding-bottom: 4px;
        user-select: none;
    }

    .tab-link {
        font-size: 20px;
        color: gray;
    }

    .hovered_tab {
        text-decoration: underline;
        cursor: pointer;
    }

    #control-header {
        position: sticky;
        top: 0;
        background-color: white;
    }

    #visual-toggles {
        display: block;
        padding-bottom: 16px;
        user-select: none;
    }
</style>