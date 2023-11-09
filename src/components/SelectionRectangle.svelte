<script lang="ts">
    // TODO: Simplify?
    export let tabSelectLeftPx: number;
    export let tabSelectTopPx: number;
    export let tabSelectRegionWidth: number;
    export let tabSelectRegionHeight: number;

    // TODO: Computed var -- compute style
</script>

<div id="tab-selection-div" style="left: {tabSelectLeftPx}px; top: {tabSelectTopPx}px; width: {tabSelectRegionWidth}px; height: {tabSelectRegionHeight}px;"></div>

<style>
    #tab-selection-div {
        background: gray;
        opacity: 0.25;
        position: absolute;
    }
</style>