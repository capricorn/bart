<script lang="ts">
    export let startCoord: [x: number, y: number];
    export let endCoord: [x: number, y: number];

    $: leftPx = Math.min(startCoord[0], endCoord[0]);
    $: topPx = Math.min(startCoord[1], endCoord[1]);

    $: width = Math.abs(startCoord[0] - endCoord[0]);
    $: height = Math.abs(startCoord[1] - endCoord[1]);
</script>

<div id="tab-selection-div" style="left: {leftPx}px; top: {topPx}px; width: {width}px; height: {height}px;"></div>

<style>
    #tab-selection-div {
        background: gray;
        opacity: 0.25;
        position: absolute;
    }
</style>