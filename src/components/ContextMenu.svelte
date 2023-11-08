<script lang="ts">
    import { onMount } from "svelte";
    import { Menu } from "./menu";
    import type { Writable } from "svelte/store";

    export let x: number;
    export let y: number;
    export let displayMenu: Writable<[x: number, y: number]>;

    let menu: HTMLElement;
    // TODO: Convert to array of MenuEntry
    //let options = [ 'Move', 'Close', 'Clear filter' ];
    export let options: Menu.MenuEntry[];

    let submenu: Menu.Menu = undefined;

    let width: number;
    let height: number;

    $: {
        // TODO: Can style be bound within the view?
        if (menu) {
            console.log('Updating menu x/y')
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        }
    }

    // TODO: Rename to make hover clear
    function handleMenuSelection(option: Menu.MenuEntry) {
        console.log('mouse over menu: ' + option);

        // TODO: Will it work?
        /*
        switch (option.entryType) {
            case Menu.MenuEntryType.Submenu:
                break;
            case Menu.MenuEntryType.Command:
                break;
        }
        */

        if (option.entryType == Menu.MenuEntryType.Submenu) {
            submenu = option.action as Menu.Menu;
        }
    }

    function handleMenuClick(option: Menu.MenuEntry) {
        if (option.entryType == Menu.MenuEntryType.Command) {
            let command = option.action as Menu.MenuAction;
            command();
            $displayMenu = undefined;
        }
    }

    onMount(() => {
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    })
</script>

<div id="bart-context-menu" bind:this={menu} bind:clientWidth={width} bind:clientHeight={height}>
    {#each options as option}
    <div class="bart-context-menu-option" on:mouseover={() => handleMenuSelection(option)} on:click={() => handleMenuClick(option)}>
        {option.label}
    </div>
    {/each}
</div>

<!-- TODO: show set submenu -->

{#if submenu}
<svelte:self x={x+width} y={y} displayMenu={displayMenu} options={submenu.entries}/>
{/if}

<style>
    #bart-context-menu {
        position: absolute;
        width: 100px;
        border-width: 1px;
        border-color: black;
        border-style: solid;
        max-height: 300px;
        overflow-y: scroll;
        background-color: white;
    }

    .bart-context-menu-option:hover {
        background-color: lightgray;
    }
</style>