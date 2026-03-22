/**
 * SipQuest - Main Application Logic
 */

const VoiceEngine = {
    synth: window.speechSynthesis,
    voice: null,
    init() {
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.ensureVoice(true);
        }
        this.ensureVoice();
    },
    ensureVoice(force = false) {
        if (!this.synth) return;
        if (this.voice && !force) return;
        
        const voices = this.synth.getVoices();
        if (voices.length === 0) return;
        
        // Strictly prioritize Australian Female "Natural" voices for high quality and sultry tones
        let targetVoice = voices.find(v => 
            v.name.toLowerCase().includes('natural') && (v.lang.toLowerCase().includes('en-au') || v.lang.toLowerCase().includes('en_au')) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natasha') || v.name.toLowerCase().includes('annette'))
        ) ||
        voices.find(v => 
            (v.lang.toLowerCase().includes('en-au') || v.lang.toLowerCase().includes('en_au')) && 
            (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natasha') || v.name.toLowerCase().includes('annette'))
        ) || 
        // Fallback to UK Natural Female if AU female is entirely missing
        voices.find(v => 
            v.name.toLowerCase().includes('natural') && v.lang.toLowerCase().includes('en-gb') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('sonia') || v.name.toLowerCase().includes('libby'))
        ) ||
        // Final fallback: US Natural Female
        voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.toLowerCase().includes('en-us') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('aria') || v.name.toLowerCase().includes('jenny'))) ||
        // If absolutely no Natural voices, any English female
        voices.find(v => v.lang.toLowerCase().includes('en-') && v.name.toLowerCase().includes('female'));
                        
        this.voice = targetVoice || voices[0];
        console.log("SipQuest TTS Bound:", this.voice ? this.voice.name : "System Default");
    },
    speak(text, queue = false) {
        if (!this.synth) return;
        this.ensureVoice();
        
        if (this.synth.speaking && !queue) {
            this.synth.cancel();
        }
        if (text) {
            const utterThis = new SpeechSynthesisUtterance(text);
            if (this.voice) {
                utterThis.voice = this.voice;
            }
            // Nova's delivery (Sultry, relaxed, less robotic AI)
            utterThis.pitch = 0.95; 
            utterThis.rate = 0.85;
            
            this.synth.speak(utterThis);
        }
    }
};

// Application State
const AppState = {
    players: [],
    currentPlayerIndex: 0,
    turnCount: 0,
    isFreakyMode: false,
    gameActive: false,
    bossHealth: 100,
    boardTiles: [],
    availableCards: { drink: [], minigame: [], rule: [], david: [] },
    availableEmojis: ['🐨','🐷','🐶','🦒','🐱','🦊','🐼','🦁','🐸','🐵','🐮','🐯','🐰','🐹','🐻','🦦','🦥']
};

const BaseCards = {
    drink: [
        { t: 'BODY SHOT', d: 'Do a body shot off a player of the opposite gender.' },
        { t: 'STRIP', d: 'Remove one item of clothing or take 3 sips.' },
        { t: 'KISS OR DRINK', d: 'Kiss a player of the opposite gender or take 2 sips.' },
        { t: 'LAP DANCE', d: 'Give a 30s lap dance to a player of the opposite gender.' },
        { t: 'SEXY SECRET', d: 'Tell your freakiest secret, or take 4 sips.' },
        { t: '7 MINUTES', d: 'Go to a closet with a player of the opposite gender for 1 minute, or finish your drink.' },
        { t: 'DRINKING BUDDIES', d: 'Pick a player of the opposite gender. For the rest of the game, when you drink, they drink.' },
        { t: 'ROULETTE', d: 'Pour a mystery shot for a player of the opposite gender. They must guess the liquid or take a sip.' },
        { t: 'CONFESSION', d: 'Admit a minor lie you\'ve told recently, or take 3 sips.' }
    ],
    minigame: [
        { t: 'SUCK AND BLOW', d: 'Pass a napkin or piece of paper using only your mouths. Drops it? Both drink.' },
        { t: 'NEVER HAVE I EVER', d: '3 fingers. Make them dirty. First out takes a shot.' },
        { t: 'EYE CONTACT', d: 'Stare deeply into the eyes of a player of the opposite gender. First to blink or laugh drinks.' },
        { t: 'TRUTH OR DARE', d: 'Pick a player of the opposite gender to answer a dirty truth or perform a dare. Refusal = 3 sips.' },
        { t: 'MOST LIKELY TO', d: 'On 3, point at the person most likely to get arrested tonight. Whoever has the most fingers pointed at them drinks 2.' },
        { t: 'CATEGORIES', d: 'Pick a fast category. Go around the room naming things. First to pause drinks.' }
    ],
    rule: [
        { t: 'HOT SEAT', d: 'Every player gets to ask you one intimate question. You must answer honestly or drink.' },
        { t: 'CUPID', d: 'You are handcuffed (metaphorically) to a player of the opposite gender. Whenever they drink, you drink.' },
        { t: 'MASTERS TOUCH', d: 'You can only drink when a player of the opposite gender feeds it to you.' },
        { t: 'NO NAMES', d: 'No using real names. Call everyone "Daddy" or "Mommy". If you fail, drink.' },
        { t: 'FLOOR IS LAVA', d: 'The last person to lift their feet off the ground takes a shot.' }
    ],
    david: [
        { t: 'WHISPER', d: 'Lean in and whisper a secret to a player of the opposite gender. They take 2 sips.' },
        { t: 'SMOOTH OPERATOR', d: 'Give a compliment to a player of the opposite gender. Everyone else takes a sip.' },
        { t: 'CHILL PILL', d: 'Enjoy a free pass this round. Sip your drink and relax.' },
        { t: 'GENTLEMAN', d: 'Kiss the hand of a player of the opposite gender.' },
        { t: 'HUG IT OUT', d: 'Give a player of the opposite gender a tight hug.' },
        { t: 'MYSTIQUE', d: 'Stare silently at a player of the opposite gender for 10 seconds. They drink.' },
        { t: 'CHEERS', d: 'Propose a toast. Everyone drinks!' },
        { t: 'AURA', d: 'You gain +10 Aura. Pick a player of the opposite gender to take 3 sips.' },
        { t: 'WINGMAN', d: 'Pick a partner of the opposite gender. Give out 3 drinks together.' }
    ]
};

const SpicyCards = {
    drink: [
        { t: 'BODY SHOTS ONLY', d: 'All drinks for the rest of the game must be taken as body shots off a player of the opposite gender.' },
        { t: 'STRIP TEASE', d: 'Perform a 1-minute strip tease in the center of the room or finish your entire drink.' },
        { t: 'MAKE OUT', d: 'Make out with a player of the opposite gender for 10 seconds or lose a heart.' },
        { t: 'PENTHOUSE', d: 'Go to another room with a player of the opposite gender for 5 minutes. No questions asked.' },
        { t: 'PHONE ROULETTE', d: 'Let a player of the opposite gender send one text to anyone in your contacts, or take 5 sips.' },
        { t: 'SILENT TREATMENT', d: 'You cannot speak for 2 rounds. If you make a sound, drink.' }
    ],
    minigame: [
        { t: 'ICE CUBE', d: 'Pass an ice cube from your mouth to a player of the opposite gender. Drop it? Both lose a heart.' },
        { t: 'BLINDFOLD TASTE', d: 'Put on a blindfold. A player of the opposite gender feeds you something. Guess it right or drink.' },
        { t: 'CRUSH', d: 'Point to the person in the room you would crush on. Winner drinks.' }
    ],
    rule: [
        { t: 'COLLARED', d: 'You are now the "pet" of a player of the opposite gender. You must do whatever they say until the game ends.' },
        { t: 'CLOTHING SWAP', d: 'Swap a piece of clothing with a player of the opposite gender right now.' },
        { t: 'THIGH HOLD', d: 'Keep your hand on the inner thigh of a player of the opposite gender for 2 rounds.' },
        { t: 'FLIRT', d: 'You must aggressively flirt with a player of the opposite gender until your next turn.' }
    ],
    david: [
        { t: 'AURA PEAK', d: 'Pick a player of the opposite gender. They must give you a massage for 1 minute.' },
        { t: 'THE BACHELOR', d: 'Every player of the opposite gender must give you a compliment and a kiss on the cheek.' },
        { t: 'WINGMAN PRO', d: 'Choose two players of the opposite gender to make out for 5 seconds.' }
    ]
};

// DOM Elements
const DOM = {
    screens: {
        setup: document.getElementById('screen-setup'),
        game: document.getElementById('screen-game')
    }
};

const AudioEngine = {
    theme: new Audio('./theme.mp3'),
    isMuted: false,
    init() {
        this.theme.loop = true;
        this.theme.volume = 0.15;
    },
    playTheme() {
        if (!this.isMuted && this.theme.paused) {
            this.theme.play().catch(e => console.log("Autoplay prevented:", e));
        }
    },
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.theme.pause();
        } else {
            this.theme.play().catch(e => console.log("Autoplay prevented:", e));
        }
        return this.isMuted;
    }
};

// Initialization
function init() {
    console.log("SipQuest initialized.");
    VoiceEngine.init();
    AudioEngine.init();
    
    // Unblock audio on first interaction
    document.body.addEventListener('click', () => { AudioEngine.playTheme(); }, { once: true });
    document.body.addEventListener('keydown', () => { AudioEngine.playTheme(); }, { once: true });
    
    // We will build setup UI here shortly
    renderSetupScreen();
}

function renderSetupScreen() {
    DOM.screens.setup.innerHTML = `
        <div class="setup-header" style="text-align: center; margin-bottom: 2rem; margin-top: 1rem;">
            <h1 class="text-cyan" style="font-size: 2.5rem; line-height: 1.5; margin-bottom: 0.5rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px;">SipQuest</h1>
            <p class="text-gold" style="font-family: var(--font-pixel); font-size: 0.7rem;">Guild Registration Window</p>
        </div>
        
        <button id="btn-toggle-music" style="position: absolute; top: 1rem; right: 1rem; z-index: 60; background: rgba(0,0,0,0.5); border: 2px solid var(--slime-cyan); color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; backdrop-filter: blur(5px);">🎵</button>
        
        <div class="glass-panel player-input-panel" style="padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column;">
            <h2 class="text-cyan" style="font-family: var(--font-pixel); font-size: 0.8rem; margin-bottom: 1.5rem;">Register Party Members</h2>
            
            <div id="player-list" style="flex-grow: 1; overflow-y: auto; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem;"></div>
            
            <div class="add-player-controls" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                <input type="text" id="new-player-name" placeholder="Enter Adventurer Name..." style="background: rgba(0,0,0,0.5); border: 2px solid var(--slime-cyan); color: white; padding: 0.8rem; border-radius: var(--border-radius-sm); font-family: var(--font-body); font-size: 1rem; outline: none;">
                <button id="btn-add-player" class="btn btn-primary" style="margin-top: 0.5rem;">ADD (RANDOM ROLE)</button>
            </div>
            
            <button id="btn-start-game" class="btn btn-danger" style="width: 100%; opacity: 0.5; pointer-events: none;">ENTER THE DUNGEON</button>
        </div>
    `;
    
    attachSetupListeners();
}

function attachSetupListeners() {
    const btnMusic = document.getElementById('btn-toggle-music');
    if (btnMusic) {
        btnMusic.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent body click handler from overlapping
            const muted = AudioEngine.toggleMute();
            btnMusic.style.opacity = muted ? '0.5' : '1';
            btnMusic.innerHTML = muted ? '🔇' : '🎵';
        });
    }

    const btnAdd = document.getElementById('btn-add-player');
    const inputName = document.getElementById('new-player-name');
    const classSelect = document.getElementById('new-player-class');
    const btnStart = document.getElementById('btn-start-game');
    
    const addPlayer = () => {
        const name = inputName.value.trim();
        
        const allClasses = [
            'hero', 'archmage', 'goddess', 'edgelord', 'cleric', 'tank', 
            'assassin', 'bard', 'necromancer', 'magician', 'paladin', 'healer'
        ];
        const assignedClasses = AppState.players.map(p => p.classType);
        const availableClasses = allClasses.filter(c => !assignedClasses.includes(c));
        
        if (availableClasses.length === 0) {
            alert("No more unique roles available for new adventurers!");
            return;
        }
        
        const pClass = availableClasses[Math.floor(Math.random() * availableClasses.length)];
        
        if (name && AppState.players.length < 12) {
            const colors = ['var(--slime-cyan)', 'var(--health-red)', 'var(--mana-blue)', 'var(--royal-gold)', '#FFF', '#9932CC', '#00FA9A', '#FF00FF', '#FF4500', '#00CED1', '#FF1493', '#32CD32'];
            const color = colors[AppState.players.length % colors.length];
            
            const classEmojis = { 
                hero: '🗡️', archmage: '🔮', goddess: '💧', edgelord: '🖤', cleric: '✨', 
                tank: '🛡️', assassin: '🥷', bard: '🎵', necromancer: '💀', 
                magician: '🎩', paladin: '🛡️', healer: '⚕️' 
            };
            const emoji = classEmojis[pClass] || '⚔️';
            
            AppState.players.push({ 
                id: Date.now(), 
                name, color, emoji,
                classType: pClass, position: 0,
                usedReroll: false,
                isCooldown: false,
                lives: 3,
                isDead: false,
                abilityCharges: getInitialCharges(pClass),
                abilityName: getAbilityName(pClass)
            });
            inputName.value = '';
            
            updatePlayerList();
            
            // Check start button
            if (AppState.players.length >= 2) {
                btnStart.style.opacity = '1';
                btnStart.style.pointerEvents = 'auto';
            }
        }
    };
    
    btnAdd.addEventListener('click', addPlayer);
    inputName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    
    btnStart.addEventListener('click', () => {
        startGame();
    });
}

function updatePlayerList() {
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    
    AppState.players.forEach((player, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 0.8rem;
            background: rgba(255,255,255,0.05);
            border-radius: var(--border-radius-sm);
            border-left: 4px solid ${player.color};
            animation: slideIn 0.3s ease forwards;
        `;
        
        item.innerHTML = `
            <div style="width: 50px; height: 50px; border-radius: 50%; background: ${player.color}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin-right: 1rem; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
                ${player.emoji}
            </div>
            <div style="flex-grow: 1; display: flex; flex-direction: column;">
                <span style="font-weight: 600;">${player.name}</span>
                <span class="player-class-badge" style="font-family: var(--font-pixel); font-size: 0.5rem; color: var(--royal-gold); margin-top:4px;">Class: ${player.classType.toUpperCase()}</span>
                <span style="font-size: 0.6rem; color: rgba(255,255,255,0.7); margin-top: 2px; font-style: italic;">${getClassAbility(player.classType)}</span>
                <div class="player-lives" style="font-size: 0.7rem; margin-top: 4px;">
                    ${'❤️'.repeat(player.lives)}${'🖤'.repeat(3 - player.lives)}
                </div>
            </div>
            <button class="remove-player" data-index="${index}" style="background: transparent; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer;">✕</button>
        `;
        
        list.appendChild(item);
    });
    
    // Add remove listeners
    document.querySelectorAll('.remove-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const removed = AppState.players.splice(index, 1)[0];
            
            // Return emoji to pool
            if (removed.emoji && removed.emoji !== '👽') {
                AppState.availableEmojis.push(removed.emoji);
            }
            
            // If mid-game, remove board token
            const existingToken = document.getElementById(`token-${removed.id}`);
            if (existingToken) existingToken.remove();
            
            updatePlayerList();
            
            // Update start button
            const btnStart = document.getElementById('btn-start-game');
            if (AppState.players.length < 2) {
                btnStart.style.opacity = '0.5';
                btnStart.style.pointerEvents = 'none';
            }
        });
    });
}

function startGame() {
    // Transition to game screen
    gsap.to(DOM.screens.setup, {
        opacity: 0,
        y: -50,
        duration: 0.5,
        onComplete: () => {
            DOM.screens.setup.classList.remove('active');
            DOM.screens.setup.classList.add('hidden');
            
            DOM.screens.game.classList.remove('hidden');
            DOM.screens.game.classList.add('active');
            
            // Initial setup for game screen needed here
            gsap.fromTo(DOM.screens.game, 
                { opacity: 0, y: 50 }, 
                { opacity: 1, y: 0, duration: 0.5 }
            );
            
            if (!AppState.gameActive) {
                AppState.gameActive = true;
                initGameEnv();
                document.getElementById('btn-start-game').textContent = 'RESUME QUEST';
                VoiceEngine.speak("Welcome to SipQuest. I am Nova. You have been summoned to defeat The Demon King. Completing Quests deals damage. Failing Quests will result in penalties and heal The Demon King. Do not die.");
                const firstPlayer = AppState.players[AppState.currentPlayerIndex].name;
                VoiceEngine.speak(`It is your turn, ${firstPlayer}... roll the dice.`, true);
            } else {
                // If game active, restore new tokens
                AppState.players.forEach(p => {
                    if (!document.getElementById(`token-${p.id}`)) {
                        placePlayerToken(p, p.position || 0);
                    }
                });
                updateCurrentPlayerUI();
            }
        }
    });
}

function initGameEnv() {
    // Generate board tiles
    generateBoardTiles();
    
    // Create UI Structure
    DOM.screens.game.innerHTML = `
        <button id="btn-back-setup" style="position: absolute; top: 1rem; left: 1rem; z-index: 60; background: rgba(0,0,0,0.5); border: 2px solid var(--neon-blue); color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; backdrop-filter: blur(5px); box-shadow: 0 0 10px var(--neon-blue-glow); transition: transform 0.2s;">✕</button>
        
        <div class="boss-container" id="boss-ui">
            <div class="demon-king-aura"></div>
            <h2 class="boss-title">THE DEMON KING</h2>
            <div class="health-bar-bg" id="boss-health-bg">
                <div class="health-bar-fill" id="boss-health-fill" style="width: 100%;"></div>
                <div class="health-text" id="boss-health-text">100 / 100 HP</div>
                <div class="sword-slash" id="boss-slash"></div>
                <div class="floating-damage" id="floating-dmg"></div>
            </div>
        </div>

        <div class="game-layout">
            <div class="board-container">
                <div class="board-grid" id="board-grid"></div>
            </div>
            
            <div class="game-controls">
                <div class="current-player-display" id="current-player-display">
                    <!-- Populated by JS -->
                </div>
                
                <div class="dice-container" id="dice-container">
                    <div class="dice" id="randomizer-dice">🎲</div>
                </div>
            </div>
        </div>
        
        <!-- Freaky Mode Notification -->
        <div id="freaky-mode-banner" style="position: absolute; top: 0; left: 0; width: 100%; background: var(--health-red); color: white; text-align: center; padding: 0.5rem; font-weight: bold; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 2px; transform: translateY(-100%); transition: transform 0.5s;">
            ⚠️ HARDCORE MODE ACTIVATED ⚠️
        </div>
        
        <!-- Action Card Overlay -->
        <div id="card-overlay" class="card-overlay">
            <div class="card-container">
                <div class="card" id="action-card">
                    <div class="card-face card-front"></div>
                    <div class="card-face card-back" id="card-back-face">
                        <h2 class="card-title" id="card-title">TITLE</h2>
                        <p class="card-desc" id="card-desc">Description</p>
                    </div>
                </div>
            </div>
            <div id="card-choices" style="display:flex; flex-direction:column; gap: 1rem; margin-top: 1rem; opacity: 0; pointer-events: none; transition: opacity 0.3s; width:300px;">
                <button id="btn-card-yes" class="btn btn-primary">QUEST CLEARED</button>
                <button id="btn-card-no" class="btn btn-danger">QUEST FAILED</button>
                <button id="btn-card-ability" class="btn" style="background: var(--royal-gold); color: black; display: none;">USE ABILITY</button>
            </div>
        </div>
        
        <!-- Climax Boss Battle Overlay -->
        <div id="climax-overlay" class="climax-overlay">
            <h1 class="climax-title">THE ULTIMATE SHOWDOWN</h1>
            <p class="climax-message">The Demon King has cornered you. Deplete his remaining health now!</p>
            <button id="btn-climax-fight" class="btn btn-primary" style="font-size: 2rem; padding: 1.5rem 3rem;">RAPID-FIRE CHUG</button>
        </div>
    `;
    
    renderBoard();
    updateCurrentPlayerUI();
    attachGameListeners();
}

function generateBoardTiles() {
    const totalTiles = 100; // Expanded to 100 Tiles for D20 map path
    
    AppState.boardTiles = [];
    let lastWasSafe = true; // Prevent safe on tile 1
    
    for (let i = 0; i < totalTiles; i++) {
        if (i === 0) {
            AppState.boardTiles.push({ index: i, type: 'start', label: 'START' });
        } else if (i === totalTiles - 1) {
            AppState.boardTiles.push({ index: i, type: 'boss', label: '💀' });
        } else {
            // 8% chance for a safe tile, never back-to-back
            if (!lastWasSafe && Math.random() < 0.08) {
                AppState.boardTiles.push({ index: i, type: 'safe', label: getTileIcon('safe') });
                lastWasSafe = true;
            } else {
                const typesNormal = ['drink', 'minigame', 'rule', 'drink'];
                const type = typesNormal[Math.floor(Math.random() * typesNormal.length)];
                AppState.boardTiles.push({ index: i, type, label: getTileIcon(type) });
                lastWasSafe = false;
            }
        }
    }
}

function getTileIcon(type) {
    switch(type) {
        case 'drink': return '🍻';
        case 'minigame': return '🎮';
        case 'rule': return '⚖️';
        case 'safe': return '🛡️';
        default: return '';
    }
}

function renderBoard() {
    const grid = document.getElementById('board-grid');
    grid.innerHTML = '';
    
    // Switch to grid path logic
    grid.className = 'board-grid';
    grid.style = '';
    
    // Render Tiles
    AppState.boardTiles.forEach((tile, index) => {
        const el = document.createElement('div');
        el.className = `tile type-${tile.type}`;
        el.setAttribute('data-index', tile.index + 1);
        el.id = `tile-${tile.index}`;
        
        el.style = '';
        
        el.innerHTML = `
            <span>${tile.label}</span>
            <div class="players-on-tile" id="players-tile-${tile.index}"></div>
        `;
        
        grid.appendChild(el);
    });
    
    // Place all players on tile 0
    AppState.players.forEach(player => {
        placePlayerToken(player, 0);
    });
}

function placePlayerToken(player, tileIndex) {
    // Remove from previous if exists
    const existingToken = document.getElementById(`token-${player.id}`);
    if (existingToken) {
        existingToken.remove();
    }
    
    // Add to new
    const tileContainer = document.getElementById(`players-tile-${tileIndex}`);
    if (tileContainer) {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.id = `token-${player.id}`;
        token.style.background = player.color;
        token.innerHTML = player.emoji;
        tileContainer.appendChild(token);
    }
}

function getClassName(type) {
    const names = {
        necromancer: 'The Necromancer', magician: 'The Magician',
        healer: 'The Healer', assassin: 'The Assassin',
        paladin: 'The Paladin', berserker: 'The Berserker',
        ranger: 'The Ranger', bard: 'The Bard',
        monk: 'The Monk', summoner: 'The Summoner',
        alchemist: 'The Alchemist', jester: 'The Jester',
        hero: 'The OP Hero', archmage: 'The Archmage',
        goddess: 'Useless Goddess', edgelord: 'The Edgelord',
        cleric: 'The Cleric', tank: 'The Tank'
    };
    return names[type] || 'Adventurer';
}

function getInitialCharges(type) {
    const limits = { magician: 3, necromancer: 1, healer: 1, assassin: 1, paladin: 3, berserker: 2, bard: 2, summoner: 1, alchemist: 1, jester: 2, edgelord: 1, cleric: 1, tank: 1, ranger: 3, monk: 1, archmage: 1, goddess: 1, hero: 1 };
    return limits[type] || 0;
}

function getAbilityName(type) {
    const names = { magician: "Water Shot", necromancer: "Revive", healer: "Group Heal", assassin: "Evade Drink", paladin: "Divine Shield", berserker: "Blood Rage", bard: "Serenade", summoner: "Sacrifice Ally", alchemist: "Transmute Card", jester: "Prank", edgelord: "Evade", cleric: "Sanctuary", tank: "Taunt", ranger: "Scout Tracker", monk: "Meditate", archmage: "Overload", goddess: "Miracle", hero: "Smite" };
    return names[type] || "Passive";
}

function getClassAbility(type) {
    const abilities = {
        necromancer: 'Can use "Revive" once per game.',
        magician: 'Starts with 3 Water Shots (skip dare).',
        healer: 'Heals the group hype / skips a penalty.',
        assassin: 'Immune to the first group penalty. Drinks alone.',
        paladin: 'A shining beacon. Takes 1 extra sip voluntarily for the party.',
        berserker: 'Deals 3x damage but loses 1 Heart per critical hit.',
        ranger: 'Can scout ahead (see the next 3 tiles).',
        bard: 'Sing instead of drinking for 1 dare.',
        monk: 'Immune to "Rule" cards.',
        summoner: 'When drawing a dare, summon another player to do it.',
        alchemist: 'Can transform any drink into another liquid once.',
        jester: 'Forces a random player to drink whenever you drink.',
        hero: 'Has 1 native Reroll per game.',
        archmage: '2x Damage on hit, but suffers a Cooldown (extra sip).',
        goddess: 'Chaos: Completely randomizes card draws.',
        edgelord: 'Immune to the first penalty. Too cool to cheer.',
        cleric: 'Protects the party from 1 boss heal.',
        tank: 'Takes the next penalty for the party.'
    };
    return abilities[type] || 'Standard adventurer.';
}

function updateCurrentPlayerUI() {
    const player = AppState.players[AppState.currentPlayerIndex];
    const display = document.getElementById('current-player-display');
    
    // Check Archmage Cooldown Effect
    let statusText = '';
    if (player.classType === 'archmage' && player.isCooldown) {
        player.isCooldown = false;
        statusText = 'COOLDOWN: DRINK 1 EXTRA SIP';
        VoiceEngine.speak(`${player.name}, your mana is depleted. Drink one extra sip.`);
    } else if (player.classType === 'hero' && !player.usedReroll) {
        statusText = 'BUFF: 1 REROLL AVAILABLE';
    } else if (player.classType === 'edgelord' && player.immuneToPenalty) {
        statusText = 'BUFF: IMMUNE TO 1 PENALTY';
    }
    
    display.innerHTML = `
        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${player.color}; box-shadow: 0 0 10px ${player.color}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
            ${player.emoji}
        </div>
        <div style="display:flex; flex-direction:column; margin-left:10px;">
            <span style="font-size: 0.6rem; color: var(--text-secondary); text-transform: uppercase; font-family: var(--font-pixel);">Current Turn</span>
            <span style="font-weight: bold; font-family: var(--font-body); font-size: 1.4rem; letter-spacing: 1px; ${player.isDead ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${player.name}</span>
            <span class="player-class-badge">${getClassName(player.classType)}</span>
            <span style="font-size: 0.65rem; color: rgba(255,255,255,0.8); margin-top: 4px; font-style: italic; max-width: 200px;">${getClassAbility(player.classType)}</span>
            <div class="player-lives" style="font-size: 0.8rem; margin-top: 4px;">
                ${'❤️'.repeat(player.lives)}${'🖤'.repeat(3 - player.lives)}
            </div>
            ${statusText ? `<span class="player-status-badge">${statusText}</span>` : ''}
        </div>
    `;
    
    display.style.borderColor = player.color;
    display.style.boxShadow = `0 0 15px ${player.color}40`; // 40 is hex alpha 25%
}

function attachGameListeners() {
    const btnBack = document.getElementById('btn-back-setup');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            gsap.to(DOM.screens.game, {
                opacity: 0,
                y: 50,
                duration: 0.5,
                onComplete: () => {
                    DOM.screens.game.classList.remove('active');
                    DOM.screens.game.classList.add('hidden');
                    
                    DOM.screens.setup.classList.remove('hidden');
                    DOM.screens.setup.classList.add('active');
                    
                    gsap.fromTo(DOM.screens.setup, 
                        { opacity: 0, y: -50 }, 
                        { opacity: 1, y: 0, duration: 0.5 }
                    );
                }
            });
        });
    }

    const diceBtn = document.getElementById('randomizer-dice');
    
    diceBtn.addEventListener('click', () => {
        if (diceBtn.classList.contains('rolling')) return; // Prevent double click
        rollDice();
    });
    
    const cardOverlay = document.getElementById('card-overlay');
    const card = document.getElementById('action-card');
    const cardChoices = document.getElementById('card-choices');
    const btnYes = document.getElementById('btn-card-yes');
    const btnNo = document.getElementById('btn-card-no');
    
    const btnAbility = document.getElementById('btn-card-ability');
    
    card.addEventListener('click', () => {
        if (!card.classList.contains('is-flipped')) {
            card.classList.add('is-flipped');
            
            setTimeout(() => {
                cardChoices.style.opacity = '1';
                cardChoices.style.pointerEvents = 'auto';
            }, 800);
        }
    });
    
    const closeCardAndNextTurn = () => {
        cardOverlay.classList.remove('visible');
        card.classList.remove('is-flipped');
        cardChoices.style.opacity = '0';
        cardChoices.style.pointerEvents = 'none';
        nextTurn();
    };
    
    const dealDamageToBoss = (amount, isCrit = false) => {
        AppState.bossHealth = Math.max(0, AppState.bossHealth - amount);
        
        document.getElementById('boss-health-fill').style.width = `${AppState.bossHealth}%`;
        document.getElementById('boss-health-text').textContent = `${AppState.bossHealth} / 100 HP`;
        
        const slash = document.getElementById('boss-slash');
        slash.classList.remove('sword-slash-animate');
        void slash.offsetWidth; 
        slash.classList.add('sword-slash-animate');
        
        gsap.to(document.body, {backgroundColor: 'var(--mana-blue)', duration: 0.1, yoyo: true, repeat: 1, onComplete: () => {
             gsap.set(document.body, {backgroundColor: "var(--bg-dark)"});
        }});
        
        const floatDmg = document.getElementById('floating-dmg');
        floatDmg.textContent = `-${amount}!`;
        floatDmg.classList.remove('damage-animate');
        void floatDmg.offsetWidth;
        floatDmg.classList.add('damage-animate');
        
        const praises = [
            "Quest Cleared. The Demon King weakens.", 
            "A devastating blow.", 
            "Nova approves.",
            isCrit ? "Critical strike!" : "Excellent form."
        ];
        VoiceEngine.speak(praises[Math.floor(Math.random() * praises.length)]);
        
        if (AppState.bossHealth <= 0) {
            setTimeout(() => {
                alert("🎉 THE DEMON KING HAS BEEN VANQUISHED! YOU SAVED THE REALM! 🎉");
                location.reload();
            }, 1500);
            return;
        }
        closeCardAndNextTurn();
    };

    btnYes.addEventListener('click', () => {
        const player = AppState.players[AppState.currentPlayerIndex];
        let damage = AppState.lastRoll || 10; 
        let isCrit = false;
        
        if (player.classType === 'archmage') {
            damage *= 2;
            player.isCooldown = true;
            isCrit = true;
        }
        if (player.classType === 'goddess') {
            VoiceEngine.speak("Goddess miracle... The party is blessed.");
        }

        dealDamageToBoss(damage, isCrit);
    });
    
    btnNo.addEventListener('click', () => {
        const player = AppState.players[AppState.currentPlayerIndex];
        
        if (player.classType === 'edgelord' || player.classType === 'assassin') {
             if (player.immuneToPenalty) {
                 player.immuneToPenalty = false;
                 VoiceEngine.speak(`The ${getClassName(player.classType)} evades the penalty. Impressive.`);
                 closeCardAndNextTurn();
                 return;
             }
        }

        AppState.bossHealth = Math.min(100, AppState.bossHealth + 15);
        document.getElementById('boss-health-fill').style.width = `${AppState.bossHealth}%`;
        document.getElementById('boss-health-text').textContent = `${AppState.bossHealth} / 100 HP`;
        
        player.lives--;
        updateCurrentPlayerUI();
        
        const roasts = [
            "Quest Failed. The Demon King feeds on your cowardice.",
            player.lives === 0 ? "A fatal mistake. You have perished." : "Are you actually serious? Drink up, adventurers.",
            "The Demon King grows stronger while you sip water."
        ];
        VoiceEngine.speak(roasts[Math.floor(Math.random() * roasts.length)]);
        
        if (player.lives <= 0) {
            player.isDead = true;
            VoiceEngine.speak(`${player.name} has fallen.`);
        }
        
        const explosion = document.createElement('div');
        explosion.className = 'explosion-flash';
        document.body.appendChild(explosion);
        
        document.getElementById('app-container').classList.add('screen-shake');
        
        setTimeout(() => {
             explosion.remove();
             document.getElementById('app-container').classList.remove('screen-shake');
             closeCardAndNextTurn();
        }, 500);
    });
    
    btnAbility.addEventListener('click', () => {
        const player = AppState.players[AppState.currentPlayerIndex];
        if (player.abilityCharges <= 0 || player.isDead) return;
        
        player.abilityCharges--;
        const damage = AppState.lastRoll || 10;
        
        switch (player.classType) {
            case 'magician':
            case 'bard':
                VoiceEngine.speak(`The ${getClassName(player.classType)} uses their ability. Quest Cleared without drinking.`);
                dealDamageToBoss(damage);
                break;
                
            case 'necromancer':
                const deadPlayer = AppState.players.find(p => p.isDead);
                if (deadPlayer) {
                    deadPlayer.isDead = false; deadPlayer.lives = 1;
                    VoiceEngine.speak(`The Necromancer has resurrected ${deadPlayer.name}.`);
                } else {
                    player.lives = Math.min(3, player.lives + 1);
                    VoiceEngine.speak("The Necromancer heals themselves with dark magic.");
                }
                closeCardAndNextTurn();
                break;
                
            case 'healer':
                VoiceEngine.speak("The Healer channels life into the party. Everyone gains a heart.");
                AppState.players.forEach(p => { if (!p.isDead) p.lives = Math.min(3, p.lives + 1); });
                closeCardAndNextTurn();
                break;
                
            case 'assassin':
            case 'edgelord':
                VoiceEngine.speak(`The ${getClassName(player.classType)} evades the penalty entirely. Impressive.`);
                closeCardAndNextTurn();
                break;
                
            case 'paladin':
            case 'tank':
                player.lives--;
                VoiceEngine.speak(`The ${getClassName(player.classType)} sacrifices a heart to shield the party. The Demon King does not heal.`);
                if (player.lives <= 0) { player.isDead = true; VoiceEngine.speak(`${player.name} has died a heroic death.`); }
                closeCardAndNextTurn();
                break;
                
            case 'berserker':
                VoiceEngine.speak("Blood Rage! The Berserker sacrifices a heart to deal massive damage.");
                player.lives--;
                if (player.lives <= 0) { player.isDead = true; }
                dealDamageToBoss(damage * 3);
                break;
                
            case 'summoner':
            case 'jester':
                const aliveOthers = AppState.players.filter(p => !p.isDead && p.id !== player.id);
                if (aliveOthers.length > 0) {
                    const victim = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
                    victim.lives--;
                    VoiceEngine.speak(`${player.name} forces ${victim.name} to take the penalty. They lose a heart.`);
                    if (victim.lives <= 0) { victim.isDead = true; VoiceEngine.speak(`${victim.name} perishes from the betrayal.`); }
                } else {
                    VoiceEngine.speak("No one left to sacrifice. The Demon King laughs.");
                    player.lives--;
                }
                closeCardAndNextTurn();
                break;
                
            case 'alchemist':
                VoiceEngine.speak("The Alchemist transmutes the card. Drawing a new one...");
                card.classList.remove('is-flipped');
                setTimeout(() => {
                    const deckType = AppState.lastRoll >= 12 ? SpicyCards : BaseCards;
                    const cats = Object.keys(deckType);
                    const selCat = cats[Math.floor(Math.random() * cats.length)];
                    const deck = deckType[selCat];
                    const chosen = deck[Math.floor(Math.random() * deck.length)];
                    document.getElementById('card-title').textContent = chosen.t;
                    document.getElementById('card-title').style.color = selCat === 'drink' ? 'var(--slime-cyan)' : selCat === 'minigame' ? 'var(--mana-blue)' : selCat === 'rule' ? 'var(--royal-gold)' : '#FF1493';
                    document.getElementById('card-desc').textContent = chosen.d;
                    card.classList.add('is-flipped');
                }, 400);
                return; // Do not close card
                
            case 'cleric':
                VoiceEngine.speak("The Cleric invokes Sanctuary. The penalty is nullified.");
                closeCardAndNextTurn();
                break;
                
            case 'ranger':
                VoiceEngine.speak("The Ranger scouts ahead and launches an ambush. Dealing 2x damage.");
                dealDamageToBoss(damage * 2);
                break;
                
            case 'monk':
                player.lives = Math.min(3, player.lives + 1);
                VoiceEngine.speak("The Monk meditates to heal a heart, ignoring the penalty.");
                closeCardAndNextTurn();
                break;
                
            case 'goddess':
                AppState.players.forEach(p => { if (!p.isDead) p.lives = 3; });
                VoiceEngine.speak("The Goddess uses a Miracle! All party members are fully healed.");
                closeCardAndNextTurn();
                break;
                
            case 'archmage':
                player.lives--;
                VoiceEngine.speak("The Archmage overloads to deal 4x damage! But suffers severe blowback losing 1 heart.");
                if (player.lives <= 0) { player.isDead = true; }
                dealDamageToBoss(damage * 4, true);
                break;
                
            case 'hero':
                VoiceEngine.speak("The Hero uses Smite! Dealing incredible 5x damage for free.");
                dealDamageToBoss(damage * 5, true);
                break;
                
            default:
                VoiceEngine.speak("Ability activated.");
                closeCardAndNextTurn();
                break;
        }
        updateCurrentPlayerUI();
    });
}

function rollDice() {
    const diceBtn = document.getElementById('randomizer-dice');
    diceBtn.classList.add('rolling');
    
    const player = AppState.players[AppState.currentPlayerIndex];
    let steps = Math.floor(Math.random() * 6) + 1; // 1 to 6
    AppState.lastRoll = steps;
    
    // Secret David Aura Mechanic
    if (player.name.toLowerCase().includes('david')) {
        // 40% chance to rigged roll to a shield if one is within 6 tiles ahead
        if (Math.random() < 0.40) {
            for (let i = 1; i <= 6; i++) {
                const checkIndex = (player.position + i) % AppState.boardTiles.length;
                if (AppState.boardTiles[checkIndex].type === 'safe') {
                    steps = i;
                    break;
                }
            }
        }
    }
    
    // Animated Spin effect
    gsap.to(diceBtn, {
        rotation: 720,
        scale: 1.2,
        duration: 0.8,
        ease: "back.out(1.7)",
        onUpdate: function() {
            // Randomize visual number during spin
            diceBtn.textContent = Math.floor(Math.random() * 6) + 1;
        },
        onComplete: () => {
            diceBtn.textContent = steps;
            diceBtn.style.background = 'white';
            diceBtn.style.color = 'black';
            
            setTimeout(() => {
                diceBtn.style.background = 'var(--mana-blue)';
                diceBtn.style.color = 'white';
                movePlayer(player, steps);
            }, 800);
        }
    });
}

function movePlayer(player, steps) {
    const startIndex = player.position;
    
    // Sequential jump animation
    let currentStep = startIndex;
    let stepsTaken = 0;
    
    const interval = setInterval(() => {
        stepsTaken++;
        currentStep = (currentStep + 1) % AppState.boardTiles.length;
        player.position = currentStep;
        placePlayerToken(player, currentStep);
        
        // Auto scroll board to keep token in view
        const tileEl = document.getElementById(`tile-${currentStep}`);
        if (tileEl) {
            tileEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Pulse effect on tile
            gsap.fromTo(tileEl, 
                { scale: 1.1 }, 
                { scale: 1, duration: 0.3 }
            );
        }
        
        if (stepsTaken >= steps) {
            clearInterval(interval);
            setTimeout(() => handleTileLanded(player, currentStep), 500);
        }
    }, 400); // 400ms delay between hops
}

function handleTileLanded(player, tileIndex) {
    const tile = AppState.boardTiles[tileIndex];
    
    // Safe tile skip action
    if (tile.type === 'safe') {
        const diceBtn = document.getElementById('randomizer-dice');
        diceBtn.classList.remove('rolling');
        diceBtn.textContent = '🛡️';
        VoiceEngine.speak("Safe Zone... You are hidden from The Demon King.");
        setTimeout(nextTurn, 1000);
        return;
    }
    
    if (tile.type === 'boss') {
        const climax = document.getElementById('climax-overlay');
        climax.classList.add('visible');
        VoiceEngine.speak("Welcome to the final floor. The Demon King stands before you. Defeat him.");
        
        document.getElementById('btn-climax-fight').addEventListener('click', () => {
             if (AppState.bossHealth <= 20) {
                  VoiceEngine.speak("The final blow connects. The Demon King is dead.");
                  setTimeout(() => {
                      alert("🏆 YOU VANQUISHED THE DEMON KING! YOU WIN! 🏆");
                      location.reload();
                  }, 2000);
             } else {
                  VoiceEngine.speak("You are too weak. The Demon King wipes your party.");
                  setTimeout(() => {
                      alert("💀 THE DEMON KING DESTROYED YOU (Health was too high). GAME OVER. 💀");
                      location.reload();
                  }, 2000);
             }
        });
        return;
    }
    
    // Draw action card
    drawCard(tile.type);
}

function drawCard(type) {
    const overlay = document.getElementById('card-overlay');
    const backFace = document.getElementById('card-back-face');
    const title = document.getElementById('card-title');
    const desc = document.getElementById('card-desc');
    
    const player = AppState.players[AppState.currentPlayerIndex];
    let queryType = type;
    
    if (player.classType === 'goddess') {
        const types = ['truth', 'dare', 'minigame', 'rule'];
        queryType = types[Math.floor(Math.random() * types.length)];
        VoiceEngine.speak("Goddess Chaos activation. Quest type modified.", true);
    }

    let deckSource = BaseCards;
    
    // D20 Scaling: If roll >= 12, use Spicy/Hard mode cards for maximum risk vs reward
    if (AppState.lastRoll >= 12 || AppState.isFreakyMode) {
        deckSource = SpicyCards;
    }
    
    // If David, he draws from the secret aura deck
    if (player.name.toLowerCase().includes('david')) {
        queryType = 'david';
        deckSource = AppState.isFreakyMode ? SpicyCards : BaseCards; // David's deck is always from the main source, not a separate one
    }

    // Content Generation Logic based on type ensuring uniqueness
    let list = AppState.availableCards[queryType];
    
    // If deck is empty or undefined, reset it from base
    if (!list || list.length === 0) {
        AppState.availableCards[queryType] = JSON.parse(JSON.stringify(deckSource[queryType]));
        list = AppState.availableCards[queryType];
    }
    
    // Draw a random card and remove it from the available pool
    const rIndex = Math.floor(Math.random() * list.length);
    const cardData = list.splice(rIndex, 1)[0];
    
    // Add random funny suffix
    const suffixes = ['(for the plot)', '(yolo)', '(you only live once)', '(cause why else would we be here)', '(we\'re grown)', '(do it for the culture)', '(don\'t be boring)', '(we are all adults here)', '(no regrets)', '(respectfully)', '(don\'t think, just do)'];
    let descriptionText = cardData.d;
    if (Math.random() < 0.45) { // 45% chance to append a comment
         descriptionText += ' <span style="opacity:0.7; font-style:italic;">' + suffixes[Math.floor(Math.random() * suffixes.length)] + '</span>';
    }
    
    // Reset classes
    backFace.className = `card-face card-back type-${type}`;
    title.textContent = cardData.t;
    desc.innerHTML = descriptionText;
    
    const card = document.getElementById('action-card');
    const cardChoices = document.getElementById('card-choices');
    
    // Ensure card is unflipped before showing
    card.classList.remove('is-flipped');
    cardChoices.style.opacity = '0';
    cardChoices.style.pointerEvents = 'none';
    
    // Show overlay
    overlay.classList.add('visible');
    
    // Automatically flip the card and play audio
    setTimeout(() => {
        card.classList.add('is-flipped');
        
        setTimeout(() => {
            cardChoices.style.opacity = '1';
            cardChoices.style.pointerEvents = 'auto';
            
            // Universal Class Ability Display Handler
            const btnAbility = document.getElementById('btn-card-ability');
            if (player.abilityCharges > 0 && player.abilityName && !player.isDead) {
                btnAbility.style.display = 'block';
                btnAbility.textContent = `USE ABILITY: ${player.abilityName} (${player.abilityCharges})`;
            } else {
                btnAbility.style.display = 'none';
            }
            
            // Remove HTML tags and text inside parentheses or brackets
            const cleanDesc = descriptionText.replace(/<[^>]*>?/gm, '').replace(/[\(\[].*?[\)\]]/g, '');
            VoiceEngine.speak(`${cardData.t}... ${cleanDesc}`);
        }, 800);
    }, 600);
}

function nextTurn() {
    if (AppState.players.length === 0) return;
    
    AppState.turnCount++;
    
    // Check for Freaky Mode (after everyone's 3rd turn)
    if (!AppState.isFreakyMode && AppState.turnCount >= (AppState.players.length * 3)) {
        AppState.isFreakyMode = true;
        // Wipe available cards so they repopulate from SpicyCards immediately
        AppState.availableCards = { drink: [], minigame: [], rule: [], david: [] };
        
        // Visually alert players!
        gsap.to(document.body, {backgroundColor: 'var(--neon-pink)', duration: 0.1, yoyo: true, repeat: 5, onComplete: () => {
             gsap.set(document.body, {backgroundColor: 'var(--bg-dark)'});
             VoiceEngine.speak("The game is heating up! Round 4 initiated! All Action Cards are now extremely spicy!");
             setTimeout(() => {
                 alert("🔥 THE GAME IS HEATING UP! ROUND 4 INITIATED! 🔥\nAll Action Cards are now extremely spicy! Good luck.");
                 finishNextTurn();
             }, 100);
        }});
        return; // wait for animation
    }
    
    finishNextTurn();
}

function finishNextTurn() {
    let loopProtect = 0;
    do {
        AppState.currentPlayerIndex = (AppState.currentPlayerIndex + 1) % AppState.players.length;
        loopProtect++;
    } while (AppState.players[AppState.currentPlayerIndex].isDead && loopProtect < 20);

    if (loopProtect >= 20 || AppState.players.every(p => p.isDead)) {
        alert("💀 ALL ADVENTURERS HAVE FALLEN. THE DUNGEON REMAINS UNCLEARED. 💀");
        location.reload();
        return;
    }

    updateCurrentPlayerUI();
    
    const diceBtn = document.getElementById('randomizer-dice');
    diceBtn.classList.remove('rolling');
    diceBtn.textContent = '🎲';
    
    const nextPlayer = AppState.players[AppState.currentPlayerIndex].name;
    const phrases = [
        `You're up, ${nextPlayer}...`,
        `It is your turn, ${nextPlayer}...`,
        `${nextPlayer}... it's time to roll.`,
        `Don't keep me waiting... ${nextPlayer}.`
    ];
    VoiceEngine.speak(phrases[Math.floor(Math.random() * phrases.length)], true);
}


// Start app
document.addEventListener('DOMContentLoaded', init);
