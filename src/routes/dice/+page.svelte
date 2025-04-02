<script>
    import { onMount } from "svelte";
    import { createScene, resize, rollDice, removeDice, addDice, diceResult } from "$lib/scene.svelte";
    
    let el;
    let container;
    let numOfDice = 3;

    onMount(()=>{
        console.log("onMount triggered.");
        createScene(el, numOfDice);
        window.addEventListener('resize', ()=>{resize(container)});
        window.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                rollDice();
            }
        });
    });
</script>

<div id='main-container' bind:this={container}>
    <canvas bind:this={el}></canvas>
    <div id='text-container'>
        <div>
            Last Roll Score: {$diceResult}
        </div>
        <div>Number of Dices: {numOfDice}</div>
        <div class='bg'>
            <div on:click={removeDice}>-</div>
            <div on:click={rollDice}>Roll</div>
            <div on:click={addDice}>+</div>
        </div>
        
    </div>
</div>

<style>
   @import url('https://fonts.googleapis.com/css2?family=Protest+Riot&display=swap');
    #main-container {
        position: fixed;
        inset: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
    }

    canvas {
        display: block;
        height: 100%;
        width: 100%;
    }

    #text-container {
        font-family: "Protest Riot", sans-serif;
        opacity: 0.7;
        position: absolute;
        bottom: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 24px;
    }

    #text-container > div {
        display: flex;
        flex-direction: row;
        justify-content: center;
    }

    .bg {
        font-size: 5rem;
        gap: 3rem;
        font-weight: 800;
    }

    .bg > * {
        cursor: pointer;
    }
</style>