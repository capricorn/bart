import TabList from "../components/TabList.svelte";

const target = document.getElementById("app");

function render() {
    new TabList({ target });
}

document.addEventListener("DOMContentLoaded", render);