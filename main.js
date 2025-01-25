

const botConfig = {
    // Priority: 'experience' or 'gold'
    priority: 'gold',

    // Difficulty range: 'easy', 'medium', 'difficult', 'very_difficult'
    difficulty: 'medium',

    // After each adventure, spend gold on: 'attributes' or 'circle'
    spendGoldOn: 'attributes',

    // Additional settings (optional)
    minGoldToSpend: 0, // Minimum gold required to spend if you want to safe some gold
};


const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

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





function parseGoldXMLResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Find all 'member' elements
    const members = xmlDoc.getElementsByTagName("member");
    
    // Loop through to find the 'gold' member and its value
    let goldValue;
    for (let i = 0; i < members.length; i++) {
      const name = members[i].getElementsByTagName("name")[0]?.textContent;
      if (name === "gold") {
        goldValue = members[i].getElementsByTagName("i4")[0]?.textContent;
        break;
      }
    }
    
    return parseInt(goldValue);
}

async function getCurrentGold(){
    const xmlGetGold = `
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
    
    const xmlGoldData = await fetchXmlData('https://s2-en.tanoth.gameforge.com/xmlrpc', xmlGetGold);
    return parseGoldXMLResponse(xmlGoldData);
}



function parseAdventureXMLResponse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    const adventures = xmlDoc.querySelectorAll('array > data > value > struct');
    
    const extractedData = Array.from(adventures).map(adventure => {
        const findValueByName = (struct, name) => {
            const members = struct.getElementsByTagName('member');
            for (const member of members) {
                const nameElement = member.getElementsByTagName('name')[0];
                if (nameElement.textContent === name) {
                    return member.getElementsByTagName('value')[0]
                        .getElementsByTagName('i4')[0].textContent;
                }
            }
            return null;
        };

        return {
            difficulty: parseInt(findValueByName(adventure, 'difficulty')),
            gold: parseInt(findValueByName(adventure, 'gold')),
            experience: parseInt(findValueByName(adventure, 'experience')),
            duration: parseInt(findValueByName(adventure, 'duration')),
            id: parseInt(findValueByName(adventure, 'quest_id'))
        };
    });
    
    // Find adventure counts using the same findValueByName logic
    const findAnswerValue = (name) => {
        const members = xmlDoc.getElementsByTagName('member');
        for (const member of members) {
            const nameElement = member.getElementsByTagName('name')[0];
            if (nameElement && nameElement.textContent === name) {
                return member.getElementsByTagName('value')[0]
                    .getElementsByTagName('i4')[0].textContent;
            }
        }
        return null;
    };

    const adventuresMadeToday = parseInt(findAnswerValue('adventures_made_today'));
    const freeAdventuresPerDay = parseInt(findAnswerValue('free_adventures_per_day'));
    
    return {
        adventures: extractedData,
        adventuresMadeToday,
        freeAdventuresPerDay,
        hasRemainingAdventures: adventuresMadeToday < freeAdventuresPerDay
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

    const xmlCircleData = await fetchXmlData('https://s2-en.tanoth.gameforge.com/xmlrpc', xmlGetCircle);
    return parseCircleXMLResponse(xmlCircleData);
}

function getBestCircleItem(circleItems) {
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
        </params>
    </methodCall>
    `;

    await fetchXmlData('https://s2-en.tanoth.gameforge.com/xmlrpc', xmlBuyCircle);
}


async function processCircle() {
    while (1) {
        
        try {
            const circleItems = await getCircleItems();
            const bestItem = getBestCircleItem(circleItems);
            console.log('Best item to buy:', bestItem);
            const currentGold = await getCurrentGold();
            console.log('Current gold:', await getCurrentGold());
            if(currentGold >= circleItems[bestItem][3]){
                await buyCircleItem(bestItem);
            } else {
                console.log('Not enough gold to buy the best item');
                break;
            }

        } catch (error) {
            console.error('Error in circle process:', error);
        }
        await sleep(0.5);
    }

}


// Main process function
async function processAdventure() {
    // Sleep function to wait for specified seconds
    
    const url = 'https://s2-en.tanoth.gameforge.com/xmlrpc';

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

    try {
        while (true) {
            console.log('Starting circle process...');
            await processCircle();

            console.log('Starting new adventure cycle...');
            
            const xmldata = await fetchXmlData(url, xmlGetAdventures);
            const data = parseAdventureXMLResponse(xmldata);
            // Check if we have remaining adventures
            if (!data.hasRemainingAdventures) {
                console.log('No more adventures available today');
                return; // Exit the loop
            }
            
            // Filter adventures and find the one with max gold
            const easyAdventures = data.adventures.filter(adventure => adventure.difficulty < 1);
            const bestAdventure = easyAdventures.reduce((max, current) => 
                current.gold > max.gold ? current : max, easyAdventures[0]);
            
            console.log('Selected adventure:', bestAdventure);
            console.log(`Adventures made today: ${data.adventuresMadeToday}/${data.freeAdventuresPerDay}`);
            console.log('Remaining adventures:', data.freeAdventuresPerDay - data.adventuresMadeToday);


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

            const startAdventure = await fetchXmlData(url, xmlStartAdventure);
            const duration = bestAdventure.duration / 2+10;
            console.log(new Date().toLocaleTimeString());
            console.log(`Waiting for ${duration} seconds before next adventure...`);
            console.log('Estimated time:', new Date(Date.now() + duration * 1000).toLocaleTimeString());
            await sleep(duration);
            console.log("Getting the result of the adventure...");
            const result = await fetchXmlData(url, xmlGetAdventures);
            
            await sleep(2);
            
        }
    } catch (error) {
        console.error('Error in adventure process:', error);
        console.log('Retrying in 60 seconds...');
        await sleep(60);
        processAdventure();
    }
}

processAdventure();

function parseAttributesXMLResponse(xmlString) {
    // Parse the XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Function to get the cost value for a given attribute
    function getCostValue(attribute) {
        // Find all <member> nodes
        const members = xmlDoc.querySelectorAll('member');
        for (const member of members) {
            // Check if the <name> node matches the attribute
            const nameNode = member.querySelector('name');
            if (nameNode && nameNode.textContent === `cost_${attribute}`) {
                // Get the corresponding <i4> value
                const valueNode = member.querySelector('value > i4');
                if (valueNode) {
                    return parseInt(valueNode.textContent, 10);
                }
            }
        }
        return null; // Return null if not found
    }

    // Extract cost values for each attribute
    const costValues = {
        STR: getCostValue('str'),
        DEX: getCostValue('dex'),
        INT: getCostValue('int'),
        CON: getCostValue('con')
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

    const xmlData = await fetchXmlData('https://s2-en.tanoth.gameforge.com/xmlrpc', xmlGetAttributes);
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

    const xmlData = await fetchXmlData('https://s2-en.tanoth.gameforge.com/xmlrpc', xmlUpgradeAttribute);
    return xmlData;
}


async function processAttributes() {
    let costValues = await getUserAttributesCost();
    
    while (1) {
        try {
            console.log('Cost values:', costValues);
            const lowerCostAttribute = getLowerCostAttribute(costValues);
            console.log('Lower cost attribute:', lowerCostAttribute);
            const currentGold = await getCurrentGold();
            console.log('Current gold:', currentGold);
            if(currentGold >= costValues[lowerCostAttribute]){
                costValues = parseAttributesXMLResponse(upgradeUserAttribute(lowerCostAttribute));
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
    // Sleep function to wait for specified seconds
    
    const url = 'https://s2-en.tanoth.gameforge.com/xmlrpc';

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

    try {
        while (true) {
            console.log('Starting circle process...');
            await processCircle();

            console.log('Starting new adventure cycle...');
            
            const xmldata = await fetchXmlData(url, xmlGetAdventures);
            const data = parseAdventureXMLResponse(xmldata);
            // Check if we have remaining adventures
            if (!data.hasRemainingAdventures) {
                console.log('No more adventures available today');
                return; // Exit the loop
            }
            
            // Filter adventures and find the one with max gold
            const easyAdventures = data.adventures.filter(adventure => adventure.difficulty < 1);
            const bestAdventure = easyAdventures.reduce((max, current) => 
                current.gold > max.gold ? current : max, easyAdventures[0]);
            
            console.log('Selected adventure:', bestAdventure);
            console.log(`Adventures made today: ${data.adventuresMadeToday}/${data.freeAdventuresPerDay}`);
            console.log('Remaining adventures:', data.freeAdventuresPerDay - data.adventuresMadeToday);


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

            const startAdventure = await fetchXmlData(url, xmlStartAdventure);
            const duration = bestAdventure.duration / 2+10;
            console.log(new Date().toLocaleTimeString());
            console.log(`Waiting for ${duration} seconds before next adventure...`);
            console.log('Estimated time:', new Date(Date.now() + duration * 1000).toLocaleTimeString());
            await sleep(duration);
            console.log("Getting the result of the adventure...");
            const result = await fetchXmlData(url, xmlGetAdventures);
            
            await sleep(2);
            
        }
    } catch (error) {
        console.error('Error in adventure process:', error);
        console.log('Retrying in 60 seconds...');
        await sleep(60);
        processAdventure();
    }
}

