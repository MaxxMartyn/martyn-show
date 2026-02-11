// THE MARTYN SHOW - GAMESHOW SYSTEM
// Version 1.0 - localStorage based

// ========================================
// GAMESHOW STATE
// ========================================

let gameshowState = {
    questions: [],
    teams: {},
    currentQuestionIndex: null,
    answers: {},
    gameActive: false,
    questionStartTime: null,
    leaderboard: {}
};

// ========================================
// INITIALIZE GAMESHOW
// ========================================

function initGameshow() {
    loadGameshowState();
    
    // Auto-check for updates every 5 seconds
    setInterval(checkForUpdates, 5000);
}

function loadGameshowState() {
    const saved = localStorage.getItem('gameshowState');
    if (saved) {
        gameshowState = JSON.parse(saved);
    }
    
    // Initialize teams if empty
    if (!gameshowState.teams) gameshowState.teams = {};
    if (!gameshowState.questions) gameshowState.questions = [];
    if (!gameshowState.answers) gameshowState.answers = {};
    if (!gameshowState.leaderboard) gameshowState.leaderboard = {};
}

function saveGameshowState() {
    localStorage.setItem('gameshowState', JSON.stringify(gameshowState));
    localStorage.setItem('gameshowLastUpdate', Date.now().toString());
}

// ========================================
// QUESTION MANAGEMENT (ADMIN)
// ========================================

function createQuestion(questionData) {
    const question = {
        id: Date.now() + Math.random(),
        text: questionData.text,
        type: questionData.type, // 'text', 'multiple_choice', 'true_false'
        image: questionData.image || null,
        options: questionData.options || [],
        correctAnswer: questionData.correctAnswer || null,
        points: questionData.points || 100,
        createdAt: new Date().toISOString()
    };
    
    gameshowState.questions.push(question);
    saveGameshowState();
    return question;
}

function updateQuestion(questionId, updates) {
    const index = gameshowState.questions.findIndex(q => q.id === questionId);
    if (index !== -1) {
        gameshowState.questions[index] = {
            ...gameshowState.questions[index],
            ...updates
        };
        saveGameshowState();
        return gameshowState.questions[index];
    }
    return null;
}

function deleteQuestion(questionId) {
    gameshowState.questions = gameshowState.questions.filter(q => q.id !== questionId);
    saveGameshowState();
}

function getQuestions() {
    return gameshowState.questions;
}

// ========================================
// TEAM MANAGEMENT
// ========================================

function createTeam(teamName, captainCode) {
    const teamCode = generateTeamCode();
    const team = {
        id: Date.now() + Math.random(),
        code: teamCode,
        name: teamName,
        captainCode: captainCode,
        members: [captainCode],
        score: 0,
        createdAt: new Date().toISOString()
    };
    
    gameshowState.teams[teamCode] = team;
    
    // Initialize leaderboard entry
    gameshowState.leaderboard[teamCode] = {
        teamName: teamName,
        score: 0,
        correctAnswers: 0
    };
    
    saveGameshowState();
    return team;
}

function joinTeam(teamCode, memberCode) {
    const team = gameshowState.teams[teamCode];
    if (!team) return { success: false, error: 'Team not found' };
    
    if (team.members.includes(memberCode)) {
        return { success: true, team: team };
    }
    
    team.members.push(memberCode);
    saveGameshowState();
    return { success: true, team: team };
}

function generateTeamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    if (gameshowState.teams[code]) {
        return generateTeamCode();
    }
    
    return code;
}

function getTeamByCode(teamCode) {
    return gameshowState.teams[teamCode] || null;
}

function getTeamByMember(memberCode) {
    for (let teamCode in gameshowState.teams) {
        const team = gameshowState.teams[teamCode];
        if (team.members.includes(memberCode)) {
            return team;
        }
    }
    return null;
}

function isTeamCaptain(teamCode, guestCode) {
    const team = gameshowState.teams[teamCode];
    return team && team.captainCode === guestCode;
}

function getAllTeams() {
    return Object.values(gameshowState.teams);
}

function setCaptain(teamCode, newCaptainCode) {
    const team = gameshowState.teams[teamCode];
    if (!team) return false;
    
    // Check if new captain is a member
    if (!team.members.includes(newCaptainCode)) {
        return false;
    }
    
    team.captainCode = newCaptainCode;
    saveGameshowState();
    return true;
}

// ========================================
// GAME CONTROL (ADMIN)
// ========================================

function startQuestion(questionIndex) {
    if (questionIndex < 0 || questionIndex >= gameshowState.questions.length) {
        return { success: false, error: 'Invalid question index' };
    }
    
    gameshowState.currentQuestionIndex = questionIndex;
    gameshowState.gameActive = true;
    gameshowState.questionStartTime = Date.now();
    gameshowState.answers = {}; // Clear previous answers
    
    saveGameshowState();
    return { success: true, question: gameshowState.questions[questionIndex] };
}

function endQuestion() {
    gameshowState.gameActive = false;
    saveGameshowState();
}

function getCurrentQuestion() {
    if (gameshowState.currentQuestionIndex === null) return null;
    return gameshowState.questions[gameshowState.currentQuestionIndex];
}

function isGameActive() {
    return gameshowState.gameActive;
}

// ========================================
// ANSWER SUBMISSION (GUESTS)
// ========================================

function submitAnswer(teamCode, guestCode, answer) {
    // Check if team exists
    const team = gameshowState.teams[teamCode];
    if (!team) return { success: false, error: 'Team not found' };
    
    // Check if guest is captain
    if (!isTeamCaptain(teamCode, guestCode)) {
        return { success: false, error: 'Only team captain can answer' };
    }
    
    // Check if game is active
    if (!gameshowState.gameActive) {
        return { success: false, error: 'No active question' };
    }
    
    // Store answer
    gameshowState.answers[teamCode] = {
        answer: answer,
        submittedAt: Date.now(),
        teamName: team.name
    };
    
    saveGameshowState();
    return { success: true };
}

function getAnswers() {
    return gameshowState.answers;
}

function getAnswerCount() {
    return Object.keys(gameshowState.answers).length;
}

function hasTeamAnswered(teamCode) {
    return gameshowState.answers.hasOwnProperty(teamCode);
}

// ========================================
// SCORING (ADMIN)
// ========================================

function awardPoints(teamCode, points) {
    const team = gameshowState.teams[teamCode];
    if (!team) return false;
    
    team.score += points;
    
    // Update leaderboard
    if (!gameshowState.leaderboard[teamCode]) {
        gameshowState.leaderboard[teamCode] = {
            teamName: team.name,
            score: 0,
            correctAnswers: 0
        };
    }
    
    gameshowState.leaderboard[teamCode].score += points;
    gameshowState.leaderboard[teamCode].correctAnswers += 1;
    
    saveGameshowState();
    return true;
}

function markAnswerCorrect(teamCode) {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return false;
    
    return awardPoints(teamCode, currentQuestion.points);
}

function getLeaderboard() {
    // Convert to array and sort by score
    const leaderboard = Object.values(gameshowState.leaderboard)
        .sort((a, b) => b.score - a.score);
    
    return leaderboard;
}

function resetScores() {
    // Reset all team scores
    Object.values(gameshowState.teams).forEach(team => {
        team.score = 0;
    });
    
    // Reset leaderboard
    gameshowState.leaderboard = {};
    Object.values(gameshowState.teams).forEach(team => {
        gameshowState.leaderboard[team.code] = {
            teamName: team.name,
            score: 0,
            correctAnswers: 0
        };
    });
    
    saveGameshowState();
}

// ========================================
// SYNC SYSTEM
// ========================================

function checkForUpdates() {
    const lastUpdate = localStorage.getItem('gameshowLastUpdate');
    const myLastCheck = localStorage.getItem('myLastCheck');
    
    if (lastUpdate && myLastCheck && parseInt(lastUpdate) > parseInt(myLastCheck)) {
        // There's an update!
        showUpdateNotification();
    }
}

function showUpdateNotification() {
    const notification = document.getElementById('sync-notification');
    if (notification) {
        notification.classList.remove('hidden');
    }
}

function syncGameshow() {
    loadGameshowState();
    localStorage.setItem('myLastCheck', Date.now().toString());
    
    const notification = document.getElementById('sync-notification');
    if (notification) {
        notification.classList.add('hidden');
    }
    
    // Reload current view
    if (typeof loadGameshowView === 'function') {
        loadGameshowView();
    }
}

// ========================================
// ADMIN HELPERS
// ========================================

function getGameStats() {
    return {
        totalQuestions: gameshowState.questions.length,
        totalTeams: Object.keys(gameshowState.teams).length,
        currentQuestion: gameshowState.currentQuestionIndex !== null ? gameshowState.currentQuestionIndex + 1 : 0,
        answersReceived: getAnswerCount(),
        gameActive: gameshowState.gameActive
    };
}

function resetGameshow() {
    if (!confirm('Are you sure? This will delete ALL questions, teams, and scores!')) {
        return false;
    }
    
    gameshowState = {
        questions: [],
        teams: {},
        currentQuestionIndex: null,
        answers: {},
        gameActive: false,
        questionStartTime: null,
        leaderboard: {}
    };
    
    saveGameshowState();
    return true;
}

// ========================================
// EXPORT FOR BIG SCREEN
// ========================================

function getGameshowDisplayData() {
    const currentQuestion = getCurrentQuestion();
    const answers = getAnswers();
    const leaderboard = getLeaderboard();
    const teams = getAllTeams();
    
    return {
        question: currentQuestion,
        questionNumber: gameshowState.currentQuestionIndex !== null ? gameshowState.currentQuestionIndex + 1 : 0,
        totalQuestions: gameshowState.questions.length,
        answers: answers,
        leaderboard: leaderboard,
        teams: teams,
        gameActive: gameshowState.gameActive,
        answersReceived: getAnswerCount(),
        totalTeams: teams.length
    };
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initGameshow);
}
