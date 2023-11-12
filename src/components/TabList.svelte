<script lang="ts">
    import { onMount } from "svelte";
    import * as _ from "lodash";
    import { Bart } from "src/bart/bart";
    import BartHeader from "./BartHeader.svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import { Menu } from "./menu";
    import { writable } from "svelte/store";
    import SelectionRectangle from "./SelectionRectangle.svelte";

    type Tab = chrome.tabs.Tab;
    type Window = chrome.windows.Window;

    let tabs: Tab[] = [];
    let windows: Window[] = [];
    let selectedTabIds: Set<number> = new Set();
    let metaKeyPressed = false;
    let shiftKeyPressed = false;
    let hoveredTab: Tab = undefined;
    let bartFilterInput = '';
    let inputCursorPosition = 0;

    // TODO: A better default?
    let groupBySelection = "none";
    let groupModifier: Bart.Parser.GroupModifier = Bart.Parser.GroupModifier.none;

    let showTabDomain = false;
    let showTabWindow = false;

    let lastTabSelected: Tab = undefined;
    let tabRegionEnd: Tab = undefined;

    let filteredTabs = tabs;
    let bartContext: Bart.TabContext = undefined;
    let displayContextMenu = writable(undefined);

    // The initial (x,y) of where the selection rectangle started
    let tabSelectStartCoord: [x: number, y: number] = undefined;
    // The opposite (x,y) corner of the selection rectangle -- current (or final) mouse location.
    let tabSelectEndCoord: [x: number, y: number] = undefined;

    $: cursorStyle = (() => { 
        if (tabSelectStartCoord) {
            return "cursor: crosshair;"
        }

        return "cursor: auto;"
    })();

    enum MouseButtonState {
        up,
        down
    }

    // TODO: Update in window mouse events
    let mouseState: [left: MouseButtonState, right: MouseButtonState] = [MouseButtonState.down, MouseButtonState.down];

    function debounce(debounceTime: number, guard: () => boolean, action: () => void) {
        setTimeout(() => {
            if (guard()) {
                action();
            }
        }, debounceTime);
    }

    // TODO: Find approach that still supports typechecking
    DOMRect.prototype['overlap'] = function (rect: DOMRect): boolean {
        let selectMinX = Math.min(this.left, this.right);
        let selectMinY = Math.min(this.top, this.bottom);
        let selectMaxX = Math.max(this.left, this.right);
        let selectMaxY = Math.max(this.top, this.bottom);

        let yOverlap = (rect.top >= selectMinY && rect.bottom <= selectMaxY)    // contained within
            || (selectMaxY >= rect.top && selectMaxY <= rect.bottom)    // select from top
            || (selectMinY >= rect.bottom && selectMinY <= rect.top);     // select from bottom

        let xOverlap = (rect.left >= selectMinX && rect.right <= selectMaxX)    // contained within
            || (selectMaxX >= rect.left && selectMaxX <= rect.right)    // select from left
            || (selectMinX >= rect.left && selectMinX <= rect.right);     // select from right

        return xOverlap && yOverlap;
    }

    $: tabSelectRect = (() => {
        if (tabSelectStartCoord == undefined || tabSelectEndCoord == undefined) {
            return undefined;
        }

        let x = Math.min(tabSelectStartCoord[0], tabSelectEndCoord[0]);
        let y = Math.min(tabSelectStartCoord[1], tabSelectEndCoord[1]);
        let width = Math.abs(tabSelectStartCoord[0] - tabSelectEndCoord[0]);
        let height = Math.abs(tabSelectStartCoord[1] - tabSelectEndCoord[1]);

        return new DOMRect(x, y, width, height);
    })();

    $: {
        console.log('Group selection: ' + groupBySelection);
        groupModifier = new Bart.Parser.GroupModifier(groupBySelection);
    }

    $: {
        if (bartContext) {
            bartContext.selectedTabIds = selectedTabIds;
        }
    }

    let lastSlotHTML: string = '<span id="bart-filter-last-slot">_</span>';

    function handleContainerMouseUp(event: MouseEvent) {
        if (event.button == 0) {
            mouseState[0] = MouseButtonState.up;
        } else if (event.button == 1) {
            mouseState[1] = MouseButtonState.up;
        }

        // Indicates that a tab selection region is being drawn
        if (tabSelectStartCoord) {
            // TODO: Filter out tabs that are not currently in the viewport.
            let tabs = document.getElementsByClassName('tab');

            for (const tab of tabs) {
                // TODO: Skip aside from filtered tabs
                // TODO: Ony iterate tabs in viewport
                // TODO: Live highlight?
                let rect = tab.getBoundingClientRect();

                if (tabSelectRect['overlap'](rect)) {
                    let tabId = tab.id.replace('tab-', '');
                    console.log(tab.id + '/ overlap: '+tabId);
                    selectedTabIds.add(Number(tabId));
                    selectedTabIds = new Set(selectedTabIds);
                }
            }

            tabSelectStartCoord = undefined;
            tabSelectEndCoord = undefined;
        }
    }

    function handleContainerMouseDown(event: MouseEvent) {
        if (event.button == 0) {
            mouseState[0] = MouseButtonState.down;
        } else if (event.button == 1) {
            mouseState[1] = MouseButtonState.down;
        }

        event.preventDefault();
        console.log('mouse event down: ' + event);
        if (event.button != 0) {
            return;
        }

        console.log('mouse down event');
        debounce(300, () => { return mouseState[0] == MouseButtonState.down }, () => {
            tabSelectStartCoord = [event.clientX, event.clientY];
        });
    }

    function handleContainerMouseMove(event: MouseEvent) {
        event.preventDefault();
        console.log('mouse move: ' + event);
        // Indicates that a tab selection region is being drawn
        if (tabSelectStartCoord) {
            tabSelectEndCoord = [event.clientX, event.clientY];
        }
    }

    function globalClickHandler(event: MouseEvent) {
        // Left-click closes any open context menu
        if (event.button == 0) {
            $displayContextMenu = undefined;
        }
    }

    function buildContextMenuOptions(): Menu.MenuEntry[] {
        let windowCommands: Menu.MenuEntry[] = Array.from(new Set(filteredTabs.map(tab => { return tab.windowId })))
            .map((winId) => {
                return new Menu.MenuEntry(Menu.MenuEntryType.Command, winId+'', () => {
                    // Move the selected tabs
                    chrome.tabs.move(Array.from(selectedTabIds), { index: -1, windowId: winId });
                })
            })

        let moveNewWindowCommand = new Menu.MenuEntry(Menu.MenuEntryType.Command, 'New window', () => {
            if (selectedTabIds.size < 1) {
                return;
            }

            let selectedTabs = Array.from(selectedTabIds);

            chrome.windows.create({focused: true, tabId: selectedTabs[0]}).then(newWin => {
                chrome.tabs.move(selectedTabs.slice(1), { index: -1, windowId: newWin.id });
            })
        });

        return [
            // TODO: Access?
            new Menu.MenuEntry(Menu.MenuEntryType.Submenu, 'Move', 
                // TODO: Populate with windows from tabs (just by window id)
                new Menu.Menu([ moveNewWindowCommand, ...windowCommands])
            ),
            new Menu.MenuEntry(Menu.MenuEntryType.Command, 'Clear selected', () => {
                selectedTabIds = new Set();
            })
        ]
    }

    function selectedContextMenu(e: MouseEvent) {
        console.log('opening context menu');
        e.preventDefault();

        console.log(e);
        let x = e.clientX;
        let y = e.clientY;

        $displayContextMenu = [x,y];
    }

    function focusFilter() {
        console.log('Focusing filter div');
        let element = document.getElementById('bart-filter');
        element.focus({focusVisible: true});
    }

    function handleCursorTap(element: Element) {
        console.log('tapped filter element');
        console.log(element);

        // Underline the current selection
        for (const e of document.getElementsByClassName('bart-filter-char')) {
            (e as HTMLElement).style.textDecoration = '';
        }

        let lastSlotElement = document.getElementById('bart-filter-last-slot') as HTMLElement;

        // TODO: Handle case of 'last' element
        if (element.id == 'bart-filter-last-slot') {
            inputCursorPosition = bartFilterInput.length;
            lastSlotElement.style.opacity = '1.0';
            console.log('tapped last filter slot');
        } else {
            let elementId: number = parseInt(element.id.match(/\d+/)[0]);
            inputCursorPosition = elementId;
            (element as HTMLElement).style.textDecoration = 'underline';
            lastSlotElement.style.opacity = '0.0';
        }
    }

    async function executeBartCommand() {
        await ast.execute(filteredTabs);
    }

    function parseAST(input: string): Bart.Parser.Command {
        try {
            return Bart.Parser.parse(input, bartContext);
        } catch (error) {
            console.log('Failed to parse AST');
            return Bart.Parser.Command.noop();
            //return new Bart.Parser.MatchAllFilterCombinator();
        }
    }

    let ast: Bart.Parser.Command = Bart.Parser.Command.noop();
    let groupedFilteredTabs: Record<string, Tab[]> = {};

    async function filterTabs() {
        let filter = ast.filter.filter();

        //filteredTabs = tabs.filter(async tab => await filter(tab, bartContext));
        // TODO: Async filter options? (Promise.all() etc?)
        let displayedTabs = [];
        for (const tab of tabs) {
            if (await filter(tab, bartContext)) {
                displayedTabs.push(tab);
            }
        }

        filteredTabs = displayedTabs;
        console.log('Filter count: ' + displayedTabs.length);
    }

    // TODO: Handle parse error
    $: ast = (groupBySelection == 'none') ? parseAST(bartFilterInput) : parseAST(bartFilterInput).modifier(groupModifier);
    $: console.dir(ast, { depth: null });
    $: {
        console.dir(ast, { depth: null })
        filterTabs();
        /*
        for (const tab of tabs) {
            console.log('"google.com"'.includes(tab['url']));
        }
        */
        //filteredTabs = tabs.filter(tab => filter(tab, bartContext));

        //console.log('group modifier:');
        //console.log(ast.groupModifier.group(filteredTabs));
    }

    $: groupedFilteredTabs = ast.groupModifier.group(filteredTabs);
    $: {
        // Update underline when input cursor position changes
        for (const e of document.getElementsByClassName('bart-filter-char')) {
            (e as HTMLElement).style.textDecoration = '';
        }

        let elementId = (inputCursorPosition == bartFilterInput.length) ? 'bart-filter-last-slot' : `bart-filter-char-${inputCursorPosition}`;
        let element = document.getElementById(elementId);

        if (element != null && elementId != 'bart-filter-last-slot') {
            element.style.textDecoration = 'underline';
        }

        /*
        if (element.id == 'bart-filter-last-slot') {
            inputCursorPosition = bartFilterInput.length;
            lastSlotElement.style.opacity = '1.0';
            console.log('tapped last filter slot');
        } else {
            let elementId: number = parseInt(element.id.match(/\d+/)[0]);
            inputCursorPosition = elementId;
            (element as HTMLElement).style.textDecoration = 'underline';
            lastSlotElement.style.opacity = '0.0';
        }
        */
    }

    $: {
        if (bartFilterInput.length > 0) {
            // Is this in order?
            let inputElements = document.getElementsByClassName('bart-filter-char');
            console.log(`Updating ${inputElements.length} filter input listeners`);
            for (const e of inputElements) {
                e.addEventListener('click', () => handleCursorTap(e));
            }

            let lastInputSlot = document.getElementById('bart-filter-last-slot')
            lastInputSlot.addEventListener('click', () => handleCursorTap(lastInputSlot));
        }
    }

    /*
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
    */

    $: selections = Array.from(selectedTabIds).sort()
    $: {
        console.log('selections');
        console.log(selectedTabIds);
    }

    /*
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
    */

    function mouseOverTab(tab: Tab) {
        console.log('mouse over tab. meta pressed: ' + metaKeyPressed);
        if (metaKeyPressed || shiftKeyPressed) {
            hoveredTab = tab;
        }
    }

    function handleFilterInput(event: KeyboardEvent) {
        console.log('receive filter input: ' + event);

        // TODO: Accept printable characters; handle other cases
        let controlKeys = ['Shift', 'Meta', 'Control', 'Alt', 'Escape'];
        if (controlKeys.includes(event.key)) {
            return;
        }

        if (event.key == 'Backspace') {
            // When selecting a position, delete char to the left.
            bartFilterInput = bartFilterInput.slice(0, Math.max(0, inputCursorPosition-1)) + bartFilterInput.slice(inputCursorPosition);
            inputCursorPosition = Math.max(0, inputCursorPosition-1);
        } else if (event.key == 'ArrowLeft') {
            inputCursorPosition = Math.max(0, inputCursorPosition-1);
        } else if (event.key == 'ArrowRight') {
            inputCursorPosition = Math.min(inputCursorPosition+1, bartFilterInput.length);
        } else {
            // TODO: Does this handle shift correctly..?
            bartFilterInput = bartFilterInput.slice(0, inputCursorPosition) + event.key + bartFilterInput.slice(inputCursorPosition)
            inputCursorPosition += 1;
        }

        let filterDiv = document.getElementById('bart-filter');
        filterDiv.innerHTML = '<span>bart> </span>' + Bart.Lexer.highlight(bartFilterInput) + lastSlotHTML;

        document.getElementById('bart-filter-last-slot').style.opacity = (inputCursorPosition == bartFilterInput.length) ? '1.0' : '0.0';
        console.log('filter input: ' + bartFilterInput);
    }

    function handleKeyDown(event: KeyboardEvent) {
        let focusedElement = window.document.activeElement;
        console.log(focusedElement);

        console.log('key down: ' + event.key);
        if (tabSelectStartCoord && event.key == 'Escape') {
            // Cancel tab selection 
            tabSelectStartCoord = undefined;
            tabSelectEndCoord = undefined;
            return;
        }

        if (focusedElement.id == "bart-filter") {
            handleFilterInput(event);
        } else {
            if (event.key == 'Meta') {
                console.log('meta down');
                metaKeyPressed = true;
            } else if (event.key == 'Shift') {
                console.log('shift pressed');
                shiftKeyPressed = true;
            }
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

    async function fetchWindows() {
        windows = await chrome.windows.getAll({});
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
        await fetchWindows();
    }

    onMount(async () => {
        console.log('mount');
        bartContext = new Bart.TabContext();

        let filterDiv = document.getElementById('bart-filter');
        filterDiv.innerHTML = '<span>bart> </span>' + lastSlotHTML;

        await fetchTabs();
        await fetchWindows();
        await filterTabs();

        let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        bartContext.currentWindowId = tab.windowId;
        bartContext.storage = new Bart.ChromeLocalStorage();

        focusFilter();
    })
</script>

<svelte:window 
    on:keydown={handleKeyDown} 
    on:keyup={handleKeyUp} 
    on:contextmenu={(e)=>selectedContextMenu(e)} 
    on:click={globalClickHandler} 
    on:mousedown={handleContainerMouseDown} 
    on:mouseup={handleContainerMouseUp}
    on:mousemove={handleContainerMouseMove}/>

<div class="container" style={cursorStyle}>
    <div id="control-header">
        <BartHeader tabs={tabs} windows={windows} selectedTabs={selectedTabIds} filteredTabs={filteredTabs}/>
        <div>
            <label for="bart-filter">Filter</label>
            <div id="bart-filter" on:click={focusFilter} tabindex="0"></div>
            <button id="bart-execute-button" on:click={executeBartCommand}>Execute</button>
        </div>
        <div id="bart-prettyprint">
            <!-- {@html ast.print()} -->
            {@html Bart.Lexer.highlight(bartFilterInput)}
        </div>
        <div>
            <label for="group-select">Group by</label>
            <select name="group-by" id="group-select" bind:value={groupBySelection}>
                <option value="none">None</option>
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
    {#if ast.groupModifier.modifier == 'none'}
        {#each filteredTabs as tab (tab.id)}
            <div id="tab-{tab.id}" class="{hoveredTab?.id == tab.id ? "tab hovered_tab" : "tab"}"
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
    {:else}
        {#each Object.keys(groupedFilteredTabs) as groupKey}
            <h1>{groupKey} ({groupedFilteredTabs[groupKey].length})</h1>
            {#each groupedFilteredTabs[groupKey] as tab (tab.id) }
                <div id="tab-{tab.id}" class="{hoveredTab?.id == tab.id ? "tab hovered_tab" : "tab"}"
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
            <!--
            {#each groupedFilteredTabs.groupKey as tab (tab.id)}
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
            -->
        {/each}
    {/if}
</div>

{#if $displayContextMenu }
<ContextMenu x={$displayContextMenu[0]} y={$displayContextMenu[1]} displayMenu={displayContextMenu} options={buildContextMenuOptions()}/>
{/if}

{#if tabSelectStartCoord != undefined && tabSelectEndCoord != undefined}
<SelectionRectangle startCoord={tabSelectStartCoord} endCoord={tabSelectEndCoord}/>
{/if}

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

    #bart-filter {
        width: 250px;
        height: 20px;
        font-family: monospace;
        font-size: 16px;
        display: inline-block;

        border-width: 1px;
        border-style: solid;

        white-space: pre;
    }

    #bart-filter:focus {
        border: none;
    }


    /* Prettyprint styling */
    #bart-prettyprint {
        font-family: monospace;
        font-size: 16px;
    }

    :global(.bart-filter) {
        color: purple;
    }

    :global(.bart-combinator) {
        color: orange;
    }

    :global(.bart-string) {
        color: green;
    }

    :global(.bart-command) {
        color: red;
    }

    :global(.bart-group-modifier) {
        color: blue;
    }

    :global(.bart-macro) {
        color: gray;
    }
</style>