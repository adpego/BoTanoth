let botConfig = {
    // Server speed. Normal speed is 1, higher values are faster servers
    server_speed: 2,
    
    // Priority on adventures: 'experience' or 'gold'
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


botConfig.url = window.location.href.replace("/main/client", "/xmlrpc");


const difficultyMap = {
    easy: -1,
    medium: 0,
    difficult: 1,
    very_difficult: 2
};


let isBotRunning = false;
let currentResources = {
    gold: 0,
    bloodstones: 0
};



function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Helper function to find value by name in a struct
function findValueByName(struct, name, type) {
    // Set default parameter value if not provided
    if (type === undefined) {
        type = 'i4';
    }

    const member = Array.from(struct.getElementsByTagName('member')).find(member => {
        const nameElement = member.getElementsByTagName('name')[0];
        return nameElement && nameElement.textContent === name;
    });

    if (member) {
        const valueNode = member.getElementsByTagName('value')[0];
        if (valueNode) {
            const targetNode = valueNode.getElementsByTagName(type)[0];
            if (targetNode) {
                return targetNode.textContent;
            }
        }
    }
    return null;
}





// Function to fetch and parse XML data
async function fetchXmlData(url, xmlData) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
            },
            body: xmlData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const xmlString = await response.text();
        return xmlString;
    } catch (error) {
        console.error('Error fetching or parsing data:', error);
        throw error;
    }
}





function parseResourcesXMLResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    return {
        gold: parseInt(findValueByName(xmlDoc, 'gold', 'i4')),
        bloodstones: parseInt(findValueByName(xmlDoc, 'bs', 'i4')),
    };
}

async function getCurrentResources(){
    const xmlGetResources = `
    <methodCall>
        <methodName>MiniUpdate</methodName>
        <params>
            <param>
                <value>
                    <string>${flashvars.sessionID}</string>
                </value>
            </param>
        </params>
    </methodCall>
    `;
    
    const xmlResourcesData = await fetchXmlData(botConfig.url, xmlGetResources);
    return parseResourcesXMLResponse(xmlResourcesData);
}

async function proccessCurrentTaskRunning(){
    const xmlGetTask = `
    <methodCall>
        <methodName>MiniUpdate</methodName>
        <params>
            <param>
                <value>
                    <string>${flashvars.sessionID}</string>
                </value>
            </param>
        </params>
    </methodCall>
    `;
    
    const xmlTaskData = await fetchXmlData(botConfig.url, xmlGetTask);
    return parseAnotherTaskRunningXmlResponse(xmlTaskData);
}


function parseAdventureXMLResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Extract adventure data
    const adventures = Array.from(xmlDoc.querySelectorAll('array > data > value > struct')).map(adventure => {
        return {
            difficulty: parseInt(findValueByName(adventure, 'difficulty', 'i4')),
            gold: parseInt(findValueByName(adventure, 'gold', 'i4')),
            experience: parseInt(findValueByName(adventure, 'exp', 'i4')),
            duration: parseInt(findValueByName(adventure, 'duration', 'i4')),
            id: parseInt(findValueByName(adventure, 'quest_id', 'i4'))
        };
    });

    // Extract adventure counts
    const adventuresMadeToday = parseInt(findValueByName(xmlDoc, 'adventures_made_today', 'i4'));
    const freeAdventuresPerDay = parseInt(findValueByName(xmlDoc, 'free_adventures_per_day', 'i4'));

    return {
        adventures,
        adventuresMadeToday,
        freeAdventuresPerDay,
        hasRemainingAdventures: adventuresMadeToday < freeAdventuresPerDay,
        hasAnotherTaskRunning: isNaN(adventuresMadeToday),
        taskRunning: null,
    };
}

function parseCircleXMLResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Obtener todos los elementos 'member'
    const members = xmlDoc.getElementsByTagName("member");
    
    const result = {};
    
    // Iterar sobre cada elemento y procesar los valores
    for (let i = 0; i < members.length; i++) {
      const name = members[i].getElementsByTagName("name")[0]?.textContent;
      const valueString = members[i].getElementsByTagName("string")[0]?.textContent;
    
      if (name && valueString) {
        const attributes = valueString.split(":").map(Number); // Dividir los valores por ":" y convertir a números
        result[name] = attributes; // Guardar en el objeto result
      }
    }
    return result;
}



async function getCircleItems() {
    const xmlGetCircle = `
    <methodCall>
        <methodName>EvocationCircle_getCircle</methodName>
        <params>
            <param>
                <value>
                    <string>${flashvars.sessionID}</string>
                </value>
            </param>
        </params>
    </methodCall>
    `;

    const xmlCircleData = await fetchXmlData(botConfig.url, xmlGetCircle);
    return parseCircleXMLResponse(xmlCircleData);
}

function getBestCircleItem(circleItems) {
    if (circleItems[16][0] == 10)
    {
        return null;
    }
    
    if (circleItems[8][0] < ((circleItems[16][0] + 1) * 100)) {
        return 8;
    }
    if (circleItems[1][0] < ((circleItems[16][0] + 1) * 100)) {
        return 1;
    }
    if ((circleItems[15][0] < ((circleItems[16][0] + 1) * 10)) && (((circleItems[15][0] + 1) * 10) <= circleItems[9][0])  && (((circleItems[15][0] + 1) * 10) <= circleItems[10][0])) {
        return 15;
    }
    if (circleItems[9][0] < ((circleItems[16][0] + 1) * 100)) {
        return 9;
    }
    if (circleItems[10][0] < ((circleItems[16][0] + 1) * 100)) {
        return 10;
    }
    if ((circleItems[11][0] < ((circleItems[16][0] + 1) * 10)) && (((circleItems[11][0] + 1) * 10) <= (circleItems[1][0])) && (((circleItems[11][0] + 1) * 10) <= (circleItems[2][0]))) {
        return 11;
    }
    if (circleItems[2][0] < ((circleItems[16][0] + 1) * 100)) {
        return 2;
    }
    if ((circleItems[12][0] < ((circleItems[16][0] + 1) * 10)) && (((circleItems[12][0] + 1) * 10) <= (circleItems[3][0])) && (((circleItems[12][0] + 1) * 10) <= (circleItems[4][0]))) {
        return 12;
    }
    if (circleItems[3][0] < ((circleItems[16][0] + 1) * 100)) {
        return 3;
    }
    if (circleItems[4][0] < ((circleItems[16][0] + 1) * 100)) {
        return 4;
    }
    if ((circleItems[13][0] < ((circleItems[16][0] + 1) * 10)) && (((circleItems[13][0] + 1) * 10) <= (circleItems[5][0]))  && (((circleItems[13][0] + 1) * 10) <= (circleItems[6][0]))) {
        return 13;
    }
    if (circleItems[5][0] < ((circleItems[16][0] + 1) * 100)) {
        return 5;
    }
    if (circleItems[6][0] < ((circleItems[16][0] + 1) * 100)) {
        return 6;
    }
    if ((circleItems[14][0] < ((circleItems[16][0] + 1) * 10)) && (((circleItems[14][0] + 1) * 10) <= (circleItems[7][0])) && (((circleItems[14][0] + 1) * 10) <= (circleItems[8][0]))) {
        return 14;
    }
    if (circleItems[7][0] < ((circleItems[16][0] + 1) * 100)) {
        return 7;
    }


    return 16;

}

async function buyCircleItem(itemId) {
    const xmlBuyCircle = `
    <methodCall>
        <methodName>EvocationCircle_buyNode</methodName>
        <params>
            <param>
                <value>
                    <string>${flashvars.sessionID}</string>
                </value>
            </param>
            <param>
                <value>
                    <string>gold</string>
                </value>
            </param>
            <param>
                <value>
                    <int>${itemId}</int>
                </value>
            </param>
            <param>
                <value>
                    <int>1</int>
                </value>
            </param>
        </params>
    </methodCall>
    `;

    const result = await fetchXmlData(botConfig.url, xmlBuyCircle);
}


async function processCircle() {
    let oldCurrentResourcesGold = 0;
    
    while (1) {
        
        try {
            const circleItems = await getCircleItems();
            const bestItem = getBestCircleItem(circleItems);
            if (bestItem === null) {
                console.log('No more items to buy. Exiting circle process.');
                // Change the spend gold on attribute to spend gold on the character attributes.
                botConfig.spendGoldOn = "attributes";
                break;
            }
            console.log('Best item to buy:', bestItem);
            currentResources = await getCurrentResources();
            
            
            if (isNaN(currentResources.gold)) {
                console.log('Error fetching current resources. Exiting circle process.');
                break;
            }

            if (currentResources.gold == oldCurrentResourcesGold) {
                console.log('No gold change. Exiting circle process.');
                break;
            }
            oldCurrentResourcesGold = currentResources.gold;

            console.log('Current gold:', currentResources.gold);
            console.log('Current bloodstones:', currentResources.bloodstones);

            let itemCost = 0;
            if (bestItem == 16){
                itemCost = (circleItems[bestItem][11] * 2500) + 5000;
            } else if ((bestItem => 1) && (bestItem <= 10)) {
                itemCost = (circleItems[bestItem][11] * 5) + 10;
            } else if ((bestItem => 11) && (bestItem <= 15)) {
                itemCost = (circleItems[bestItem][11] * 50) + 100;
            } else {
                console.log('Invalid item ID. Exiting circle process.');
                break;
            }
            console.log('Item cost:', itemCost);
            
            // Ensure that after the purchase, at least minGoldToKeep remains
            if (currentResources.gold - itemCost >= botConfig.minGoldToSpend) {
                await buyCircleItem(bestItem);
            } else {
                console.log('Not enough gold to buy the best item while keeping the minimum reserve');
                break;
            }

        } catch (error) {
            console.error('Error in circle process:', error);
        }
        await sleep(0.5);
    }

}

const filterAdventuresByDifficulty = (adventures, difficulty) => {
    const maxDifficulty = difficultyMap[difficulty];
    return adventures.filter(adventure => adventure.difficulty <= maxDifficulty);
};

const findBestAdventure = (adventures, priority) => {
    if (priority === 'gold') {
        return adventures.reduce((max, current) => 
            current.gold > max.gold ? current : max, adventures[0]);
    } else if (priority === 'experience') {
        return adventures.reduce((max, current) => 
            current.experience > max.experience ? current : max, adventures[0]);
    } else {
        throw new Error('Invalid priority. Must be "gold" or "experience".');
    }
};

function getBestAdventure(data) {
    const { difficulty, priorityAdventure } = botConfig;

    // Filter adventures based on difficulty
    const filteredAdventures = filterAdventuresByDifficulty(data.adventures, difficulty);

    // Check if any adventures match the difficulty filter
    if (filteredAdventures.length === 0) {
        console.log('No adventures match the selected difficulty.');
        return null;
    }

    // Find the best adventure based on priority
    const bestAdventure = findBestAdventure(filteredAdventures, priorityAdventure);

    return bestAdventure;
}

function parseAnotherTaskRunningXmlResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const timeTask = parseInt(findValueByName(xmlDoc, 'time', 'i4'));
    const typeTask = findValueByName(xmlDoc, 'type', 'string');
    return {timeTask, typeTask};
}


const xmlGetAdventures = `
<methodCall>
    <methodName>GetAdventures</methodName>
    <params>
        <param>
            <value>
                <string>${flashvars.sessionID}</string>
            </value>
        </param>
    </params>
</methodCall>
`;

// Main process function
async function processAdventure() {
           
    const xmldata = await fetchXmlData(botConfig.url, xmlGetAdventures);
    const data = parseAdventureXMLResponse(xmldata);

    // Check if we have remaining adventures
    if (data.hasAnotherTaskRunning) {
        data.hasAnotherTaskRunning = true;
        data.taskRunning = await proccessCurrentTaskRunning();

    } else if (!data.hasRemainingAdventures && (!botConfig.useBloodstones || (currentResources.bloodstones <= botConfig.minBloodstonesToSpend))) {
        console.log('No more adventures available today');
        
    } else {

        if (!data.hasRemainingAdventures && botConfig.useBloodstones && (currentResources.bloodstones > botConfig.minBloodstonesToSpend)) {
            console.log('Using bloodstones to do more adventures...');
        }

        // Filter adventures and find the one with max gold
        const bestAdventure = getBestAdventure(data);
        
        console.log('Selected adventure:', bestAdventure);
        console.log(`Adventures made today: ${data.adventuresMadeToday}/${data.freeAdventuresPerDay}`);


        const xmlStartAdventure = `
            <methodCall>
                <methodName>StartAdventure</methodName>
                <params>
                    <param>
                        <value>
                            <string>${flashvars.sessionID}</string>
                        </value>
                    </param>
                    <param>
                        <value>
                            <int>${bestAdventure.id}</int>
                        </value>
                    </param>
                </params>
            </methodCall>
        `;

        const startAdventure = await fetchXmlData(botConfig.url, xmlStartAdventure);
        const duration = (bestAdventure.duration / botConfig.server_speed) + 5;
        console.log(new Date().toLocaleTimeString());
        console.log(`Waiting for ${duration} seconds before next adventure...`);
        console.log('Estimated time:', new Date(Date.now() + duration * 1000).toLocaleTimeString());
        await sleep(duration);
        console.log("Getting the result of the adventure...");
        const result = await fetchXmlData(botConfig.url, xmlGetAdventures);
        
        await sleep(2);
    }
    

    return data; // Return the data object for further processing
            
}

function parseAttributesXMLResponse(xmlString) {
    // Parse the XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Extract cost values for each attribute
    const costValues = {
        STR: parseInt(findValueByName(xmlDoc, 'cost_str', 'i4')),
        DEX: parseInt(findValueByName(xmlDoc, 'cost_dex', 'i4')),
        CON: parseInt(findValueByName(xmlDoc, 'cost_con', 'i4')),
        INT: parseInt(findValueByName(xmlDoc, 'cost_int', 'i4'))
    };
    return costValues;
}   

async function getUserAttributesCost(){
    const xmlGetAttributes = `
    <methodCall>
        <methodName>GetUserAttributes</methodName>
        <params>
            <param>
                <value>
                    <string>${flashvars.sessionID}</string>
                </value>
            </param>
        </params>
    </methodCall>
    `;

    const xmlData = await fetchXmlData(botConfig.url, xmlGetAttributes);
    return parseAttributesXMLResponse(xmlData);

}

function getLowerCostAttribute(costValues) {
    // Find the attribute with the lowest cost value
    let minAttribute = null;
    let minValue = Infinity;

    for (const [attribute, value] of Object.entries(costValues)) {
        if (value < minValue) {
            minValue = value;
            minAttribute = attribute;
        }
    }
    return minAttribute;
}

async function upgradeUserAttribute(attributeName){
    const xmlUpgradeAttribute = `
    <methodCall>
        <methodName>RaiseAttribute</methodName>
        <params>
            <param>
                <value>
                <string>${flashvars.sessionID}</string>
                </value>
            </param>
            <param>
                <value>
                    <string>${attributeName}</string>
                </value>
            </param>
        </params>
    </methodCall>
    `;

    const xmlData = await fetchXmlData(botConfig.url, xmlUpgradeAttribute);
    return xmlData;
}


async function processAttributes() {
    let costValues = await getUserAttributesCost();
    
    while (1) {
        try {
            console.log('Cost values:', costValues);
            if (costValues.STR === null) {
                console.log('Error fetching attribute costs. Exiting attribute process.');
                break;
            }
            
            let selectedAttribute = botConfig.priorityAttribute;

            if (selectedAttribute != 'MIX' && costValues[selectedAttribute] === undefined) {
                console.log('Invalid attribute selected. Setted to MIX.');
                selectedAttribute = 'MIX';
            }

            if (selectedAttribute == 'MIX') {
                selectedAttribute = getLowerCostAttribute(costValues);
            }

            console.log('Selected attribute:', selectedAttribute);
            currentResources = await getCurrentResources();

            if (isNaN(currentResources.gold)) {
                console.log('Error fetching current resources. Exiting attribute process.');
                break;
            }

            console.log('Current Gold:', currentResources.gold, '| Bloodstones:', currentResources.bloodstones);

            if(currentResources.gold >= costValues[selectedAttribute]){
                costValues = parseAttributesXMLResponse(await upgradeUserAttribute(selectedAttribute));

            } else {
                console.log('Not enough gold to upgrade the attribute');
                break;
            }
        } catch (error) {
            console.error('Error in attribute process:', error);
        }
        await sleep(0.5);
    }
}


async function runBot() {
    try {
        if (isBotRunning) {
            console.log('Bot is already running.');
            return;
        }
        isBotRunning = true;
        console.log('Starting bot process...');
        while (true) {
            // Handle gold spending based on configuration
            
            if (botConfig.spendGoldOn === 'circle') {
                console.log('Starting circle process...');
                await processCircle();
            } 

            if (botConfig.spendGoldOn === 'attributes') {
                console.log('Starting attributes process...');
                await processAttributes();
            } 
                 
            if (botConfig.spendGoldOn !== 'attributes' && botConfig.spendGoldOn !== 'circle') {
                console.error('Invalid value for spendGoldOn. Must be "attributes" or "circle".');
            }

            console.log('Starting new adventure cycle...');
            const adventureData = await processAdventure();
            if (adventureData.hasAnotherTaskRunning) {
                console.log(`Another task is running: ${adventureData.taskRunning.typeTask}`);
                // Check if task time have NaN value
                if (isNaN(adventureData.taskRunning.timeTask)) {
                    console.log('Task time is NaN. Exiting process...');
                    await sleep(10 * 60);
                } else {
                    console.log(`Waiting for ${adventureData.taskRunning.timeTask} seconds before retrying...`);
                    console.log('Estimated time:', new Date(Date.now() + adventureData.taskRunning.timeTask * 1000).toLocaleTimeString());
                    await sleep(adventureData.taskRunning.timeTask + 2);

                    /* Getting the possible result of the currently running task */
                    const result = await fetchXmlData(botConfig.url, xmlGetAdventures);
                }


            }else if (!adventureData.hasRemainingAdventures && (!botConfig.useBloodstones || (currentResources.bloodstones <= botConfig.minBloodstonesToSpend))) {
                console.log('No more adventures available. Waiting 20 minutes for next cycle...');
                await sleep(20 * 60);

            }
        }
    } catch (error) {
        console.error('Error in bot process:', error);
        console.log('Retrying in 10 minutes...');
        await sleep(10 * 60);
        isBotRunning = false;
        runBot(); // Restart the bot
    }
}


runBot();