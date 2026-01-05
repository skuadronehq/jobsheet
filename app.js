// Supabase Configuration
const SUPABASE_URL = 'https://gbovcvmjgmdsulzvwdtu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRkK4zpu30zx4tTnLedBgw_N3wMzL5r';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
let currentStep = 1;
let jobs = [];
let pricingList = [];
let regionsList = [];
let isLoggedIn = localStorage.getItem('skuadrone_logged_in') === 'true';

// Dynamic Service Configuration
const serviceConfig = {
    'TABUR BAJA 20KG': { unit: 'KG', defaultMaterials: ['Baja Campuran', 'Baja Urea'] },
    'TABUR BAJA 25-30KG': { unit: 'KG', defaultMaterials: ['Baja Campuran', 'Baja Urea'] },
    'TABUR BENIH PADI': { unit: 'BEG', defaultMaterials: ['Benih Padi MR297'] },
    'RACUN ULAT': { unit: 'ML', defaultMaterials: ['Racun Ulat A', 'Racun Ulat B'] },
    'RACUN SIPUT': { unit: 'ML', defaultMaterials: ['Racun Siput A', 'Racun Siput B'] },
    'RACUN RUMPUT': { unit: 'ML', defaultMaterials: ['Racun Rumput A', 'Racun Rumput B'] },
    'RACUN RUMPUT DALAM PADI': { unit: 'ML', defaultMaterials: ['Racun Rumput A', 'Racun Rumput B'] },
    'TABUR KAPUR BUTIR': { unit: 'KG', defaultMaterials: ['Kapur Butir'] },
    'SEMBUR KAPUR CECAIR': { unit: 'ML', defaultMaterials: ['Kapur Cecair'] }
};



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

async function fetchRegions() {
    const { data, error } = await db
        .from('regions')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching regions:', error);
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

function handleLocationChange() {
    const locationName = document.getElementById('location-select').value;
    const region = regionsList.find(r => r.name === locationName);
    const areaLabel = document.getElementById('area-label');
    const areaInput = document.getElementById('total-area');

    if (region) {
        areaLabel.innerText = `Keluasan (${region.unit})`;
        areaInput.placeholder = region.unit === 'Hektar' ? 'Contoh: 2.5' : 'Contoh: 3.5';
    }
}

function getRate(serviceType, locationName) {
    const region = regionsList.find(r => r.name === locationName);

    // Safety check: if no region selected/found, try to find a global price or default to 0
    if (!region) {
        const pricing = pricingList.find(p => p.service_name === serviceType && !p.region_id);
        return { rate: pricing ? (pricing.price_per_ha || 0) : 0, unit: 'Hektar' };
    }

    const pricing = pricingList.find(p => p.service_name === serviceType && p.region_id === region.id);

    // If no specific price found for this region, alert or log it
    if (!pricing) {
        console.warn(`No price found for ${serviceType} in region ${locationName}. Defaulting to 0.`);
    }

    return {
        rate: pricing ? (pricing.price_per_ha || 0) : 0,
        unit: region.unit || 'Hektar'
    };
}

function populateLocationSelectors() {
    const selector = document.getElementById('location-select');
    const pricingSelector = document.getElementById('pricing-region-select');

    if (selector) {
        selector.innerHTML = regionsList.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
    }
    if (pricingSelector) {
        pricingSelector.innerHTML = regionsList.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
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

    if (currentStep === 3) {
        populateMaterialsStep();
    }

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

function populateMaterialsStep() {
    const serviceType = document.getElementById('service-type').value;
    const config = serviceConfig[serviceType] || { unit: 'Beg/Btl', defaultMaterials: [] };

    // Update Header
    document.getElementById('unit-header').innerText = `Quantity (${config.unit})`;

    // Update Datalist
    const datalist = document.getElementById('material-suggestions');
    if (datalist) {
        datalist.innerHTML = config.defaultMaterials.map(m => `<option value="${m}">`).join('');
    }

    // Clear and fill table
    const tbody = document.getElementById('materials-body');
    tbody.innerHTML = '';

    if (config.defaultMaterials.length > 0) {
        config.defaultMaterials.forEach(material => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" placeholder="e.g. NPK1" value="${material}" list="material-suggestions"></td>
                <td><input type="number" placeholder="Value in ${config.unit}"></td>
                <td><button type="button" class="btn-secondary" style="padding: 0.5rem;" onclick="removeRow(this)">X</button></td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        addRow();
    }
}

// Material Table Logic
function addRow() {
    const serviceType = document.getElementById('service-type').value;
    const config = serviceConfig[serviceType] || { unit: 'Beg/Btl' };

    const tbody = document.getElementById('materials-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" placeholder="Item Name" list="material-suggestions"></td>
        <td><input type="number" placeholder="Value in ${config.unit}"></td>
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

    const serviceType = document.getElementById('service-type').value;
    const area = parseFloat(document.getElementById('total-area').value) || 0;
    const team = document.getElementById('involved-team').value || '-';
    const location = document.getElementById('location-select').value;
    const { rate, unit } = getRate(serviceType, location);
    const totalPrice = area * rate;

    reviewContent.innerHTML = `
        <p><strong>Lokasi:</strong> ${location}</p>
        <p><strong>Applicant:</strong> ${document.getElementById('name-applicant').value}</p>
        <p><strong>Date:</strong> ${document.getElementById('service-date').value}</p>
        <p><strong>Service:</strong> ${serviceType} (Rate: RM ${rate}/${unit})</p>
        <p><strong>Keluasan:</strong> ${area} ${unit}</p>
        <p><strong>Lot No:</strong> ${document.getElementById('lot-no').value || '-'}</p>
        <p><strong>Jenis Tanaman:</strong> ${document.getElementById('crop-type').value || '-'}</p>
        <p><strong>Variety:</strong> ${document.getElementById('variety').value || '-'}</p>
        <p><strong>Team Terlibat:</strong> ${team}</p>
        <p><strong>Materials:</strong> ${materials.join(', ') || 'None'}</p>
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--accent); font-size: 1.2rem;">
            <strong>Jumlah Harga Job Ini: RM ${totalPrice.toFixed(2)}</strong>
            ${rate === 0 ? '<br><small style="color: #ff6b6b">⚠️ Price not set for this region/service.</small>' : ''}
        </div>
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
    const location = document.getElementById('location-select').value;

    const serviceType = document.getElementById('service-type').value;
    const area = parseFloat(document.getElementById('total-area').value) || 0;

    const { rate } = getRate(serviceType, location);
    const totalPrice = area * rate;

    const newJob = {
        id: jobId,
        location: location,
        request_datetime: document.getElementById('date-request').value,
        applicant_type: applicantType,
        applicant_name: document.getElementById('name-applicant').value,
        applicant_ic: document.getElementById('ic-no').value,
        applicant_phone: document.getElementById('phone-no').value,
        applicant_address: document.getElementById('address').value,
        lot_no: document.getElementById('lot-no').value,
        block_no: document.getElementById('block-no').value,
        jenis_tanaman: document.getElementById('crop-type').value,
        variety: document.getElementById('variety').value,
        total_area: area,
        involved_team: document.getElementById('involved-team').value,
        total_price: totalPrice,
        service_date: document.getElementById('service-date').value,
        service_type: serviceType,
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
    document.getElementById('materials-body').innerHTML = '';
    addRow();
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
            <td>${job.service_date} <br><small style="color: var(--text-secondary)">${job.location || 'Selangor'}</small></td>
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
    const uniqueServices = [...new Set(pricingList.map(p => p.service_name))];
    select.innerHTML = uniqueServices.map(s => `<option value="${s}">${s}</option>`).join('');
    if (uniqueServices.includes(currentVal)) {
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
            <td>${job.service_type} <br><small style="color: var(--text-secondary)">${job.location || 'Selangor'}</small></td>
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
    const regionsTab = document.getElementById('tab-regions');
    const reportsTab = document.getElementById('tab-reports');
    const tabs = document.querySelectorAll('.nav-tab');

    tabs.forEach(t => t.classList.remove('active'));

    // Hide all
    if (jobsTab) jobsTab.style.display = 'none';
    if (pricingTab) pricingTab.style.display = 'none';
    if (regionsTab) regionsTab.style.display = 'none';
    if (reportsTab) reportsTab.style.display = 'none';

    if (tab === 'jobs') {
        jobsTab.style.display = 'block';
        tabs[0].classList.add('active');
        renderDashboard();
    } else if (tab === 'pricing') {
        pricingTab.style.display = 'block';
        tabs[1].classList.add('active');
        renderPricing();
    } else if (tab === 'regions') {
        regionsTab.style.display = 'block';
        tabs[2].classList.add('active');
        renderRegions();
    } else {
        reportsTab.style.display = 'block';
        tabs[3].classList.add('active');
        renderReports();
    }
}

// Pricing Logic
function renderPricing() {
    const body = document.getElementById('pricing-body');
    const regionId = document.getElementById('pricing-region-select').value;
    if (!body || !regionId) return;
    body.innerHTML = '';

    const selectedRegion = regionsList.find(r => r.id === regionId);
    const unit = selectedRegion ? selectedRegion.unit : 'Unit';

    const filteredPricing = pricingList.filter(p => p.region_id === regionId);

    filteredPricing.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${p.service_name}" onchange="updatePricing('${p.id}', 'service_name', this.value)"></td>
            <td><input type="number" value="${p.price_per_ha}" onchange="updatePricing('${p.id}', 'price_per_ha', this.value)"></td>
            <td><input type="text" value="${unit}" disabled></td>
            <td><button class="btn-secondary" onclick="removePricing('${p.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });
}

async function addPricingRow() {
    const regionId = document.getElementById('pricing-region-select').value;
    if (!regionId) return alert('Please select a region first');

    const { error } = await db
        .from('pricing')
        .insert([{
            service_name: 'New Service',
            price_per_ha: 0,
            region_id: regionId
        }]);

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
    if (!confirm('Are you sure you want to delete this pricing rate?')) return;
    const { error } = await db
        .from('pricing')
        .delete()
        .eq('id', id);

    if (error) alert('Error removing pricing: ' + error.message);
    pricingList = await fetchPricing();
    renderPricing();
    syncServiceDropdown();
}

// Regions Logic
function renderRegions() {
    const body = document.getElementById('regions-body');
    if (!body) return;
    body.innerHTML = '';

    regionsList.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${r.name}" onchange="updateRegion('${r.id}', 'name', this.value)"></td>
            <td><input type="text" value="${r.unit}" onchange="updateRegion('${r.id}', 'unit', this.value)" placeholder="Hektar / Relong"></td>
            <td><button class="btn-secondary" onclick="removeRegion('${r.id}')">Delete</button></td>
        `;
        body.appendChild(tr);
    });
}

async function addRegionRow() {
    const { error } = await db
        .from('regions')
        .insert([{ name: 'New Region', unit: 'Hektar' }]);

    if (error) alert('Error adding region: ' + error.message);
    regionsList = await fetchRegions();
    populateLocationSelectors();
    renderRegions();
}

async function updateRegion(id, field, value) {
    const updateData = {};
    updateData[field] = value;

    const { error } = await db
        .from('regions')
        .update(updateData)
        .eq('id', id);

    if (error) alert('Error updating region: ' + error.message);
    regionsList = await fetchRegions();
    populateLocationSelectors();
}

async function removeRegion(id) {
    if (!confirm('Are you sure you want to delete this region? All associated prices will remain in the database but may become inaccessible.')) return;
    const { error } = await db
        .from('regions')
        .delete()
        .eq('id', id);

    if (error) alert('Error removing region: ' + error.message);
    regionsList = await fetchRegions();
    populateLocationSelectors();
    renderRegions();
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
    const { rate, unit } = getRate(job.service_type, job.location);
    const cost = rate; // The cost in modal seems to be just the rate per unit? 
    // Wait, the modal says "Estimated Cost (RM)". In the original it was using price_per_ha.
    // Let's check the submission logic. submission stores total_price = area * rate.
    // The modal should probably show the total price or the rate.
    // Original: const cost = pricingEntry ? pricingEntry.price_per_ha : 0;
    // It seems it was showing the rate per Hektar.

    detailsDiv.innerHTML = `
        <p><strong>ID:</strong> ${job.id}</p>
        <p><strong>Status:</strong> <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span></p>
        <p><strong>Lokasi:</strong> ${job.location || 'Selangor'}</p>
        <p><strong>Client:</strong> ${job.applicant_name}</p>
        <p><strong>Service:</strong> ${job.service_type}</p>
        <p><strong>Date:</strong> ${job.service_date}</p>
        <p><strong>Keluasan:</strong> ${job.total_area} ${unit}</p>
        <p><strong>Rate:</strong> RM ${rate.toFixed(2)}/${unit}</p>
        <p><strong>Estimated Total:</strong> RM ${(job.total_area * rate).toFixed(2)}</p>
    `;

    document.getElementById('approval-cost').innerText = (job.total_area * rate).toFixed(2);

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
    const { rate, unit } = getRate(job.service_type, job.location);

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
                <p><strong>Jenis Tanaman:</strong> ${job.jenis_tanaman || '-'}</p>
                <p><strong>Variety:</strong> ${job.variety || '-'}</p>
                <p><strong>Keluasan:</strong> ${job.total_area || '0'} ${unit}</p>
                <p><strong>Lokasi:</strong> ${job.location || 'Selangor'}</p>
                <p><strong>Team Terlibat:</strong> ${job.involved_team || '-'}</p>
                <p style="font-size: 1.1rem; color: var(--primary); margin-top: 1rem;"><strong>JUMLAH HARGA: RM ${(job.total_price || 0).toFixed(2)}</strong></p>
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
    regionsList = await fetchRegions();
    populateLocationSelectors();

    jobs = await fetchJobs();
    pricingList = await fetchPricing();

    renderDashboard();
    renderPricing();
    syncServiceDropdown();

    // Set initial unit label
    handleLocationChange();

    // Listen for service/location changes to update labels
    document.getElementById('service-type').addEventListener('change', handleLocationChange);
    document.getElementById('location-select').addEventListener('change', handleLocationChange);
};
