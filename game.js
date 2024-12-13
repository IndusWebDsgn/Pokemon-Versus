const pokemonAPI = "https://pokeapi.co/api/v2/pokemon?limit=151";
let allPokemon = [];
let playerPokemon = null;
let enemyPokemon = null;
let round = 1;
const maxRounds = 3;
let playerWins = 0;
let enemyWins = 0;
const sounds = {
    attack: "sounds/attack1.wav",
    roundStart: "sounds/roundStart.mp3",
    winRound: "sounds/winRound.mp3",
    loseRound: "sounds/loseRound.mp3",
    winGame: "sounds/winGame.mp3",
    loseGame: "sounds/youLost.mp3",
};

async function preloadPokemon() {
    try {
        const response = await fetch(pokemonAPI);
        if (!response.ok) throw new Error("Failed to fetch Pokémon list");
        const data = await response.json();

        allPokemon = await Promise.all(
            data.results.map(async (poke) => {
                const details = await fetch(poke.url).then((res) => {
                    if (!res.ok) throw new Error(`Failed to fetch details for ${poke.name}`);
                    return res.json();
                });
                return {
                    name: details.name,
                    img: details.sprites.front_default,
                    abilities: details.abilities.slice(0, 3).map((ab) => ab.ability.name),
                    baseHP: details.stats[0].base_stat * 5,
                    maxHP: details.stats[0].base_stat * 5,
                    baseAttack: details.stats[1].base_stat,
                };
            })
        );

        console.log("All Pokémon preloaded:", allPokemon);
        startGame();
    } catch (error) {
        console.error("Error during Pokémon preloading:", error);
        alert("Failed to load Pokémon. Please try again later.");
    }
}


function showFlashMessage(message) {
    const flashTextElement = document.getElementById("flash-text");
    flashTextElement.textContent = message;
    flashTextElement.classList.add("flash");
    flashTextElement.style.display = "block";

    setTimeout(() => {
        flashTextElement.style.display = "none";
        flashTextElement.classList.remove("flash");
    }, 3000); 
}

function playSound(soundPath) {
    const audio = new Audio(soundPath);
    audio.play().catch((err) => {
        console.warn(`Failed to play sound: ${soundPath}`, err);
    });
}

function playRandomAttackSound() {
    const randomIndex = Math.floor(Math.random() * 6) + 1;
    const soundPath = `sounds/attack${randomIndex}.wav`;
    playSound(soundPath);
}

function startGame() {
    document.getElementById("preload").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    playSound(sounds.roundStart); 
    updateRound();
    chooseEnemyPokemon();
    renderPlayerChoices();
}



function updateRound() {
    document.getElementById("round-info").textContent = `Round ${round}`;
}

function chooseEnemyPokemon() {
    const randomIndex = Math.floor(Math.random() * allPokemon.length);
    enemyPokemon = allPokemon.splice(randomIndex, 1)[0];
    document.getElementById("enemy-img").src = enemyPokemon.img;
    document.getElementById("enemy-name").textContent = enemyPokemon.name;
    updateHealthBar("enemy-health-fill", enemyPokemon.baseHP, enemyPokemon.maxHP);
}

function renderPlayerChoices() {
    const container = document.getElementById("player-choices");
    container.innerHTML = ""; 

    const filteredPokemon = allPokemon.filter((pokemon) => {
        const diff = Math.abs(pokemon.baseAttack - enemyPokemon.baseAttack);
        return diff <= 10; 
    });

    const options = filteredPokemon.slice(0, 6); 
    options.forEach((pokemon, index) => {
        const img = document.createElement("img");
        img.src = pokemon.img;
        img.alt = pokemon.name;
        img.title = pokemon.name;
        img.addEventListener("click", () => selectPlayerPokemon(index, filteredPokemon));
        container.appendChild(img);
    });
}

function selectPlayerPokemon(index, filteredPokemon) {
    playerPokemon = filteredPokemon[index];
    allPokemon = allPokemon.filter((pokemon) => pokemon !== playerPokemon);
    document.getElementById("player-img").src = playerPokemon.img;
    document.getElementById("player-name").textContent = playerPokemon.name;
    updateHealthBar("player-health-fill", playerPokemon.baseHP, playerPokemon.maxHP);
    document.getElementById("player-choices").style.display = "none";
    document.getElementById("battle-area").style.display = "block";
    loadAbilities();
}

function loadAbilities() {
    const abilitiesContainer = document.getElementById("player-abilities");
    abilitiesContainer.innerHTML = ""; 
    playerPokemon.abilities.forEach((ability) => {
        const button = document.createElement("button");
        button.textContent = ability;
        button.addEventListener("click", () => useAbility(ability));
        abilitiesContainer.appendChild(button);
    });
}

function playPokemonCry(pokemonName) {
    const cryPath = `sounds/pokemon-cries/${pokemonName.toLowerCase()}.mp3`;
    const sound = new Audio(cryPath);
    sound.play().catch((err) => {
        console.warn(`Cry for ${pokemonName} not found or failed to play:`, err);
    });
}

function onPokemonChosen(pokemonName, isEnemy = false) {
    console.log(`${pokemonName} chosen by ${isEnemy ? "enemy" : "player"}`);
    playPokemonCry(pokemonName);

    if (isEnemy) {
        document.getElementById("enemy-name").textContent = pokemonName;
    } else {
        document.getElementById("player-name").textContent = pokemonName;
    }
}

function enemyChoosesPokemon() {
    const enemyPokemon = chooseRandomPokemon();
    onPokemonChosen(enemyPokemon, true);
}

function playerChoosesPokemon(pokemonName) {
    onPokemonChosen(pokemonName, false);
}


function useAbility(ability) {
    const damage = calculateDamage(playerPokemon.baseAttack, ability);
    enemyPokemon.baseHP -= damage;
    updateHealthBar("enemy-health-fill", enemyPokemon.baseHP, enemyPokemon.maxHP);
    logAction(`Your ${playerPokemon.name} used ${ability} and dealt ${damage} damage!`);
    playRandomAttackSound();

    if (enemyPokemon.baseHP <= 0) {
        endRound(true);
        return;
    }

    enemyTurn();
}

function enemyTurn() {
    const damage = calculateDamage(enemyPokemon.baseAttack, "Attack");
    playerPokemon.baseHP -= damage;
    updateHealthBar("player-health-fill", playerPokemon.baseHP, playerPokemon.maxHP);
    logAction(`Enemy ${enemyPokemon.name} attacked and dealt ${damage} damage!`);
    playRandomAttackSound();

    if (playerPokemon.baseHP <= 0) {
        endRound(false);
    }
}
function calculateDamage(baseAttack, ability) {
    const multiplier = ability === "Attack" ? 1 : 1.5; 
    return Math.floor(baseAttack * multiplier * (0.2 + Math.random() * 0.3));
}

function updateHealthBar(barId, currentHP, maxHP) {
    const healthBar = document.getElementById(barId);
    const healthPercentage = Math.max((currentHP / maxHP) * 100, 0);
    healthBar.style.width = `${healthPercentage}%`;
}

function logAction(action) {
    const log = document.getElementById("battle-log");
    const entry = document.createElement("p");
    entry.textContent = action;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function endRound(playerWon) {
    if (playerWon) {
        playerWins++;
        showFlashMessage("You won this round!");
        playSound(sounds.winRound);
    } else {
        enemyWins++;
        showFlashMessage("You lost this round.");
        playSound(sounds.loseRound);
    }

    if (round >= maxRounds) {
        endGame(); 
        return;
    }

    round++;
    resetRound();
}

function resetRound() {
    document.getElementById("player-choices").style.display = "block";
    document.getElementById("battle-area").style.display = "none";
    playSound(sounds.roundStart);
    updateRound();
    chooseEnemyPokemon();
    renderPlayerChoices();
}

function endGame() {
    if (playerWins >= 2) {
        showFlashMessage("Congratulations! You won the game!");
        playSound(sounds.winGame);
    } else {
        showFlashMessage("You lost the game. Better luck next time!");
        playSound(sounds.loseGame); 
    }
    setTimeout(() => {
        location.reload();
    }, 3000); 
}

preloadPokemon();