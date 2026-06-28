
const USERS = {
    'admin': { 
        password: 'admin123', 
        role: 'admin', 
        name: 'System Administrator',
        permissions: ['view_all', 'edit_all', 'delete_all', 'evaluate_all', 'generate_certificates', 'export_data', 'register_applicants', 'schedule_tests', 'record_scores']
    },
    'supervisor': { 
        password: 'super123', 
        role: 'supervisor', 
        name: 'Test Supervisor',
        permissions: ['view_all', 'evaluate_all', 'schedule_tests', 'generate_certificates', 'record_scores']
    },
    'examiner': { 
        password: 'exam123', 
        role: 'examiner', 
        name: 'Driving Examiner',
        permissions: ['view_assigned', 'record_scores', 'evaluate_assigned']
    },
    'registrar': { 
        password: 'reg123', 
        role: 'registrar', 
        name: 'Registration Officer',
        permissions: ['register_applicants', 'view_all', 'schedule_tests']
    },
    'instructor': {
        password: 'instr123',
        role: 'instructor',
        name: 'Driving Instructor',
        permissions: ['view_assigned', 'record_scores']
    },
    'analyst': {
        password: 'analyst123',
        role: 'analyst',
        name: 'Data Analyst',
        permissions: ['view_all', 'export_data']
    },
    'user': {
        password: 'user123',
        role: 'user',
        name: 'Standard User',
        permissions: ['view_assigned']
    }
};

// ======================= GLOBAL VARIABLES =======================
let currentUser = null;
let currentUserRole = null;
let currentUserPermissions = [];
let applicantsDB = [];
let nextApplicantId = 1001;
let nextCertId = 5000;
let currentSelectedApplicant = null;
let currentCertificateApp = null;
let deleteTargetId = null;
let isSaving = false;
let searchTimeout = null;
let evalSearchTimeout = null;

// ======================= DOM REFERENCES =======================
const $ = id => document.getElementById(id);
const loginPanel = $('loginPanel');
const mainApp = $('mainApp');
const loginUsername = $('loginUsername');
const loginPassword = $('loginPassword');
const loginBtn = $('loginBtn');
const loginError = $('loginError');
const logoutBtn = $('logoutBtn');

const registrationForm = $('registrationForm');
const fullName = $('fullName');
const nationalId = $('nationalId');
const dob = $('dob');
const sex = $('sex');
const phone = $('phone');
const address = $('address');
const school = $('school');
const photoUpload = $('photoUpload');
const photoPreview = $('photoPreview');
const registerBtn = $('registerBtn');
const regMessage = $('regMessage');

const scheduleApplicantSelect = $('scheduleApplicantSelect');
const applicantSearchInput = $('applicantSearchInput');
const searchResultsCount = $('searchResultsCount');
const testCenter = $('testCenter');
const examiner = $('examiner');
const testDateTime = $('testDateTime');
const scheduleTestBtn = $('scheduleTestBtn');
const scheduleMessage = $('scheduleMessage');

const applicantListContainer = $('applicantListContainer');
const totalApplicants = $('totalApplicants');
const passedApplicants = $('passedApplicants');
const certifiedApplicants = $('certifiedApplicants');
const syncStatus = $('syncStatus');

const theorySlider = $('theorySlider');
const theoryVal = $('theoryVal');
const theoryScoreDisplay = $('theoryScoreDisplay');
const recordTheoryBtn = $('recordTheoryBtn');
const theoryStatusMsg = $('theoryStatusMsg');

const practicalSlider = $('practicalSlider');
const practicalVal = $('practicalVal');
const practicalScoreDisplay = $('practicalScoreDisplay');
const recordPracticalBtn = $('recordPracticalBtn');
const practicalStatusMsg = $('practicalStatusMsg');

const evaluationApplicantSelect = $('evaluationApplicantSelect');
const evaluationSearch = $('evaluationSearch');
const evaluationSearchCount = $('evaluationSearchCount');
const loadEvaluationBtn = $('loadEvaluationBtn');
const selectedApplicantInfo = $('selectedApplicantInfo');
const evalTheoryScore = $('evalTheoryScore');
const evalPracticalScore = $('evalPracticalScore');
const evaluateFinalBtn = $('evaluateFinalBtn');
const resetToRetest = $('resetToRetest');
const clearEvaluationBtn = $('clearEvaluationBtn');
const evaluationOutput = $('evaluationOutput');
const evalTotalCount = $('evalTotalCount');

const generateCertBtn = $('generateCertBtn');
const downloadPdfBtn = $('downloadPdfBtn');
const printCertBtn = $('printCertBtn');
const certificatePreview = $('certificatePreview');
const certDetails = $('certDetails');
const qrCodeSim = $('qrCodeSim');
const certMessage = $('certMessage');
const printCertificate = $('printCertificate');

const loadingOverlay = $('loadingOverlay');
const loadingText = $('loadingText');
const deleteModal = $('deleteModal');
const deleteApplicantName = $('deleteApplicantName');
const confirmDeleteBtn = $('confirmDeleteBtn');
const toast = $('toast');

// ======================= TOAST SYSTEM =======================
function showToast(message, type = 'info', duration = 3000) {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ======================= LOADING OVERLAY =======================
function showLoading(text = 'Processing...') {
    loadingText.textContent = text;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// ======================= PERMISSION CHECK FUNCTIONS =======================
function hasPermission(permission) {
    if (!currentUserPermissions) return false;
    return currentUserPermissions.includes(permission);
}

function getUserRole() {
    return currentUserRole;
}

function getCurrentUsername() {
    return currentUser;
}

// ======================= AUTHENTICATION FUNCTIONS =======================
function populateLoginUsers() {
    var select = document.getElementById('loginUsername');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select User --</option>';
    for (var user in USERS) {
        var option = document.createElement('option');
        option.value = user;
        option.textContent = user + ' (' + USERS[user].role + ')';
        select.appendChild(option);
    }
}

function loginUser() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
        loginError.textContent = 'Please enter username and password.';
        loginError.style.display = 'block';
        return;
    }

    // Check if user exists in USERS object
    if (USERS[username] && USERS[username].password === password) {
        currentUser = username;
        currentUserRole = USERS[username].role;
        currentUserPermissions = USERS[username].permissions;
        
        // Save session
        sessionStorage.setItem('drivecomp_session', JSON.stringify({ username: username }));
        
        loginError.style.display = 'none';
        loginPanel.style.display = 'none';
        mainApp.style.display = 'grid';
        logoutBtn.style.display = 'inline-block';
        
        // Update UI based on user role
        updateUIForUserRole();
        displayUserInfo();
        
        showToast(`Welcome, ${USERS[username].name}! (${USERS[username].role})`, 'success');
        loadFromGoogleSheets();
        populateSelects();
    } else {
        loginError.textContent = 'Invalid username or password.';
        loginError.style.display = 'block';
        showToast('❌ Invalid credentials. Please try again.', 'error');
    }
}

function logoutUser() {
    currentUser = null;
    currentUserRole = null;
    currentUserPermissions = [];
    sessionStorage.removeItem('drivecomp_session');
    loginPanel.style.display = 'block';
    mainApp.style.display = 'none';
    logoutBtn.style.display = 'none';
    loginPassword.value = '';
    loginUsername.value = '';
    var userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.remove();
    showToast('Logged out successfully.', 'info');
}

// ======================= UI UPDATE BASED ON USER ROLE =======================
function displayUserInfo() {
    var existing = document.getElementById('userInfo');
    if (existing) existing.remove();

    if (currentUser) {
        var userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.className = 'user-info';
        userInfo.style.cssText = 'display:flex; align-items:center; gap:15px; padding:10px; background:#f0f4f8; border-radius:12px; margin-bottom:15px; flex-wrap:wrap;';
        userInfo.innerHTML = `
            <span style="font-weight:bold;">👤 ${USERS[currentUser].name}</span>
            <span class="badge" style="background:#1e6f5c; color:white; padding:4px 12px; border-radius:40px; font-size:0.75rem;">${currentUserRole.toUpperCase()}</span>
            <span style="font-size:0.8rem; color:#6b7280;">Permissions: ${currentUserPermissions.length}</span>
            <span style="font-size:0.7rem; color:#6b7280; margin-left:auto;">Logged in as: ${currentUser}</span>
        `;
        var header = document.querySelector('.header');
        if (header) {
            header.appendChild(userInfo);
        }
    }
}

function updateUIForUserRole() {
    // Get all sections
    const allCards = document.querySelectorAll('.card');
    const registrationCard = document.querySelector('.card:first-child');
    const schedulingCard = document.querySelector('.card:nth-child(2)');
    const listCard = document.querySelector('.card:nth-child(3)');
    const theoryCard = document.querySelector('.card:nth-child(4)');
    const practicalCard = document.querySelector('.card:nth-child(5)');
    const evaluationCard = document.querySelector('.card:nth-child(6)');
    const certificateCard = document.querySelector('.card:nth-child(7)');

    // Admin - full access (show everything)
    if (currentUserRole === 'admin') {
        allCards.forEach(card => card.style.display = 'block');
        document.querySelectorAll('button').forEach(btn => btn.disabled = false);
        return;
    }

    // Supervisor - can evaluate and manage tests
    if (currentUserRole === 'supervisor') {
        allCards.forEach(card => card.style.display = 'block');
        document.querySelectorAll('.btn-delete').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.btn-edit').forEach(btn => btn.style.display = 'none');
        // Enable all functional buttons
        document.querySelectorAll('button:not(.btn-delete):not(.btn-edit)').forEach(btn => btn.disabled = false);
        showToast('Supervisor access: You can evaluate and manage tests.', 'info');
    }

    // Examiner - only scoring and evaluation
    if (currentUserRole === 'examiner') {
        if (registrationCard) registrationCard.style.display = 'none';
        if (schedulingCard) schedulingCard.style.display = 'none';
        if (listCard) listCard.style.display = 'block';
        if (theoryCard) theoryCard.style.display = 'block';
        if (practicalCard) practicalCard.style.display = 'block';
        if (evaluationCard) evaluationCard.style.display = 'block';
        if (certificateCard) certificateCard.style.display = 'none';
        
        // Enable scoring buttons
        if (recordTheoryBtn) recordTheoryBtn.disabled = false;
        if (recordPracticalBtn) recordPracticalBtn.disabled = false;
        if (evaluateFinalBtn) evaluateFinalBtn.disabled = false;
        if (loadEvaluationBtn) loadEvaluationBtn.disabled = false;
        
        // Disable delete and edit
        document.querySelectorAll('.btn-delete').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.btn-edit').forEach(btn => btn.style.display = 'none');
        
        // Disable certificate generation
        if (generateCertBtn) generateCertBtn.disabled = true;
        if (downloadPdfBtn) downloadPdfBtn.disabled = true;
        if (printCertBtn) printCertBtn.disabled = true;
        
        showToast('Examiner access: You can record scores and evaluate applicants.', 'info');
    }

    // Registrar - only registration and scheduling
    if (currentUserRole === 'registrar') {
        if (registrationCard) registrationCard.style.display = 'block';
        if (schedulingCard) schedulingCard.style.display = 'block';
        if (listCard) listCard.style.display = 'block';
        if (theoryCard) theoryCard.style.display = 'none';
        if (practicalCard) practicalCard.style.display = 'none';
        if (evaluationCard) evaluationCard.style.display = 'none';
        if (certificateCard) certificateCard.style.display = 'none';
        
        // Enable registration and scheduling buttons
        if (registerBtn) registerBtn.disabled = false;
        if (scheduleTestBtn) scheduleTestBtn.disabled = false;
        
        // Disable scoring and evaluation
        if (recordTheoryBtn) recordTheoryBtn.disabled = true;
        if (recordPracticalBtn) recordPracticalBtn.disabled = true;
        if (evaluateFinalBtn) evaluateFinalBtn.disabled = true;
        if (generateCertBtn) generateCertBtn.disabled = true;
        
        document.querySelectorAll('.btn-delete').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.btn-edit').forEach(btn => btn.style.display = 'none');
        
        showToast('Registrar access: You can register applicants and schedule tests.', 'info');
    }

    // Instructor - only view and record scores
    if (currentUserRole === 'instructor') {
        if (registrationCard) registrationCard.style.display = 'none';
        if (schedulingCard) schedulingCard.style.display = 'none';
        if (listCard) listCard.style.display = 'block';
        if (theoryCard) theoryCard.style.display = 'block';
        if (practicalCard) practicalCard.style.display = 'block';
        if (evaluationCard) evaluationCard.style.display = 'none';
        if (certificateCard) certificateCard.style.display = 'none';
        
        // Enable score recording
        if (recordTheoryBtn) recordTheoryBtn.disabled = false;
        if (recordPracticalBtn) recordPracticalBtn.disabled = false;
        
        // Disable evaluation and certificates
        if (evaluateFinalBtn) evaluateFinalBtn.disabled = true;
        if (generateCertBtn) generateCertBtn.disabled = true;
        if (loadEvaluationBtn) loadEvaluationBtn.disabled = true;
        
        document.querySelectorAll('.btn-delete').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.btn-edit').forEach(btn => btn.style.display = 'none');
        
        showToast('Instructor access: You can record scores only.', 'info');
    }

    // Analyst - only view and export
    if (currentUserRole === 'analyst') {
        if (registrationCard) registrationCard.style.display = 'none';
        if (schedulingCard) schedulingCard.style.display = 'none';
        if (listCard) listCard.style.display = 'block';
        if (theoryCard) theoryCard.style.display = 'none';
        if (practicalCard) practicalCard.style.display = 'none';
        if (evaluationCard) evaluationCard.style.display = 'none';
        if (certificateCard) certificateCard.style.display = 'none';
        
        // Keep export button enabled
        const exportBtn = document.querySelector('#exportExcelBtn');
        if (exportBtn) exportBtn.disabled = false;
        
        // Disable all other buttons
        document.querySelectorAll('button:not(#exportExcelBtn)').forEach(btn => btn.disabled = true);
        
        showToast('Analyst access: You can view and export data only.', 'info');
    }

    // Standard user - view only
    if (currentUserRole === 'user') {
        if (registrationCard) registrationCard.style.display = 'none';
        if (schedulingCard) schedulingCard.style.display = 'none';
        if (listCard) listCard.style.display = 'block';
        if (theoryCard) theoryCard.style.display = 'none';
        if (practicalCard) practicalCard.style.display = 'none';
        if (evaluationCard) evaluationCard.style.display = 'none';
        if (certificateCard) certificateCard.style.display = 'none';
        
        // Disable all buttons
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
        
        showToast('View-only access: You can view applicant data only.', 'info');
    }
}

// ======================= GOOGLE SHEETS FUNCTIONS =======================

async function loadFromGoogleSheets() {
    try {
        showLoading('Loading data from Google Sheets...');
        updateSyncStatus('syncing', 'Loading...');

        const response = await fetch(GOOGLE_SHEETS_API_URL + '?action=load');

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        const result = await response.json();
        console.log('Load response:', result);

        // Ensure passportPhoto is properly preserved when loading from storage
applicantsDB = applicantsDB.map(app => ({
    ...app,
    passportPhoto: app.passportPhoto || getDefaultPlaceholder()
}));

        if (result && result.success && result.data && Array.isArray(result.data.applicants)) {
            applicantsDB = result.data.applicants;

            if (applicantsDB.length > 0) {
                const maxId = Math.max.apply(null, applicantsDB.map(function(a) { return parseInt(a.id) || 0; }));
                nextApplicantId = Math.max(maxId + 1, 1001);
            }

            renderAll();
            updateSyncStatus('synced', 'Loaded ' + applicantsDB.length + ' records');
            showToast('✅ Loaded ' + applicantsDB.length + ' applicants from Google Sheets', 'success');

            if (applicantsDB.length > 0) {
                selectApplicant(applicantsDB[0].id);
            }

            return true;
        } else {
            throw new Error(result ? result.message : 'Invalid response');
        }
    } catch (error) {
        console.error('Load error:', error);
        updateSyncStatus('error', 'Load failed');
        showToast('❌ Failed to load: ' + error.message, 'error');
        return false;
    } finally {
        hideLoading();
    }
}

async function saveToGoogleSheets(applicantData) {
    if (isSaving) {
        showToast('⏳ Saving in progress...', 'warning');
        return false;
    }

    try {
        isSaving = true;
        showLoading('Saving to Google Sheets...');
        updateSyncStatus('syncing', 'Saving...');

        const dataToSave = applicantData || applicantsDB;
        
        if (!dataToSave || dataToSave.length === 0) {
            showToast('⚠️ No data to save.', 'warning');
            return false;
        }

        const formData = new FormData();
        formData.append('action', 'syncAll');
        formData.append('applicants', JSON.stringify(dataToSave));

        console.log('Saving ' + dataToSave.length + ' applicants to Google Sheets');

        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        const data = await response.json();
        console.log('Save response:', data);

        if (data && data.success) {
            updateSyncStatus('synced', '✅ Saved ' + applicantsDB.length + ' records');
            showToast('✅ Saved ' + applicantsDB.length + ' applicants successfully!', 'success');
            return true;
        } else {
            throw new Error(data ? data.message : 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Save error:', error);
        updateSyncStatus('error', 'Save failed');
        showToast('❌ Save failed: ' + error.message, 'error');
        return false;
    } finally {
        isSaving = false;
        hideLoading();
    }
}

// ======================= HELPER FUNCTIONS =======================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function getDefaultPlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, 200, 240);
    ctx.strokeStyle = '#0b3a2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 200, 240);
    ctx.fillStyle = '#6a7a8a';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', 100, 110);
    ctx.font = '14px Arial';
    ctx.fillText('No Photo', 100, 160);
    return canvas.toDataURL('image/png');
}

function convertFileToBase64(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function(e) { reject(e); };
        reader.readAsDataURL(file);
    });
}

function updateSyncStatus(status, message) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.style.display = 'inline-block';
    el.className = 'sync-status ' + status;
    el.textContent = message || status;
}

// ======================= RENDER FUNCTIONS =======================

function renderAll() {
    renderApplicantList();
    renderDropdown(applicantsDB);
    populateEvaluationDropdown(applicantsDB);
    updateSummary();
    updateEvaluationStats();
}

function renderApplicantList() {
    <div class="applicant-item" data-id="${app.id}" data-photo="${escapeHtml(app.passportPhoto || '')}"></div>
    var container = document.getElementById('applicantListContainer');
    if (!container) return;

    if (applicantsDB.length === 0) {
        container.innerHTML = '<div class="small-text">No applicants yet. Register above.</div>';
        return;
    }

    var html = '';
    var sorted = applicantsDB.slice().sort(function(a, b) { return parseInt(b.id) - parseInt(a.id); });

    for (var i = 0; i < sorted.length; i++) {
        var app = sorted[i];
        var resultBadge = app.overallResult ?
            '<span class="result-badge ' + app.overallResult.toLowerCase() + '">' + app.overallResult +
            '</span>' :
            '<span class="result-badge pending">Pending</span>';
        var certBadge = app.certificateIssued ? '<span class="cert-badge">CERTIFIED</span>' : '';
        var catCount = Array.isArray(app.licenseCategory) ? app.licenseCategory.length : 0;
        var catBadge = catCount > 0 ? '<span class="count-badge">' + catCount + ' cat' + (catCount > 1 ?
            'ies' : '') + '</span>' : '';

        // Show who registered/evaluated if available
        var metaInfo = '';
        if (app.registeredBy) {
            metaInfo += ' | Registered by: ' + escapeHtml(app.registeredBy);
        }
        if (app.evaluatedBy) {
            metaInfo += ' | Evaluated by: ' + escapeHtml(app.evaluatedBy);
        }

        

        html +=

            <div class="applicant-item" data-id="${app.id}" data-photo="${escapeHtml(app.passportPhoto || '')}"></div>
            '<div class="applicant-item" data-id="' + app.id + '" onclick="selectApplicant(' +
            app.id + ')">' +
            '<div class="applicant-name">#' + app.id + ' ' + escapeHtml(app.fullName) + ' ' + certBadge +
            '</div>' +
            '<div>📋 ' + escapeHtml(Array.isArray(app.licenseCategory) ? app.licenseCategory.join(', ') : app
                .licenseCategory) + ' ' + catBadge + ' | ' + resultBadge + '</div>' +
            '<div class="small-text">Theory: ' + (app.theoryScore ?? '—') + ' | Practical: ' + (app
                .practicalScore ?? '—') + metaInfo + '</div>' +
            '<div class="applicant-actions" onclick="event.stopPropagation();">' +
            '<button class="btn-action btn-edit" onclick="editApplicant(' + app.id +
            ')">✏️ Edit</button>' +
            '<button class="btn-action btn-delete" onclick="showDeleteModal(' + app.id + ', \'' + escapeHtml(
                app.fullName) + '\')">🗑️ Delete</button>' +
            '<button class="btn-action btn-view" onclick="selectApplicant(' + app.id +
            ')">👁️ View</button>' +
            '</div></div>';
    }

    container.innerHTML = html;
}

function renderDropdown(filtered) {
    var select = document.getElementById('scheduleApplicantSelect');
    var countDisplay = document.getElementById('searchResultsCount');
    var apps = filtered || applicantsDB;

    select.innerHTML = '<option value="">-- Select an applicant --</option>';

    for (var i = 0; i < apps.length; i++) {
        var app = apps[i];
        var opt = document.createElement('option');
        opt.value = app.id;
        var status = '';
        if (app.certificateIssued) status = '🎓';
        else if (app.overallResult === 'PASS') status = '✅';
        else if (app.overallResult === 'FAIL') status = '❌';
        opt.textContent = '#' + app.id + ' - ' + app.fullName + ' ' + status;
        select.appendChild(opt);
    }

    if (countDisplay) {
        var total = applicantsDB.length;
        var shown = apps.length;
        countDisplay.textContent = shown === total ?
            'Showing all ' + total + ' applicant' + (total !== 1 ? 's' : '') :
            'Showing ' + shown + ' of ' + total + ' applicant' + (total !== 1 ? 's' : '');
    }
}

function populateEvaluationDropdown(filtered) {
    var select = document.getElementById('evaluationApplicantSelect');
    if (!select) return;

    var apps = filtered || applicantsDB;

    select.innerHTML = '<option value="">-- Select an applicant --</option>';

    var sorted = apps.slice().sort(function(a, b) { return parseInt(b.id) - parseInt(a.id); });

    for (var i = 0; i < sorted.length; i++) {
        var app = sorted[i];
        var opt = document.createElement('option');
        opt.value = app.id;

        var statusIcon = '';
        if (app.certificateIssued) statusIcon = '🎓';
        else if (app.overallResult === 'PASS') statusIcon = '✅';
        else if (app.overallResult === 'FAIL') statusIcon = '❌';
        else if (app.theoryScore !== null || app.practicalScore !== null) statusIcon = '⏳';

        var scoreInfo = '';
        if (app.theoryScore !== null && app.practicalScore !== null) {
            scoreInfo = ' | T:' + app.theoryScore + '/50 P:' + app.practicalScore + '/100';
        } else if (app.theoryScore !== null) {
            scoreInfo = ' | T:' + app.theoryScore + '/50';
        } else if (app.practicalScore !== null) {
            scoreInfo = ' | P:' + app.practicalScore + '/100';
        }

        opt.textContent = '#' + app.id + ' - ' + app.fullName + ' ' + statusIcon + scoreInfo;
        select.appendChild(opt);
    }

    var countDisplay = document.getElementById('evaluationSearchCount');
    if (countDisplay) {
        var total = applicantsDB.length;
        var shown = apps.length;
        countDisplay.textContent = shown === total ?
            'Showing all ' + total + ' applicant' + (total !== 1 ? 's' : '') :
            'Showing ' + shown + ' of ' + total + ' applicant' + (total !== 1 ? 's' : '');
    }
}

function populateSelects() {
    renderDropdown(applicantsDB);
    populateEvaluationDropdown(applicantsDB);
}

function filterApplicants(query) {
    if (!query || !query.trim()) return applicantsDB;
    var q = query.toLowerCase().trim();
    var result = [];
    for (var i = 0; i < applicantsDB.length; i++) {
        var app = applicantsDB[i];
        if (String(app.id).includes(q) ||
            String(app.fullName).toLowerCase().includes(q) ||
            String(app.nationalId).toLowerCase().includes(q) ||
            (app.phone && String(app.phone).toLowerCase().includes(q))) {
            result.push(app);
        }
    }
    return result;
}

function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
        var filtered = filterApplicants(e.target.value);
        renderDropdown(filtered);
    }, 300);
}

function searchEvaluationApplicants(query) {
    clearTimeout(evalSearchTimeout);
    evalSearchTimeout = setTimeout(function() {
        if (!query || !query.trim()) {
            populateEvaluationDropdown(applicantsDB);
            return;
        }

        var q = query.toLowerCase().trim();
        var filtered = [];
        for (var i = 0; i < applicantsDB.length; i++) {
            var app = applicantsDB[i];
            if (String(app.id).includes(q) ||
                String(app.fullName).toLowerCase().includes(q) ||
                String(app.nationalId).toLowerCase().includes(q) ||
                (app.phone && String(app.phone).toLowerCase().includes(q))) {
                filtered.push(app);
            }
        }

        populateEvaluationDropdown(filtered);

        if (filtered.length === 1) {
            document.getElementById('evaluationApplicantSelect').value = filtered[0].id;
            loadApplicantForEvaluation(filtered[0].id);
        }
    }, 300);
}

function updateSummary() {
    document.getElementById('totalApplicants').textContent = applicantsDB.length;
    var passed = 0,
        certified = 0;
    for (var i = 0; i < applicantsDB.length; i++) {
        if (applicantsDB[i].overallResult === 'PASS') passed++;
        if (applicantsDB[i].certificateIssued) certified++;
    }
    document.getElementById('passedApplicants').textContent = passed;
    document.getElementById('certifiedApplicants').textContent = certified;
}

function updateEvaluationStats() {
    var total = document.getElementById('evalTotalCount');
    if (total) {
        var ready = 0;
        for (var i = 0; i < applicantsDB.length; i++) {
            var a = applicantsDB[i];
            if (a.theoryScore !== null && a.theoryScore !== undefined &&
                a.practicalScore !== null && a.practicalScore !== undefined &&
                !a.overallResult) {
                ready++;
            }
        }
        total.textContent = ready;
    }
}

// ======================= SELECT APPLICANT FUNCTIONS =======================
function selectApplicant(id) {
    var app = null;
    for (var i = 0; i < applicantsDB.length; i++) {
        if (String(applicantsDB[i].id) === String(id)) {
            app = applicantsDB[i];
            break;
        }
    }
    if (!app) return;

    currentSelectedApplicant = app;
    var certNote = app.certificateIssued ? ' | 🎖 Cert: ' + app.certificateNumber : '';
    document.getElementById('selectedApplicantInfo').innerHTML =
        '<strong>Selected:</strong> #' + app.id + ' ' + escapeHtml(app.fullName) + ' | Status: ' + (app
            .overallResult || 'Not evaluated') + certNote;

    var theorySlider = document.getElementById('theorySlider');
    var practicalSlider = document.getElementById('practicalSlider');

    if (app.theoryScore !== null && app.theoryScore !== undefined) {
        theorySlider.value = app.theoryScore;
        document.getElementById('theoryVal').textContent = app.theoryScore;
        document.getElementById('theoryScoreDisplay').textContent = app.theoryScore;
    } else {
        theorySlider.value = 35;
        document.getElementById('theoryVal').textContent = 35;
        document.getElementById('theoryScoreDisplay').textContent = '—';
    }

    if (app.practicalScore !== null && app.practicalScore !== undefined) {
        practicalSlider.value = app.practicalScore;
        document.getElementById('practicalVal').textContent = app.practicalScore;
        document.getElementById('practicalScoreDisplay').textContent = app.practicalScore;
    } else {
        practicalSlider.value = 78;
        document.getElementById('practicalVal').textContent = 78;
        document.getElementById('practicalScoreDisplay').textContent = '—';
    }

    document.getElementById('certificatePreview').style.display = app.certificateIssued ? 'block' : 'none';
    document.getElementById('downloadPdfBtn').disabled = !app.certificateIssued;
    document.getElementById('printCertBtn').disabled = !app.certificateIssued;

    if (app.certificateIssued) {
        prepareCertificate(app);
    }

    updateEvaluationDisplay(app);
}

function updateEvaluationDisplay(app) {
    if (!app) return;

    document.getElementById('evalTheoryScore').textContent = app.theoryScore !== null && app.theoryScore !==
        undefined ? app.theoryScore : '—';
    document.getElementById('evalPracticalScore').textContent = app.practicalScore !== null && app
        .practicalScore !== undefined ? app.practicalScore : '—';

    var certNote = app.certificateIssued ? ' | 🎖 Cert: ' + app.certificateNumber : '';
    var statusNote = app.overallResult ? ' | Result: ' + app.overallResult : '';
    var evalNote = app.evaluatedBy ? ' | Evaluated by: ' + escapeHtml(app.evaluatedBy) : '';

    document.getElementById('selectedApplicantInfo').innerHTML =
        '<strong>Selected:</strong> #' + app.id + ' ' + escapeHtml(app.fullName) +
        ' <span style="color:#4a6a8a;">(' + app.nationalId + ')</span>' +
        '<span style="color:#2e7d32;">' + statusNote + certNote + evalNote + '</span>' +
        '<div style="font-size:0.8rem; color:#5e7e8f; margin-top:4px;">' +
        'Registered: ' + (app.regDate ? new Date(app.regDate).toLocaleDateString() : 'N/A') + ' | ' +
        'Registered by: ' + (app.registeredBy || 'N/A') +
        '</div>' +
        '<div style="font-size:0.8rem; color:#5e7e8f;">' +
        'Category: ' + (Array.isArray(app.licenseCategory) ? app.licenseCategory.join(', ') : app
            .licenseCategory) +
        '</div>';
}

function loadApplicantForEvaluation(id) {
    if (!id) {
        showToast('⚠️ Please select an applicant.', 'warning');
        return;
    }

    // Check if user can view this applicant
    if (!hasPermission('view_all') && !hasPermission('view_assigned')) {
        showToast('❌ You do not have permission to view applicant data.', 'error');
        return;
    }

    var app = null;
    for (var i = 0; i < applicantsDB.length; i++) {
        if (String(applicantsDB[i].id) === String(id)) {
            app = applicantsDB[i];
            break;
        }
    }
    if (!app) {
        showToast('❌ Applicant not found.', 'error');
        return;
    }

    currentSelectedApplicant = app;
    updateEvaluationDisplay(app);

    var theorySlider = document.getElementById('theorySlider');
    if (theorySlider) {
        theorySlider.value = app.theoryScore !== null && app.theoryScore !== undefined ? app.theoryScore : 35;
        document.getElementById('theoryVal').textContent = app.theoryScore !== null && app.theoryScore !==
            undefined ? app.theoryScore : 35;
        document.getElementById('theoryScoreDisplay').textContent = app.theoryScore !== null && app
            .theoryScore !== undefined ? app.theoryScore : '—';
    }

    var practicalSlider = document.getElementById('practicalSlider');
    if (practicalSlider) {
        practicalSlider.value = app.practicalScore !== null && app.practicalScore !== undefined ? app
            .practicalScore : 78;
        document.getElementById('practicalVal').textContent = app.practicalScore !== null && app
            .practicalScore !== undefined ? app.practicalScore : 78;
        document.getElementById('practicalScoreDisplay').textContent = app.practicalScore !== null && app
            .practicalScore !== undefined ? app.practicalScore : '—';
    }

    document.getElementById('theoryStatusMsg').innerHTML = app.theoryScore !== null && app.theoryScore !==
        undefined ? '📖 Theory: ' + app.theoryScore + '/50' : '';
    document.getElementById('practicalStatusMsg').innerHTML = app.practicalScore !== null && app
        .practicalScore !== undefined ? '🚗 Practical: ' + app.practicalScore + '/100' : '';

    document.getElementById('evaluationOutput').style.display = 'none';
    document.getElementById('evaluationOutput').innerHTML = '';

    document.getElementById('certificatePreview').style.display = app.certificateIssued ? 'block' : 'none';
    document.getElementById('downloadPdfBtn').disabled = !app.certificateIssued;
    document.getElementById('printCertBtn').disabled = !app.certificateIssued;

    if (app.certificateIssued) {
        prepareCertificate(app);
    }

    document.getElementById('evaluationApplicantSelect').value = id;
    showToast('✅ Loaded ' + app.fullName + ' for evaluation', 'success');
}

function clearEvaluationSelection() {
    currentSelectedApplicant = null;
    document.getElementById('selectedApplicantInfo').innerHTML = 'No applicant selected for evaluation';
    document.getElementById('evalTheoryScore').textContent = '—';
    document.getElementById('evalPracticalScore').textContent = '—';
    document.getElementById('evaluationOutput').style.display = 'none';
    document.getElementById('evaluationOutput').innerHTML = '';
    document.getElementById('evaluationApplicantSelect').value = '';
    document.getElementById('evaluationSearch').value = '';

    var theorySlider = document.getElementById('theorySlider');
    if (theorySlider) {
        theorySlider.value = 35;
        document.getElementById('theoryVal').textContent = 35;
        document.getElementById('theoryScoreDisplay').textContent = '—';
    }

    var practicalSlider = document.getElementById('practicalSlider');
    if (practicalSlider) {
        practicalSlider.value = 78;
        document.getElementById('practicalVal').textContent = 78;
        document.getElementById('practicalScoreDisplay').textContent = '—';
    }

    document.getElementById('theoryStatusMsg').innerHTML = '';
    document.getElementById('practicalStatusMsg').innerHTML = '';
    document.getElementById('certificatePreview').style.display = 'none';
    document.getElementById('downloadPdfBtn').disabled = true;
    document.getElementById('printCertBtn').disabled = true;

    showToast('🗑️ Evaluation cleared.', 'info');
}

// ======================= DELETE & EDIT FUNCTIONS =======================
function showDeleteModal(id, name) {
    // Check permission
    if (!hasPermission('delete_all')) {
        showToast('❌ You do not have permission to delete applicants.', 'error');
        return;
    }
    deleteTargetId = id;
    document.getElementById('deleteApplicantName').textContent = name;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTargetId = null;
}

async function deleteApplicant(id) {
    try {
        var index = -1;
        for (var i = 0; i < applicantsDB.length; i++) {
            if (String(applicantsDB[i].id) === String(id)) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            showToast('Applicant not found.', 'error');
            return;
        }

        var name = applicantsDB[index].fullName;
        applicantsDB.splice(index, 1);

        await saveToGoogleSheets();
        renderAll();

        if (currentSelectedApplicant && String(currentSelectedApplicant.id) === String(id)) {
            clearEvaluationSelection();
        }

        showToast('✅ ' + name + ' deleted successfully.', 'success');
        closeDeleteModal();
    } catch (error) {
        showToast('❌ Delete failed: ' + error.message, 'error');
    }
}

function editApplicant(id) {
    // Check permission
    if (!hasPermission('edit_all')) {
        showToast('❌ You do not have permission to edit applicants.', 'error');
        return;
    }

    var app = null;
    for (var i = 0; i < applicantsDB.length; i++) {
        if (String(applicantsDB[i].id) === String(id)) {
            app = applicantsDB[i];
            break;
        }
    }
    if (!app) return;

    var item = document.querySelector('.applicant-item[data-id="' + id + '"]');
    if (!item) return;

    if (item.classList.contains('editing')) {
        cancelEdit(id);
        return;
    }

    item.classList.add('editing');
    var actions = item.querySelector('.applicant-actions');
    if (actions) actions.style.display = 'none';

    var form = document.createElement('div');
    form.className = 'edit-form';
    form.id = 'edit-form-' + id;
    form.innerHTML =
        '<div class="form-group"><label>Full Name</label><input type="text" id="edit-name-' + id +
        '" name="edit_name_' + id + '" value="' + escapeHtml(app.fullName) + '"></div>' +
        '<div class="form-group"><label>National ID</label><input type="text" id="edit-national-' + id +
        '" name="edit_national_' + id + '" value="' + escapeHtml(app.nationalId) + '"></div>' +
        '<div class="form-group"><label>Phone</label><input type="text" id="edit-phone-' + id +
        '" name="edit_phone_' + id + '" value="' + escapeHtml(app.phone || '') + '"></div>' +
        '<div class="form-group"><label>Address</label><input type="text" id="edit-address-' + id +
        '" name="edit_address_' + id + '" value="' + escapeHtml(app.address || '') + '"></div>' +
        '<div class="form-group"><label>Driver School</label><input type="text" id="edit-school-' + id +
        '" name="edit_school_' + id + '" value="' + escapeHtml(app.school || '') + '"></div>' +
        '<div class="edit-form-actions">' +
        '<button class="btn-success" onclick="saveEdit(' + id + ')">💾 Save</button>' +
        '<button class="btn-secondary" onclick="cancelEdit(' + id + ')">✖ Cancel</button>' +
        '</div>';

    if (actions) {
        actions.parentNode.insertBefore(form, actions.nextSibling);
    } else {
        item.appendChild(form);
    }
    showToast('✏️ Editing applicant #' + id, 'info');
}

async function saveEdit(id) {
    var app = null;
    for (var i = 0; i < applicantsDB.length; i++) {
        if (String(applicantsDB[i].id) === String(id)) {
            app = applicantsDB[i];
            break;
        }
    }
    if (!app) return;

    var nameInput = document.getElementById('edit-name-' + id);
    var nationalInput = document.getElementById('edit-national-' + id);
    var phoneInput = document.getElementById('edit-phone-' + id);
    var addressInput = document.getElementById('edit-address-' + id);
    var schoolInput = document.getElementById('edit-school-' + id);

    if (!nameInput.value.trim() || !nationalInput.value.trim()) {
        showToast('⚠️ Name and National ID are required.', 'warning');
        return;
    }

    app.fullName = nameInput.value.trim();
    app.nationalId = nationalInput.value.trim();
    app.phone = phoneInput.value.trim();
    app.address = addressInput.value.trim();
    app.school = schoolInput.value.trim();

    await saveToGoogleSheets();
    cancelEdit(id);
    renderAll();
    if (currentSelectedApplicant && String(currentSelectedApplicant.id) === String(id)) {
        selectApplicant(id);
    }
    showToast('✅ Applicant updated successfully.', 'success');
}

function cancelEdit(id) {
    var item = document.querySelector('.applicant-item[data-id="' + id + '"]');
    if (!item) return;
    item.classList.remove('editing');
    var form = document.getElementById('edit-form-' + id);
    if (form) form.remove();
    var actions = item.querySelector('.applicant-actions');
    if (actions) actions.style.display = 'flex';
}

// ======================= EXPORT FUNCTIONS =======================
function exportToExcel() {
    if (!hasPermission('export_data')) {
        showToast('❌ You do not have permission to export data.', 'error');
        return;
    }

    if (applicantsDB.length === 0) {
        showToast('No data to export.', 'warning');
        return;
    }

    var data = [];
    for (var i = 0; i < applicantsDB.length; i++) {
        var app = applicantsDB[i];
        data.push({
            'ID': app.id,
            'Name': app.fullName,
            'National ID': app.nationalId,
            'DOB': app.dob,
            'Sex': app.sex,
            'Phone': app.phone,
            'Address': app.address,
            'School': app.school,
            'Category': Array.isArray(app.licenseCategory) ? app.licenseCategory.join(', ') : app
                .licenseCategory,
            'Registered': app.regDate ? new Date(app.regDate).toLocaleString() : '',
            'Registered By': app.registeredBy || '',
            'Test Center': app.testCenter || '',
            'Examiner': app.examiner || '',
            'Test Date': app.testDateTime ? new Date(app.testDateTime).toLocaleString() : '',
            'Theory': app.theoryScore ?? '',
            'Practical': app.practicalScore ?? '',
            'Result': app.overallResult || 'Pending',
            'Evaluated By': app.evaluatedBy || '',
            'Certificate': app.certificateIssued ? 'Yes' : 'No',
            'Cert Number': app.certificateNumber || ''
        });
    }

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applicants');
    XLSX.writeFile(wb, 'DriveComp_Applicants_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    showToast('✅ Excel exported successfully.', 'success');
}

// ======================= CERTIFICATE FUNCTIONS =======================
function prepareCertificate(app) {
    if (!app) return;

    var issueDate = new Date().toLocaleDateString('en-GB');
    var categories = Array.isArray(app.licenseCategory) ? app.licenseCategory.join(', ') : app.licenseCategory;
    var photo = app.passportPhoto || getDefaultPlaceholder();
    var barcodeData = app.certificateNumber || 'DCT-' + new Date().getFullYear() + '-' + nextCertId;
    var barcodeId = 'barcode-' + Date.now();

    var html =
        '<div style="width:210mm; min-height:297mm; border:6px solid #0e4a3f; padding:8mm 12mm; box-sizing:border-box; font-family:\'Times New Roman\', serif; background:white; position:relative; margin:0 auto;">' +
        '<div style="position:relative; z-index:1; height:100%; display:flex; flex-direction:column; justify-content:space-between;">' +
        '<div><div style="text-align:center; margin-bottom:3mm;">' +
        '<div style="width:80px; height:80px; margin:0 auto; border-radius:50%; background:linear-gradient(135deg, #0b2b3b, #1a4a6f); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:24px; border:3px solid #ffd700;">DC</div>' +
        '<div style="font-size:11px; color:#0b3a2f; letter-spacing:2px; font-weight:600; margin-top:2mm;">DRIVING COMPETENCY TEST AUTHORITY</div>' +
        '<div style="font-size:9px; color:#4a5a6a; letter-spacing:1px;">The Gambia Police Force - Traffic Department</div>' +
        '</div>' +
        '<div style="text-align:right; margin-top:-20px;">' +
        '<div style="width:100px; height:120px; border:3px solid #0b3a2f; border-radius:4px; overflow:hidden; display:inline-block; background:#f0f4f8;">' +
        '<img src="' + photo +
        '" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=\'' + getDefaultPlaceholder() +
        '\'">' +
        '</div><div style="font-size:8px; color:#6a7a8a;">Passport Photo</div></div></div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6mm;">' +
        '<div style="font-size:12px; color:#334155;"><strong>DriveComp</strong> — Certification Division</div>' +
        '<div style="text-align:right; font-size:11px; color:#334155;">Certificate No: <strong>' + app
        .certificateNumber + '</strong><br>Issued: ' + issueDate + '</div></div>' +
        '<h1 style="text-align:center; font-size:28px; font-weight:800; letter-spacing:4px; color:#1a2a3a; text-transform:uppercase; border-top:2px solid #c8d0d8; padding-top:5mm;">CERTIFICATE OF COMPETENCY</h1>' +
        '<div style="text-align:center; font-size:13px; color:#4a5a6a; margin-bottom:8mm; letter-spacing:2px; border-bottom:3px double #c8d0d8; padding-bottom:4mm;">Official Driving Competency Issuance</div>' +
        '<div style="font-size:15px; line-height:2;">' +
        '<p style="margin-bottom:4mm; text-align:justify; text-indent:10mm;">This is to certify that <strong style="font-size:18px; color:#0b3a2f;">' +
        escapeHtml(app.fullName) + '</strong> (National ID: <strong>' + app.nationalId +
        '</strong>) has successfully completed and passed the required theory and practical driving assessments for license category <strong style="color:#0b3a2f;">' +
        escapeHtml(categories) + '</strong>.</p>' +
        '<p style="margin-bottom:4mm; text-align:justify;"><span style="font-weight:600;">Test Center:</span> ' +
        escapeHtml(app.testCenter || 'N/A') + ' &nbsp;|&nbsp; <span style="font-weight:600;">Examiner:</span> ' +
        escapeHtml(app.examiner || 'N/A') + ' &nbsp;|&nbsp; <span style="font-weight:600;">Test Date:</span> ' +
        (app.testDateTime ? new Date(app.testDateTime).toLocaleDateString('en-GB') : 'N/A') + '</p>' +
        '<div style="text-align:center; margin-top:5mm; padding:3mm; border-radius:4px; background:#f0f8f0;">' +
        '<span style="font-size:20px; font-weight:700; color:#006644;">★ RESULT: PASS ★</span>' +
        '<div style="font-size:11px; color:#4a5a6a; margin-top:1mm;">This certificate is digitally verified</div>' +
        '</div></div>' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:6mm; border-top:2px solid #c8d0d8;">' +
        '<div style="text-align:center; width:170px;"><div style="border-top:2px solid #111; width:170px; margin:0 auto 3mm;"></div><div style="font-size:13px; font-weight:600; color:#1a2a3a;">Authorized Signature</div><div style="font-size:9px; color:#6a7a8a;">Commissioner of Traffic</div></div>' +
        '<div style="text-align:center; max-width:200px;"><div id="' + barcodeId +
        '" style="display:inline-block; background:white; padding:3px; border:1px solid #1a2a3a; border-radius:3px; min-height:40px; min-width:120px;"></div><div style="font-size:9px; margin-top:1mm; color:#4a5a6a; font-family:monospace; letter-spacing:1px;">' +
        barcodeData + '</div><div style="font-size:8px; color:#8a9aaa;">Verification Code</div></div>' +
        '<div style="text-align:center; width:170px;"><div style="border-top:2px solid #111; width:170px; margin:0 auto 3mm;"></div><div style="font-size:13px; font-weight:600; color:#1a2a3a;">Authority Stamp</div><div style="font-size:9px; color:#6a7a8a;">The Gambia Police Force</div></div>' +
        '</div>' +
        '<div style="text-align:center; font-size:8px; color:#8a9aaa; margin-top:3mm; border-top:1px solid #e8edf0; padding-top:2mm;">This certificate is the property of the Driving Competency Test Authority. Unauthorized reproduction is prohibited.</div>' +
        '</div></div>';

    var container = document.getElementById('printCertificate');
    container.innerHTML = html;
    container.style.display = 'block';

    setTimeout(function() {
        var bc = document.getElementById(barcodeId);
        if (bc && typeof JsBarcode !== 'undefined') {
            try {
                var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                bc.appendChild(svg);
                JsBarcode(svg, barcodeData, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 50,
                    displayValue: false,
                    margin: 5,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
            } catch (e) {
                bc.innerHTML = '<div style="font-size:10px; font-family:monospace; padding:5px; word-break:break-all;">' +
                    barcodeData + '</div>';
            }
        } else if (bc) {
            bc.innerHTML = '<div style="font-size:10px; font-family:monospace; padding:5px; word-break:break-all;">' +
                barcodeData + '</div>';
        }
    }, 100);
}

async function downloadPDF() {
    var el = document.getElementById('printCertificate');
    if (!el || !el.innerHTML.trim()) {
        showToast('Certificate not available. Generate it first.', 'warning');
        return;
    }

    var app = currentCertificateApp || currentSelectedApplicant;
    if (!app) {
        showToast('Applicant data not found.', 'error');
        return;
    }

    var btn = document.getElementById('downloadPdfBtn');
    var original = btn.textContent;
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    try {
        var certDiv = el.firstElementChild;
        if (!certDiv) throw new Error('Certificate content not found');

        await new Promise(function(r) { setTimeout(r, 500); });

        var images = certDiv.querySelectorAll('img');
        var imagePromises = [];
        for (var i = 0; i < images.length; i++) {
            imagePromises.push(new Promise(function(r) {
                var img = images[i];
                if (img.complete) r();
                else {
                    img.onload = r;
                    img.onerror = r;
                }
            }));
        }
        await Promise.all(imagePromises);

        var canvas = await html2canvas(certDiv, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1123,
            logging: false,
            allowTaint: true,
            imageTimeout: 30000
        });

        var imgData = canvas.toDataURL('image/png');
        var jsPDF = window.jspdf.jsPDF;
        var pdf = new jsPDF('portrait', 'mm', 'a4');
        var pdfWidth = pdf.internal.pageSize.getWidth();
        var pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        var filename = 'Driving_Certificate_' + app.fullName.replace(/\s+/g, '_') + '_' + Date.now() +
        '.pdf';
        pdf.save(filename);
        showToast('✅ PDF downloaded successfully!', 'success');

    } catch (error) {
        console.error('PDF error:', error);
        showToast('❌ PDF generation failed: ' + error.message, 'error');
    } finally {
        btn.textContent = original;
        btn.disabled = false;
    }
}

function printCertificate() {
    var content = document.getElementById('printCertificate').innerHTML;
    if (!content || !content.trim()) {
        showToast('Certificate not available. Generate it first.', 'warning');
        return;
    }

    var win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(
        '<!DOCTYPE html><html><head><title>Driving Competency Certificate</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:white;}.cert-wrapper{width:100vw;height:100vh;max-width:210mm;max-height:297mm;background:white;margin:0 auto;display:flex;align-items:center;justify-content:center;}.cert-wrapper>div{width:100%;height:100%;padding:8mm 12mm;box-sizing:border-box;}@page{size:A4 portrait;margin:0;}@media print{body{padding:0;margin:0;height:100vh;width:100vw;overflow:hidden;}.cert-wrapper{width:100vw;height:100vh;max-height:100vh;max-width:100vw;border:none;margin:0;padding:0;}.cert-wrapper>div{border:6px solid #0e4a3f !important;padding:8mm 12mm !important;}}</style></head><body><div class="cert-wrapper">' +
        content +
        '</div><script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},1000);},500);};<\/script></body></html>'
        );
    win.document.close();
}

// ======================= EVENT LISTENERS =======================
document.addEventListener('DOMContentLoaded', function() {
    // Populate login users
    populateLoginUsers();

    // Photo preview
    document.getElementById('photoUpload').addEventListener('change', function(e) {
        var file = e.target.files[0];
        var preview = document.getElementById('photoPreview');
        if (file) {
            var valid = ['image/jpeg', 'image/jpg', 'image/png'];
            if (valid.indexOf(file.type) === -1) {
                showToast('Please upload a JPEG or PNG image.', 'error');
                this.value = '';
                preview.style.display = 'none';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image must be less than 5MB.', 'error');
                this.value = '';
                preview.style.display = 'none';
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
        }
    });

    // Registration Form Submit
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!currentUser) {
            showToast('Please login first.', 'error');
            return;
        }

        if (!hasPermission('register_applicants')) {
            showToast('❌ You do not have permission to register applicants.', 'error');
            return;
        }

        var fullName = document.getElementById('fullName').value.trim();
        var nationalId = document.getElementById('nationalId').value.trim();
        var dob = document.getElementById('dob').value;
        var sex = document.getElementById('sex').value;
        var phone = document.getElementById('phone').value.trim();
        var address = document.getElementById('address').value;
        var school = document.getElementById('school').value;
        var checkboxes = document.querySelectorAll('#licenseCatGroup input:checked');
        var categories = [];
        for (var i = 0; i < checkboxes.length; i++) {
            categories.push(checkboxes[i].value);
        }
        var photoFile = document.getElementById('photoUpload').files[0];

        if (!fullName || !nationalId || !dob || !phone) {
            showToast('⚠️ Please fill all required fields.', 'error');
            return;
        }

        var age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age < 18) {
            showToast('❌ Applicant must be at least 18 years old.', 'error');
            return;
        }

        if (categories.length === 0) {
            showToast('⚠️ Select at least one license category.', 'error');
            return;
        }

        var duplicate = false;
        for (var i = 0; i < applicantsDB.length; i++) {
            if (applicantsDB[i].nationalId === nationalId) {
                duplicate = true;
                break;
            }
        }
        if (duplicate) {
            showToast('⚠️ Duplicate National ID.', 'error');
            return;
        }

        // Process photo
        var photoBase64 = getDefaultPlaceholder();
        if (photoFile) {
            try {
                photoBase64 = await convertFileToBase64(photoFile);
            } catch (error) {
                showToast('Error reading photo file.', 'error');
                return;
            }
        }

        // Create new applicant with user tracking
        var newApp = {
            id: nextApplicantId++,
            fullName: fullName,
            nationalId: nationalId,
            dob: dob,
            sex: sex,
            phone: phone,
            address: address,
            school: school,
            licenseCategory: categories,
            passportPhoto: photoBase64,
            regDate: new Date().toISOString(),
            status: 'REGISTERED',
            theoryScore: null,
            practicalScore: null,
            overallResult: null,
            testCenter: '',
            examiner: '',
            testDateTime: '',
            certificateIssued: false,
            certificateNumber: null,
            registeredBy: currentUser,
            registeredByRole: currentUserRole,
            evaluatedBy: null,
            evaluationDate: null
        };

        applicantsDB.push(newApp);
        var saved = await saveToGoogleSheets();
        if (saved) {
            renderAll();
            this.reset();
            document.getElementById('photoPreview').style.display = 'none';
            selectApplicant(newApp.id);
            showToast('✅ Applicant #' + newApp.id + ' registered by ' + currentUser + '!', 'success');
        }
    });

    // Search
    document.getElementById('applicantSearchInput').addEventListener('input', handleSearch);

    // Evaluation Search
    document.getElementById('evaluationSearch').addEventListener('input', function(e) {
        searchEvaluationApplicants(e.target.value);
    });

    // Export Excel
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);

    // Evaluation buttons
    document.getElementById('loadEvaluationBtn').addEventListener('click', function() {
        if (!hasPermission('view_all') && !hasPermission('view_assigned')) {
            showToast('❌ You do not have permission to view applicant data.', 'error');
            return;
        }
        var select = document.getElementById('evaluationApplicantSelect');
        var id = select.value;
        if (id) {
            loadApplicantForEvaluation(id);
        } else {
            showToast('⚠️ Please select an applicant from the dropdown.', 'warning');
        }
    });

    document.getElementById('evaluationApplicantSelect').addEventListener('change', function(e) {
        var id = e.target.value;
        if (id) {
            loadApplicantForEvaluation(id);
        }
    });

    document.getElementById('clearEvaluationBtn').addEventListener('click', function() {
        if (currentSelectedApplicant) {
            if (confirm('Clear evaluation for ' + currentSelectedApplicant.fullName + '?')) {
                clearEvaluationSelection();
            }
        } else {
            clearEvaluationSelection();
        }
    });

    // Schedule test
    document.getElementById('scheduleTestBtn').addEventListener('click', async function() {
        if (!hasPermission('schedule_tests')) {
            showToast('❌ You do not have permission to schedule tests.', 'error');
            return;
        }

        var id = parseInt(document.getElementById('scheduleApplicantSelect').value);
        if (!id) {
            showToast('⚠️ Select an applicant.', 'warning');
            return;
        }

        var app = null;
        for (var i = 0; i < applicantsDB.length; i++) {
            if (String(applicantsDB[i].id) === String(id)) {
                app = applicantsDB[i];
                break;
            }
        }
        if (!app) {
            showToast('Applicant not found.', 'error');
            return;
        }

        var center = document.getElementById('testCenter').value.trim();
        var examinerName = document.getElementById('examiner').value.trim();
        var dateTime = document.getElementById('testDateTime').value;

        if (!dateTime) {
            showToast('⚠️ Select test date and time.', 'warning');
            return;
        }

        app.testCenter = center;
        app.examiner = examinerName;
        app.testDateTime = dateTime;
        app.status = 'SCHEDULED';

        await saveToGoogleSheets();
        renderAll();
        selectApplicant(app.id);
        showToast('✅ Test scheduled for ' + app.fullName + ' by ' + currentUser, 'success');
    });

    // Record theory
    document.getElementById('recordTheoryBtn').addEventListener('click', async function() {
        if (!hasPermission('record_scores')) {
            showToast('❌ You do not have permission to record scores.', 'error');
            return;
        }

        if (!currentSelectedApplicant) {
            showToast('Select an applicant first.', 'warning');
            return;
        }
        currentSelectedApplicant.theoryScore = parseInt(document.getElementById('theorySlider')
        .value);
        document.getElementById('theoryScoreDisplay').textContent = currentSelectedApplicant
            .theoryScore;
        document.getElementById('theoryStatusMsg').textContent = '📖 Theory: ' + currentSelectedApplicant
            .theoryScore + '/50 (Recorded by ' + currentUser + ')';

        await saveToGoogleSheets();
        renderAll();
        updateEvaluationDisplay(currentSelectedApplicant);
        showToast('✅ Theory score recorded by ' + currentUser, 'success');
    });

    // Record practical
    document.getElementById('recordPracticalBtn').addEventListener('click', async function() {
        if (!hasPermission('record_scores')) {
            showToast('❌ You do not have permission to record scores.', 'error');
            return;
        }

        if (!currentSelectedApplicant) {
            showToast('Select an applicant first.', 'warning');
            return;
        }
        currentSelectedApplicant.practicalScore = parseInt(document.getElementById('practicalSlider')
            .value);
        document.getElementById('practicalScoreDisplay').textContent = currentSelectedApplicant
            .practicalScore;
        document.getElementById('practicalStatusMsg').textContent = '🚗 Practical: ' +
            currentSelectedApplicant.practicalScore + '/100 (Recorded by ' + currentUser + ')';

        await saveToGoogleSheets();
        renderAll();
        updateEvaluationDisplay(currentSelectedApplicant);
        showToast('✅ Practical score recorded by ' + currentUser, 'success');
    });

    // Evaluate
    document.getElementById('evaluateFinalBtn').addEventListener('click', async function() {
        // Check permission
        if (!hasPermission('evaluate_all') && !hasPermission('evaluate_assigned')) {
            showToast('❌ You do not have permission to evaluate applicants.', 'error');
            return;
        }

        if (!currentSelectedApplicant) {
            showToast('⚠️ Please select an applicant first.', 'warning');
            return;
        }

        var app = currentSelectedApplicant;
        if (app.theoryScore === null || app.theoryScore === undefined ||
            app.practicalScore === null || app.practicalScore === undefined) {
            document.getElementById('evaluationOutput').textContent =
                '⚠️ Please record both theory and practical scores first.';
            document.getElementById('evaluationOutput').style.display = 'block';
            document.getElementById('evaluationOutput').className = 'status-message error';
            return;
        }

        var theoryPass = app.theoryScore >= 35;
        var practicalPass = app.practicalScore >= 70;
        app.overallResult = (theoryPass && practicalPass) ? 'PASS' : 'FAIL';
        app.evaluatedBy = currentUser;
        app.evaluationDate = new Date().toISOString();

        var output = document.getElementById('evaluationOutput');
        output.innerHTML =
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
            '<div><strong>Result:</strong> <span style="font-size:1.2rem; font-weight:bold; color:' +
            (app.overallResult === 'PASS' ? '#27ae60' : '#e74c3c') + ';">' + app.overallResult +
            '</span></div>' +
            '<div style="font-size:0.85rem; color:#4a6a8a;">Theory: ' + app.theoryScore + '/50 ' + (
                theoryPass ? '✅' : '❌') + ' | Practical: ' + app.practicalScore + '/100 ' + (
                practicalPass ? '✅' : '❌') + '</div></div>' +
            '<div style="margin-top:8px; font-size:0.85rem; color:#2e7d32;">' + (app.overallResult ===
                'PASS' ?
                '🎉 Congratulations! Applicant has passed all requirements.' :
                '❌ Applicant needs to retake the test.') + '</div>' +
            '<div style="margin-top:4px; font-size:0.7rem; color:#6b7280;">Evaluated by: ' + currentUser + ' (' + currentUserRole + ')</div>';
        output.style.display = 'block';
        output.className = 'status-message success';

        await saveToGoogleSheets();
        renderAll();
        updateEvaluationDisplay(app);
        showToast('✅ Evaluation complete: ' + app.overallResult + ' by ' + currentUser, 'success');
    });

    // Reset for retest
    document.getElementById('resetToRetest').addEventListener('click', async function() {
        // Only admin and supervisor can reset
        if (!hasPermission('evaluate_all')) {
            showToast('❌ Only administrators and supervisors can reset retests.', 'error');
            return;
        }

        if (!currentSelectedApplicant) {
            showToast('⚠️ Please select an applicant first.', 'warning');
            return;
        }

        if (!confirm('Reset ' + currentSelectedApplicant.fullName +
                ' for retest? This will clear all scores and certificates.')) {
            return;
        }

        var app = currentSelectedApplicant;
        app.theoryScore = null;
        app.practicalScore = null;
        app.overallResult = null;
        app.certificateIssued = false;
        app.certificateNumber = null;
        app.evaluatedBy = null;
        app.evaluationDate = null;

        await saveToGoogleSheets();
        renderAll();
        updateEvaluationDisplay(app);

        document.getElementById('evaluationOutput').style.display = 'none';
        document.getElementById('evaluationOutput').innerHTML = '';

        showToast('🔄 Reset for retest by ' + currentUser, 'info');
    });

    // Generate certificate
    document.getElementById('generateCertBtn').addEventListener('click', async function() {
        if (!hasPermission('generate_certificates')) {
            showToast('❌ You do not have permission to generate certificates.', 'error');
            return;
        }

        if (!currentSelectedApplicant) {
            showToast('Select an applicant first.', 'warning');
            return;
        }
        var app = currentSelectedApplicant;
        if (app.overallResult !== 'PASS') {
            showToast('❌ Only PASS results can generate a certificate.', 'error');
            return;
        }
        if (app.certificateIssued) {
            showToast('⚠️ Certificate already issued.', 'warning');
            return;
        }

        var certNumber = 'DCT-' + new Date().getFullYear() + '-' + nextCertId++;
        app.certificateNumber = certNumber;
        app.certificateIssued = true;
        app.generatedBy = currentUser;
        app.generationDate = new Date().toISOString();
        currentCertificateApp = app;

        var issueDate = new Date().toLocaleDateString('en-GB');
        document.getElementById('certificatePreview').style.display = 'block';
        document.getElementById('certDetails').innerHTML =
            '<strong>Certificate:</strong> ' + certNumber + '<br>' +
            '<strong>Name:</strong> ' + escapeHtml(app.fullName) + '<br>' +
            '<strong>Category:</strong> ' + (Array.isArray(app.licenseCategory) ? app.licenseCategory
                .join(', ') : app.licenseCategory) + '<br>' +
            '<strong>Issue Date:</strong> ' + issueDate + '<br>' +
            '<strong>Generated By:</strong> ' + currentUser;

        document.getElementById('qrCodeSim').textContent = '🔲 QR:VERIFY|' + certNumber + '|' + app
            .nationalId;

        prepareCertificate(app);
        document.getElementById('downloadPdfBtn').disabled = false;
        document.getElementById('printCertBtn').disabled = false;

        await saveToGoogleSheets();
        renderAll();
        updateEvaluationDisplay(app);
        showToast('✅ Certificate ' + certNumber + ' generated by ' + currentUser + '!', 'success');
    });

    // Download PDF
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);

    // Print
    document.getElementById('printCertBtn').addEventListener('click', printCertificate);

    // Login/Logout
    document.getElementById('loginBtn').addEventListener('click', loginUser);
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);

    // Allow Enter key for login
    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            loginUser();
        }
    });

    // Modal
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (deleteTargetId !== null) deleteApplicant(deleteTargetId);
    });
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeDeleteModal();
    });

    // Slider display
    document.getElementById('theorySlider').addEventListener('input', function(e) {
        document.getElementById('theoryVal').textContent = e.target.value;
    });
    document.getElementById('practicalSlider').addEventListener('input', function(e) {
        document.getElementById('practicalVal').textContent = e.target.value;
    });
});

// ======================= AUTO LOGIN =======================
window.addEventListener('load', function() {
    // Populate login users first
    populateLoginUsers();
    
    // Check for saved session
    var session = sessionStorage.getItem('drivecomp_session');
    if (session) {
        try {
            var data = JSON.parse(session);
            if (USERS[data.username]) {
                currentUser = data.username;
                currentUserRole = USERS[data.username].role;
                currentUserPermissions = USERS[data.username].permissions;
                
                document.getElementById('loginPanel').style.display = 'none';
                document.getElementById('mainApp').style.display = 'grid';
                document.getElementById('logoutBtn').style.display = 'inline-block';
                
                updateUIForUserRole();
                displayUserInfo();
                loadFromGoogleSheets();
                populateSelects();
                
                showToast(`Welcome back, ${USERS[data.username].name}!`, 'success');
            } else {
                // Invalid session, clear it
                sessionStorage.removeItem('drivecomp_session');
            }
        } catch (e) {
            console.warn('Session restore failed:', e);
            sessionStorage.removeItem('drivecomp_session');
        }
    }
});

console.log('🚗 DriveComp System Loaded - Multi-user Authentication Active');
console.log('👥 Available Users:');
for (var user in USERS) {
    console.log(`  - ${user} (${USERS[user].role}): ${USERS[user].password}`);
}
console.log('📋 Permissions are role-based with limited access for non-admin users');
console.log('☁️ All data stored in Google Sheets');