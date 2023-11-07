<script lang="ts">
    import { onMount } from "svelte";

    export let x: number;
    export let y: number;

    let menu: HTMLElement;

    onMount(() => {
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    })
</script>

<div id="bart-context-menu" bind:this={menu}>
</div>

<style>
    #bart-context-menu {
        position: absolute;
        width: 100px;
        height: 100px;
        background-color: black;
    }
</style>