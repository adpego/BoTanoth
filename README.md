# BoTanoth 1.1.1
This script automates tasks in the Tanoth game. To use it, follow the instructions below.


## New release features
- FIX: Circle fixed after game update
- New configuration to set priority for upgrade attributes.


## Bot Features
- Automatically completes adventures
- Manages gold spending based on configuration
- Supports different difficulty and priorities of adventures

## How to Use
### 1. Open the Game
- Go to **[Tanoth](https://lobby.tanoth.gameforge.com)** and log in to your account and log in to your server.

### 2. Open Developer Console
- **Windows/Linux:** Press `F12` or `Ctrl + Shift + J`
- **Mac:** Press `Cmd + Option + J`

### 3. Allow Pasting (If Necessary)
Some browsers block pasting directly in the console. If you see an error when pasting, try:
- Type `allow pasting` and press `Enter` before pasting the script.

### 4. Configure Your Bot
Before running the script, copy the full script, `main.js`, into a document, change and adapt the bot configuration:
Are the firsts lines of the script.
```javascript
let botConfig = {
    // Server speed. Normal speed is 1, higher values are faster servers
    server_speed: 1,
    
    // Priority adventures: 'experience' or 'gold'
    priorityAdventure: 'gold',

    // Max difficulty of adventures: 'easy', 'medium', 'difficult', 'very_difficult'
    difficulty: 'medium',

    // After each adventure, spend gold on: 'attributes' or 'circle'
    // If circle it's completed, it will be changed to attributes.
    spendGoldOn: 'circle',

    // Priority for wasting gold on particular attribute: 'MIX', 'STR', 'DEX', 'CON', 'INT'. 
    // (Only used when spendGoldOn is set to 'attributes', or when the circle is completed)
    // Options:
    //   MIX -> More cheapest attribute to upgrade
    //   STR -> Strength
    //   DEX -> Dexterity
    //   CON -> Constitution
    //   INT -> Intelligence
    priorityAttribute: 'MIX',

    // Minimum gold to keep before spending (set to 0 to spend all gold)
    minGoldToSpend: 0,

    // ADVERTISEMENT Don't touch this is you are a Free to Play player!!!
    // Spend bloodstones doing adventures (true) or save them (false)
    useBloodstones: false,

    // Minimum bloodstones to keep before spending (set to 0 to spend all bloodstones).
    // This configuration doesn't have any effect if useBloodstones is set to false.
    minBloodstonesToSpend: 0,
};
```

### 5. Paste and Run the Script
Copy the full script content including the configuration and paste it into the **console**:

### 6. Stop the Bot
- Refresh the page to stop the bot.

## Notes
- The bot runs until the adventures are finished. It is possible to use bloodstones if you put the attribute "useBloodstones" to true.
- It will spend gold on improving attributes or the circle based on configuration.
- Since the bot executes tasks in the background, sometimes the game may not synchronize correctly.
- I am not responsible for any bans resulting from the use of this bot.

Enjoy playing Tanoth with automation! 🚀


## Contact
For any bug or suggestion, send a message to my telegram [@adpego](https://t.me/adpego) or write an email to: [adpegotanoth@gmail.com](mailto:adpegotanoth@gmail.com)


