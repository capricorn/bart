<script lang="ts">
    import { onMount } from "svelte";

    export let x: number;
    export let y: number;

    let menu: HTMLElement;
    let options = [ 'Move', 'Close', 'Clear filter' ];

    let submenu = false;

    let width: number;
    let height: number;

    function handleMenuSelection(option: string) {
        console.log('mouse over menu: ' + option);

        // TODO: Better approach
        if (option == 'Move') {
            submenu = true;
        }
    }

    onMount(() => {
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    })
</script>

<div id="bart-context-menu" bind:this={menu} bind:clientWidth={width} bind:clientHeight={height}>
    {#each options as option}
    <div class="bart-context-menu-option" on:mouseover={() => handleMenuSelection(option)}>{option}</div>
    {/each}
</div>

{#if submenu}
<svelte:self x={x+width} y={y}/>
{/if}

<style>
    #bart-context-menu {
        position: absolute;
        width: 100px;
        border-width: 1px;
        border-color: black;
        border-style: solid;
    }

    .bart-context-menu-option:hover {
        background-color: lightgray;
    }
</style>