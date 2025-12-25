// State Management
let currentStep = 1;
let jobs = JSON.parse(localStorage.getItem('skuadrone_jobs')) || [];

// Navigation
const navRequest = document.getElementById('nav-request');
const navDashboard = document.getElementById('nav-dashboard');
const navLogin = document.getElementById('nav-login');
const navLogout = document.getElementById('nav-logout');
const viewRequest = document.getElementById('view-request');
const viewDashboard = document.getElementById('view-dashboard');
const viewLogin = document.getElementById('view-login');

let isLoggedIn = localStorage.getItem('skuadrone_logged_in') === 'true';

// Theme Management
let currentTheme = localStorage.getItem('skuadrone_theme') || 'light';

function initTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    if (currentTheme === 'light') {
        body.classList.add('light-mode');
        if (icon) icon.innerText = '☀️';
    } else {
        body.classList.remove('light-mode');
        if (icon) icon.innerText = '🌙';
    }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    body.classList.toggle('light-mode');

    if (body.classList.contains('light-mode')) {
        currentTheme = 'light';
        icon.innerText = '☀️';
    } else {
        currentTheme = 'dark';
        icon.innerText = '🌙';
    }
    localStorage.setItem('skuadrone_theme', currentTheme);
});

navRequest.addEventListener('click', () => switchView('request'));
navDashboard.addEventListener('click', () => switchView('dashboard'));
navLogin.addEventListener('click', () => switchView('login'));
navLogout.addEventListener('click', logout);

function switchView(view) {
    viewRequest.style.display = 'none';
    viewDashboard.style.display = 'none';
    viewLogin.style.display = 'none';
    navRequest.classList.remove('active');
    navDashboard.classList.remove('active');
    navLogin.classList.remove('active');

    if (view === 'request') {
        viewRequest.style.display = 'block';
        navRequest.classList.add('active');
    } else if (view === 'dashboard') {
        if (!isLoggedIn) {
            switchView('login');
            return;
        }
        viewDashboard.style.display = 'block';
        navDashboard.classList.add('active');
        renderDashboard();
    } else if (view === 'login') {
        viewLogin.style.display = 'block';
        navLogin.classList.add('active');
    }
}

// Multi-step Form Logic
function nextStep(step) {
    // Basic validation
    if (step === 2) {
        if (!document.getElementById('date-request').value || !document.getElementById('name-applicant').value) {
            alert('Please fill in required fields');
            return;
        }
    }

    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`.dot[data-step="${currentStep}"]`).classList.remove('active');

    currentStep = step;

    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`.dot[data-step="${currentStep}"]`).classList.add('active');

    if (currentStep === 4) {
        generateReview();
    }
}

function prevStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`.dot[data-step="${currentStep}"]`).classList.remove('active');

    currentStep = step;

    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`.dot[data-step="${currentStep}"]`).classList.add('active');
}

// Material Table Logic
function addRow() {
    const tbody = document.getElementById('materials-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" placeholder="Item Name"></td>
        <td><input type="number" placeholder="0"></td>
        <td><button type="button" class="btn-secondary" style="padding: 0.5rem;" onclick="removeRow(this)">X</button></td>
    `;
    tbody.appendChild(tr);
}

function removeRow(btn) {
    btn.parentElement.parentElement.remove();
}

// Review Generation
function generateReview() {
    const reviewContent = document.getElementById('review-content');
    const materials = [];
    document.querySelectorAll('#materials-body tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        if (inputs[0].value) {
            materials.push(`${inputs[0].value}: ${inputs[1].value || 0}`);
        }
    });

    reviewContent.innerHTML = `
        <p><strong>Applicant:</strong> ${document.getElementById('name-applicant').value}</p>
        <p><strong>Date:</strong> ${document.getElementById('service-date').value}</p>
        <p><strong>Service:</strong> ${document.getElementById('service-type').value}</p>
        <p><strong>Lot No:</strong> ${document.getElementById('lot-no').value || '-'}</p>
        <p><strong>Materials:</strong> ${materials.join(', ') || 'None'}</p>
    `;
}

// Form Submission
document.getElementById('job-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const materials = [];
    document.querySelectorAll('#materials-body tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        if (inputs[0].value) {
            materials.push({ name: inputs[0].value, qty: inputs[1].value || 0 });
        }
    });

    const newJob = {
        id: 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        dateRequest: document.getElementById('date-request').value,
        applicant: document.getElementById('name-applicant').value,
        icNo: document.getElementById('ic-no').value,
        phone: document.getElementById('phone-no').value,
        address: document.getElementById('address').value,
        lotNo: document.getElementById('lot-no').value,
        blockNo: document.getElementById('block-no').value,
        serviceDate: document.getElementById('service-date').value,
        serviceType: document.getElementById('service-type').value,
        materials: materials,
        status: 'Pending',
        timestamp: new Date().getTime()
    };

    jobs.push(newJob);
    localStorage.setItem('skuadrone_jobs', JSON.stringify(jobs));

    alert('Job submitted successfully!');
    resetForm();
    switchView('dashboard');
});

function resetForm() {
    document.getElementById('job-form').reset();
    document.getElementById('materials-body').innerHTML = `
        <tr>
            <td><input type="text" placeholder="e.g. NPK1"></td>
            <td><input type="number" placeholder="0"></td>
            <td><button type="button" class="btn-secondary" style="padding: 0.5rem;" onclick="removeRow(this)">X</button></td>
        </tr>
    `;
    prevStep(1);
}

// Login Logic
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    // Demo credentials
    if (user === 'admin' && pass === 'skuadrone2025') {
        isLoggedIn = true;
        localStorage.setItem('skuadrone_logged_in', 'true');
        updateNav();
        switchView('dashboard');
    } else {
        alert('Invalid credentials');
    }
});

function logout() {
    isLoggedIn = false;
    localStorage.removeItem('skuadrone_logged_in');
    updateNav();
    switchView('request');
}

function updateNav() {
    if (isLoggedIn) {
        navLogin.style.display = 'none';
        navDashboard.style.display = 'block';
        navLogout.style.display = 'block';
    } else {
        navLogin.style.display = 'block';
        navDashboard.style.display = 'none';
        navLogout.style.display = 'none';
    }
}

// Dashboard Rendering
function renderDashboard() {
    const body = document.getElementById('jobs-body');
    body.innerHTML = '';

    let pending = 0;
    let completed = 0;

    jobs.sort((a, b) => b.timestamp - a.timestamp).forEach(job => {
        if (job.status === 'Pending') pending++;
        if (job.status === 'Approved') completed++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--accent);">${job.id}</td>
            <td>${job.serviceDate}</td>
            <td>${job.applicant}</td>
            <td>${job.serviceType}</td>
            <td><span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="viewJob('${job.id}')">View</button>
            </td>
        `;
        body.appendChild(tr);
    });

    document.getElementById('stat-total').innerText = jobs.length;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-completed').innerText = completed;

    // Sync service selection in request form with pricing schedule
    syncServiceDropdown();
}

function syncServiceDropdown() {
    const select = document.getElementById('service-type');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = pricing.map(p => `<option value="${p.type}">${p.type}</option>`).join('');
    if (pricing.some(p => p.type === currentVal)) {
        select.value = currentVal;
    }
}

function renderReports() {
    const body = document.getElementById('reports-body');
    if (!body) return;
    body.innerHTML = '';

    const processedJobs = jobs.filter(j => j.status !== 'Pending');

    processedJobs.sort((a, b) => b.timestamp - a.timestamp).forEach(job => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--accent);">${job.id}</td>
            <td>${job.serviceType}</td>
            <td>${job.applicant}</td>
            <td>${job.approvalDate || '-'}</td>
            <td><span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="viewReport('${job.id}')">View Report</button>
            </td>
        `;
        body.appendChild(tr);
    });
}

function viewJob(id) {
    openApprovalModal(id);
}

// Dashboard Tabs
function switchDashboardTab(tab) {
    const jobsTab = document.getElementById('tab-jobs');
    const pricingTab = document.getElementById('tab-pricing');
    const reportsTab = document.getElementById('tab-reports');
    const tabs = document.querySelectorAll('.nav-tab');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'jobs') {
        jobsTab.style.display = 'block';
        pricingTab.style.display = 'none';
        reportsTab.style.display = 'none';
        tabs[0].classList.add('active');
        renderDashboard();
    } else if (tab === 'pricing') {
        jobsTab.style.display = 'none';
        pricingTab.style.display = 'block';
        reportsTab.style.display = 'none';
        tabs[1].classList.add('active');
        renderPricing();
    } else {
        jobsTab.style.display = 'none';
        pricingTab.style.display = 'none';
        reportsTab.style.display = 'block';
        tabs[2].classList.add('active');
        renderReports();
    }
}

// Pricing Logic
let defaultPricing = [
    { type: 'Tabur Baja', rate: 15, unit: 'Beg' },
    { type: 'Sembur Baja', rate: 20, unit: 'Btl' },
    { type: 'Meracun', rate: 25, unit: 'Btl' },
    { type: 'Mapping', rate: 50, unit: 'Lot' }
];

let pricing = JSON.parse(localStorage.getItem('skuadrone_pricing')) || defaultPricing;

function renderPricing() {
    const body = document.getElementById('pricing-body');
    body.innerHTML = '';

    pricing.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${p.type}" oninput="updatePricing(${index}, 'type', this.value)"></td>
            <td><input type="number" value="${p.rate}" oninput="updatePricing(${index}, 'rate', this.value)"></td>
            <td><input type="text" value="${p.unit}" oninput="updatePricing(${index}, 'unit', this.value)"></td>
            <td><button class="btn-secondary" onclick="removePricing(${index})">Delete</button></td>
        `;
        body.appendChild(tr);
    });
}

function addPricingRow() {
    pricing.push({ type: 'New Service', rate: 0, unit: 'Unit' });
    localStorage.setItem('skuadrone_pricing', JSON.stringify(pricing));
    renderPricing();
}

function updatePricing(index, field, value) {
    pricing[index][field] = field === 'rate' ? parseFloat(value) : value;
    localStorage.setItem('skuadrone_pricing', JSON.stringify(pricing));
}

function removePricing(index) {
    pricing.splice(index, 1);
    localStorage.setItem('skuadrone_pricing', JSON.stringify(pricing));
    renderPricing();
    syncServiceDropdown();
}

// Initial render
let currentApprovalJobId = null;

function openApprovalModal(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    currentApprovalJobId = jobId;
    const header = document.querySelector('#approval-modal h3');
    header.innerText = job.status === 'Pending' ? 'Approve Job Request' : 'Job Details';

    const detailsDiv = document.getElementById('approval-details');
    const pricingEntry = pricing.find(p => p.type === job.serviceType);
    const cost = pricingEntry ? pricingEntry.rate : 0;

    detailsDiv.innerHTML = `
        <p><strong>ID:</strong> ${job.id}</p>
        <p><strong>Status:</strong> <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></p>
        <p><strong>Client:</strong> ${job.applicant}</p>
        <p><strong>Service:</strong> ${job.serviceType}</p>
        <p><strong>Date:</strong> ${job.serviceDate}</p>
        <p><strong>Estimated Cost:</strong> RM ${cost.toFixed(2)}</p>
    `;

    document.getElementById('approval-cost').innerText = cost.toFixed(2);

    const approverInput = document.getElementById('approver-name');
    const actionsDiv = document.getElementById('approval-actions');

    if (job.status !== 'Pending') {
        approverInput.value = job.approver || '';
        approverInput.disabled = true;
        actionsDiv.style.display = 'none';
        detailsDiv.innerHTML += `<p><strong>Processed By:</strong> ${job.approver}</p>`;
        detailsDiv.innerHTML += `<p><strong>Processed Date:</strong> ${job.approvalDate}</p>`;
    } else {
        approverInput.value = '';
        approverInput.disabled = false;
        actionsDiv.style.display = 'flex';
        // Reset file inputs
        document.getElementById('flight-log-upload').value = '';
        document.getElementById('dji-screenshot-upload').value = '';
    }

    document.getElementById('approval-modal').style.display = 'block';
}

function closeApprovalModal() {
    document.getElementById('approval-modal').style.display = 'none';
    currentApprovalJobId = null;
    document.getElementById('approver-name').value = '';
}

async function confirmAction(status) {
    const name = document.getElementById('approver-name').value.trim();
    if (!name) {
        alert('Please enter approver name');
        return;
    }
    const job = jobs.find(j => j.id === currentApprovalJobId);
    if (!job) return;

    // File handling
    const logFile = document.getElementById('flight-log-upload').files[0];
    const screenFile = document.getElementById('dji-screenshot-upload').files[0];

    let flightLog = '';
    let djiScreenshot = '';

    try {
        if (logFile) flightLog = await readFileAsText(logFile);
        if (screenFile) djiScreenshot = await readFileAsDataURL(screenFile);
    } catch (err) {
        alert('Error reading files. Please try again.');
        return;
    }

    job.status = status;
    job.approver = name;
    job.approvalDate = new Date().toLocaleDateString('en-MY');
    job.flightLog = flightLog;
    job.djiScreenshot = djiScreenshot;

    localStorage.setItem('skuadrone_jobs', JSON.stringify(jobs));
    renderDashboard();
    closeApprovalModal();
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function viewReport(id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const reportDoc = document.getElementById('report-document');
    const pricingEntry = pricing.find(p => p.type === job.serviceType);
    const rate = pricingEntry ? pricingEntry.rate : 0;
    const unit = pricingEntry ? pricingEntry.unit : '';

    reportDoc.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 1rem; margin-bottom: 2rem;">
            <h1 style="color: var(--primary); letter-spacing: 2px;">JOB SERVICE REPORT</h1>
            <p style="color: var(--text-secondary);">SKUADRONE | ID: ${job.id}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div>
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">A. MAKLUMAT PEMOHON</h4>
                <p><strong>Nama:</strong> ${job.applicant}</p>
                <p><strong>IC No:</strong> ${job.icNo}</p>
                <p><strong>Telefon:</strong> ${job.phone}</p>
                <p><strong>Alamat:</strong> ${job.address}</p>
            </div>
            <div>
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">B. BUTIRAN PERKHIDMATAN</h4>
                <p><strong>Jenis:</strong> ${job.serviceType}</p>
                <p><strong>Tarikh:</strong> ${job.serviceDate}</p>
                <p><strong>Lot/Blok:</strong> ${job.lotNo || '-'} / ${job.blockNo || '-'}</p>
            </div>
        </div>

        <div style="margin-bottom: 2rem;">
            <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">C. BAHAN & OPERASI</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border-bottom: 1px solid var(--glass-border); padding: 0.5rem;">Item</th>
                        <th style="border-bottom: 1px solid var(--glass-border); padding: 0.5rem; text-align: right;">Kuantiti</th>
                    </tr>
                </thead>
                <tbody>
                    ${job.materials.map(m => `
                        <tr>
                            <td style="padding: 0.5rem;">${m.name}</td>
                            <td style="padding: 0.5rem; text-align: right;">${m.qty}</td>
                        </tr>
                    `).join('')}
                    ${job.materials.length === 0 ? '<tr><td colspan="2" style="text-align: center; padding: 1rem;">Tiada bahan disenaraikan</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--glass-border);">
            <h4 style="color: var(--primary); margin-bottom: 1rem;">D. PENGESAHAN & KOS</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <p><strong>Status:</strong> <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></p>
                <p><strong>Anggaran Kos:</strong> RM ${rate.toFixed(2)} (${unit})</p>
                <p><strong>Diluluskan Oleh:</strong> ${job.approver}</p>
                <p><strong>Tarikh Lulus:</strong> ${job.approvalDate}</p>
            </div>
        </div>

        ${job.flightLog || job.djiScreenshot ? `
            <div style="margin-top: 2rem;">
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">E. BUKTI KERJA (PROOF OF WORK)</h4>
                <div class="attachment-grid">
                    ${job.djiScreenshot ? `
                        <div class="screenshot-preview">
                            <p style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">DJI Mapping Screenshot:</p>
                            <img src="${job.djiScreenshot}" alt="DJI Screenshot">
                        </div>
                    ` : ''}
                    ${job.flightLog ? `
                        <div class="log-preview-container">
                            <p style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Flight Log Report:</p>
                            <div class="log-preview">${job.flightLog}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}

        <div style="margin-top: 3rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <div style="text-align: center; width: 200px; border-top: 1px solid var(--text-secondary); padding-top: 0.5rem;">
                Tandatangan Pemohon
            </div>
            <div style="text-align: center; width: 200px; border-top: 1px solid var(--text-secondary); padding-top: 0.5rem;">
                Tandatangan Pelulus (${job.approver})
            </div>
        </div>
    `;

    document.getElementById('report-modal').style.display = 'block';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
}

window.onload = () => {
    initTheme();
    updateNav();
    renderDashboard();
    renderPricing();
    syncServiceDropdown();
};
