// Supabase Configuration
const SUPABASE_URL = 'https://gbovcvmjgmdsulzvwdtu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRkK4zpu30zx4tTnLedBgw_N3wMzL5r';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
let currentStep = 1;
let jobs = [];
let pricingList = [];
let isLoggedIn = localStorage.getItem('skuadrone_logged_in') === 'true';

// Navigation Constants
const navRequest = document.getElementById('nav-request');
const navDashboard = document.getElementById('nav-dashboard');
const navLogin = document.getElementById('nav-login');
const navLogout = document.getElementById('nav-logout');
const viewRequest = document.getElementById('view-request');
const viewDashboard = document.getElementById('view-dashboard');
const viewLogin = document.getElementById('view-login');

async function fetchJobs() {
    const { data, error } = await db
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching jobs:', error);
        return [];
    }
    return data;
}

async function fetchPricing() {
    const { data, error } = await db
        .from('pricing')
        .select('*')
        .order('service_name');

    if (error) {
        console.error('Error fetching pricing:', error);
        return [];
    }
    return data;
}

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
document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const materials = [];
    document.querySelectorAll('#materials-body tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        if (inputs[0].value) {
            materials.push({ name: inputs[0].value, qty: inputs[1].value || 0 });
        }
    });

    const jobId = 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const applicantType = document.querySelector('input[name="applicant-type"]:checked').value;

    const newJob = {
        id: jobId,
        request_datetime: document.getElementById('date-request').value,
        applicant_type: applicantType,
        applicant_name: document.getElementById('name-applicant').value,
        applicant_ic: document.getElementById('ic-no').value,
        applicant_phone: document.getElementById('phone-no').value,
        applicant_address: document.getElementById('address').value,
        lot_no: document.getElementById('lot-no').value,
        block_no: document.getElementById('block-no').value,
        service_date: document.getElementById('service-date').value,
        service_type: document.getElementById('service-type').value,
        materials: materials,
        status: 'Pending'
    };

    const { data, error } = await db
        .from('jobs')
        .insert([newJob])
        .select();

    if (error) {
        alert('Error submitting job: ' + error.message);
        return;
    }

    // Refresh local state and reset form to beginning
    jobs = await fetchJobs();
    alert('Permohonan berjaya dihantar!');
    resetForm();
    switchView('request');
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

    jobs.forEach(job => {
        if (job.status === 'Pending') pending++;
        if (job.status === 'Approved') completed++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--accent);">${job.id}</td>
            <td>${job.service_date}</td>
            <td><span class="badge" style="background: ${job.applicant_type === 'Ketua Blok' ? 'var(--accent)' : 'var(--primary)'}; color: #0f172a;">${job.applicant_type || 'Individu'}</span></td>
            <td>${job.applicant_name}</td>
            <td>${job.service_type}</td>
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
    select.innerHTML = pricingList.map(p => `<option value="${p.service_name}">${p.service_name}</option>`).join('');
    if (pricingList.some(p => p.service_name === currentVal)) {
        select.value = currentVal;
    }
}

function renderReports() {
    const body = document.getElementById('reports-body');
    if (!body) return;
    body.innerHTML = '';

    const processedJobs = jobs.filter(j => j.status !== 'Pending');

    processedJobs.forEach(job => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--accent);">${job.id}</td>
            <td>${job.service_type}</td>
            <td>${job.applicant_name}</td>
            <td>${job.approval_date || '-'}</td>
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
function renderPricing() {
    const body = document.getElementById('pricing-body');
    if (!body) return;
    body.innerHTML = '';

    pricingList.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${p.service_name}" onchange="updatePricing('${p.id}', 'service_name', this.value)"></td>
            <td><input type="number" value="${p.price_per_ha}" onchange="updatePricing('${p.id}', 'price_per_ha', this.value)"></td>
            <td><input type="text" value="Hektar" disabled></td>
            <td><button class="btn-secondary" onclick="removePricing('${p.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });
}

async function addPricingRow() {
    const { error } = await db
        .from('pricing')
        .insert([{ service_name: 'New Service ' + Math.floor(Math.random() * 1000), price_per_ha: 0 }]);

    if (error) alert('Error adding pricing: ' + error.message);
    pricingList = await fetchPricing();
    renderPricing();
    syncServiceDropdown();
}

async function updatePricing(id, field, value) {
    const updateData = {};
    updateData[field] = field === 'price_per_ha' ? parseFloat(value) : value;

    const { error } = await db
        .from('pricing')
        .update(updateData)
        .eq('id', id);

    if (error) alert('Error updating pricing: ' + error.message);
    pricingList = await fetchPricing();
    syncServiceDropdown();
}

async function removePricing(id) {
    const { error } = await db
        .from('pricing')
        .delete()
        .eq('id', id);

    if (error) alert('Error removing pricing: ' + error.message);
    pricingList = await fetchPricing();
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
    const pricingEntry = pricingList.find(p => p.service_name === job.service_type);
    const cost = pricingEntry ? pricingEntry.price_per_ha : 0;

    detailsDiv.innerHTML = `
        <p><strong>ID:</strong> ${job.id}</p>
        <p><strong>Status:</strong> <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></p>
        <p><strong>Client:</strong> ${job.applicant_name}</p>
        <p><strong>Service:</strong> ${job.service_type}</p>
        <p><strong>Date:</strong> ${job.service_date}</p>
        <p><strong>Estimated Cost:</strong> RM ${cost.toFixed(2)}</p>
    `;

    document.getElementById('approval-cost').innerText = cost.toFixed(2);

    const approverInput = document.getElementById('approver-name');
    const actionsDiv = document.getElementById('approval-actions');

    if (job.status !== 'Pending') {
        approverInput.value = job.approver_name || '';
        approverInput.disabled = true;
        actionsDiv.style.display = 'none';
        detailsDiv.innerHTML += `<p><strong>Processed By:</strong> ${job.approver_name}</p>`;
        detailsDiv.innerHTML += `<p><strong>Processed Date:</strong> ${job.approval_date}</p>`;
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

async function uploadFile(file, bucket, path) {
    const { data, error } = await db.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = db.storage
        .from(bucket)
        .getPublicUrl(path);

    return urlData.publicUrl;
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

    try {
        let screenshot_url = job.screenshot_url;
        let flight_log_url = job.flight_log_url;

        const logFile = document.getElementById('flight-log-upload').files[0];
        const screenFile = document.getElementById('dji-screenshot-upload').files[0];

        if (logFile) {
            flight_log_url = await uploadFile(logFile, 'proof-of-work', `logs/${job.id}_log.txt`);
        }
        if (screenFile) {
            screenshot_url = await uploadFile(screenFile, 'proof-of-work', `screenshots/${job.id}_screen.png`);
        }

        const updateData = {
            status: status,
            approver_name: name,
            approval_date: new Date().toLocaleDateString('ms-MY'),
            flight_log_url: flight_log_url,
            screenshot_url: screenshot_url
        };

        const { error } = await supabase
            .from('jobs')
            .update(updateData)
            .eq('id', job.id);

        if (error) throw error;

        jobs = await fetchJobs();
        renderDashboard();
        if (typeof renderReports === 'function') renderReports();
        closeApprovalModal();
        alert(`Job ${status === 'Approved' ? 'diluluskan' : 'ditolak'}!`);

    } catch (err) {
        alert('Error processing approval: ' + err.message);
    }
}

async function viewReport(id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const reportDoc = document.getElementById('report-document');
    const pricingEntry = pricingList.find(p => p.service_name === job.service_type);
    const rate = pricingEntry ? pricingEntry.price_per_ha : 0;
    const unit = 'Hektar';

    // Fetch flight log content if exists
    let flightLogText = 'No text content';
    if (job.flight_log_url) {
        try {
            const response = await fetch(job.flight_log_url);
            flightLogText = await response.text();
        } catch (e) {
            flightLogText = 'Error loading log file.';
        }
    }

    reportDoc.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 1rem; margin-bottom: 2rem;">
            <h1 style="color: var(--primary); letter-spacing: 2px;">JOB SERVICE REPORT</h1>
            <p style="color: var(--text-secondary);">SKUADRONE | ID: ${job.id}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div>
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">A. MAKLUMAT PEMOHON</h4>
                <p><strong>Nama:</strong> ${job.applicant_name}</p>
                <p><strong>IC No:</strong> ${job.applicant_ic}</p>
                <p><strong>Telefon:</strong> ${job.applicant_phone}</p>
                <p><strong>Alamat:</strong> ${job.applicant_address}</p>
            </div>
            <div>
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">B. BUTIRAN PERKHIDMATAN</h4>
                <p><strong>Jenis:</strong> ${job.service_type}</p>
                <p><strong>Tarikh:</strong> ${job.service_date}</p>
                <p><strong>Lot/Blok:</strong> ${job.lot_no || '-'} / ${job.block_no || '-'}</p>
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
                <p><strong>Diluluskan Oleh:</strong> ${job.approver_name}</p>
                <p><strong>Tarikh Lulus:</strong> ${job.approval_date}</p>
            </div>
        </div>

        ${job.flight_log_url || job.screenshot_url ? `
            <div style="margin-top: 2rem;">
                <h4 style="color: var(--accent); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">E. BUKTI KERJA (PROOF OF WORK)</h4>
                <div class="attachment-grid">
                    ${job.screenshot_url ? `
                        <div class="screenshot-preview">
                            <p style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">DJI Mapping Screenshot:</p>
                            <img src="${job.screenshot_url}" alt="DJI Screenshot">
                        </div>
                    ` : ''}
                    ${job.flight_log_url ? `
                        <div class="log-preview-container">
                            <p style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Flight Log Report:</p>
                            <div class="log-preview">${flightLogText}</div>
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
                Tandatangan Pelulus (${job.approver_name || '-'})
            </div>
        </div>
    `;

    document.getElementById('report-modal').style.display = 'block';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
}

// Time validation for permohonan (max 10:00 PM)
function initDateTimeValidation() {
    const dateInput = document.getElementById('date-request');
    if (!dateInput) return;

    dateInput.addEventListener('change', function () {
        const selectedDateTime = new Date(this.value);
        const hours = selectedDateTime.getHours();

        // If time is after 22:00 (10:00 PM), reset to 22:00
        if (hours > 22 || (hours === 22 && selectedDateTime.getMinutes() > 0)) {
            alert('Waktu permohonan tidak boleh melebihi 10:00 PM. Waktu telah ditetapkan semula kepada 10:00 PM.');
            const date = this.value.split('T')[0];
            this.value = date + 'T22:00';
        }
    });
}

window.onload = async () => {
    initTheme();
    updateNav();
    initDateTimeValidation();

    // Initial data fetch
    jobs = await fetchJobs();
    pricingList = await fetchPricing();

    renderDashboard();
    renderPricing();
    syncServiceDropdown();
};
