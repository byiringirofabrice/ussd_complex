const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3306;

app.use(bodyParser.urlencoded({ extended: false }));

// Create a connection to the MySQL database
const db = mysql.createConnection({
    host: 'bc8ha5yxbt3tz4602aw0-mysql.services.clever-cloud.com',
    user: 'ugfuuybkavzrt6h5',
    password: 'z89Qx9n2YTyGkAzLh1l8', // Replace with your MySQL password
    database: 'bc8ha5yxbt3tz4602aw0'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// In-memory storage for votes (for simplicity)
let votes = {
    "BYIRINGIRO Fabrice ": 2,
    "Fabien ": 1,
    "Benitha ": 1,
    "Johnthan ": 3,
    "Moise ": 2
};

// In-memory storage for user data (for simplicity)
let userNames = {};
let voters = new Set(); // Set to track phone numbers that have already voted
let userLanguages = {}; // Object to store the language preference of each user

app.post('/ussd', (req, res) => {
    let response = '';

    // Extract USSD input
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Parse user input
    const userInput = text.split('*').map(option => option.trim());

    // Determine next action based on user input
    if (userInput.length === 1 && userInput[0] === '') {
        // First level menu: Language selection
        response = `CON Welcome to ildephonse voting booth\n`;
        response += `1. English\n`;
        response += `2. kinyarwanda`;
    } else if (userInput.length === 1 && userInput[0] !== '') {
        // Save user's language choice and move to the name input menu
        userLanguages[phoneNumber] = userInput[0] === '1' ? 'en' : 'sw';
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Please enter your name:` : 
            `CON andika izina ryawe:`;
    } else if (userInput.length === 2) {
        // Save user's name
        userNames[phoneNumber] = userInput[1];

        // Third level menu: Main menu
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Hi ${userNames[phoneNumber]}, choose an option:\n1. Vote Candidate\n2. View Votes` : 
            `CON Amakuru ${userNames[phoneNumber]}, hitamo:\n1. umukandida\n2. reba abakandida`;
    } else if (userInput.length === 3) {
        if (userInput[2] === '1') {
            // Check if the phone number has already voted
            if (voters.has(phoneNumber)) {
                response = userLanguages[phoneNumber] === 'en' ? 
                    `END You have already voted. Thank you!` : 
                    `END watoye. urakoze!`;
            } else {
                // Voting option selected
                response = userLanguages[phoneNumber] === 'en' ? 
                    `CON Select a candidate:\n1. BYIRINGIRO Fabrice\n2. Fabien\n3. Benitha\n4. Johnathan\n5. Moise` : 
                    `CON hitamo umukandida:\n1. BYIRINGIRO Fabrice\n2. Fabien \n3. Benitha\n4. Johnathan\n5. Moise` ;}
        } else if (userInput[2] === '2') {
            // View votes option selected
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Votes:\n` : 
                `END tora:\n`;
            for (let candidate in votes) {
                response += `${candidate}: ${votes[candidate]} votes\n`;
            }
        }
    } else if (userInput.length === 4) {
        // Fourth level menu: Voting confirmation
        let candidateIndex = parseInt(userInput[3]) - 1;
        let candidateNames = Object.keys(votes);
        if (candidateIndex >= 0 && candidateIndex < candidateNames.length) {
            votes[candidateNames[candidateIndex]] += 1;
            voters.add(phoneNumber); // Mark this phone number as having voted
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Thank you for voting for ${candidateNames[candidateIndex]}!` : 
                `END urakoze gutora ${candidateNames[candidateIndex]}!`;

            // Insert voting record into the database
            const voteData = {
                session_id: sessionId,
                phone_number: phoneNumber,
                user_name: userNames[phoneNumber],
                language_used: userLanguages[phoneNumber],
                voted_candidate: candidateNames[candidateIndex]
            };

            const query = 'INSERT INTO votes SET ?';
            db.query(query, voteData, (err, result) => {
                if (err) {
                    console.error('Error inserting data into database:', err.stack);
                }
            });
        } else {
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Invalid selection. Please try again.` : 
                `END uhisemo ibitaribyo. ongera ugerageze.`;
        }
    }

    res.send(response);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
