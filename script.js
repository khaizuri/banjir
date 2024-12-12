// API URLs with CORS proxy
const CORS_PROXY = 'https://corsproxy.io/?';
const API_URLS = {
    trendMasuk: CORS_PROXY + encodeURIComponent('https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-aliran-trend-masuk.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id='),
    trendBalik: CORS_PROXY + encodeURIComponent('https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-aliran-trend-balik.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id='),
    tablePPS: CORS_PROXY + encodeURIComponent('https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-table-pps.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id='),
    pusatBuka: CORS_PROXY + encodeURIComponent('https://infobencanajkmv2.jkm.gov.my/api/pusat-buka.php?a=0&b=1')
};

// Function to safely get DOM element
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// Function to format numbers with commas
function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
}

// Function to format date
function formatDate(dateString) {
    try {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        return new Date(dateString).toLocaleDateString('ms-MY', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return new Date().toLocaleDateString('ms-MY');
    }
}

// Function to create or update a chart
function createChart(canvasId, labels, datasets, title) {
    try {
        const canvas = getElement(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error(`Could not get 2d context for ${canvasId}`);
            return;
        }
        
        // Destroy existing chart if it exists
        if (window[canvasId]) {
            window[canvasId].destroy();
        }

        window[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error creating chart ${canvasId}:`, error);
    }
}

// Function to process trend data
function processTrendData(data) {
    try {
        if (!Array.isArray(data)) {
            console.error('Invalid data format:', data);
            return {
                labels: [],
                mangsa: [],
                keluarga: []
            };
        }

        const chartData = data.reduce((acc, item) => {
            try {
                const date = new Date(item.created_at).toLocaleDateString();
                if (!acc[date]) {
                    acc[date] = {
                        mangsa: 0,
                        keluarga: 0
                    };
                }
                acc[date].mangsa += parseInt(item.jumlah_mangsa) || 0;
                acc[date].keluarga += parseInt(item.jumlah_keluarga) || 0;
            } catch (error) {
                console.error('Error processing trend item:', error, item);
            }
            return acc;
        }, {});

        return {
            labels: Object.keys(chartData),
            mangsa: Object.values(chartData).map(d => d.mangsa),
            keluarga: Object.values(chartData).map(d => d.keluarga)
        };
    } catch (error) {
        console.error('Error processing trend data:', error);
        return {
            labels: [],
            mangsa: [],
            keluarga: []
        };
    }
}

// Function to fetch data with timeout and retry
async function fetchWithRetry(url, retries = 3, timeout = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Function to update dashboard
async function updateDashboard() {
    try {
        // Show loading state
        document.querySelectorAll('.stat').forEach(stat => {
            if (stat) stat.textContent = 'Loading...';
        });

        // Fetch all data with retry mechanism
        const [trendMasukData, trendBalikData, tablePPSData, pusatBukaData] = await Promise.all([
            fetchWithRetry(API_URLS.trendMasuk),
            fetchWithRetry(API_URLS.trendBalik),
            fetchWithRetry(API_URLS.tablePPS),
            fetchWithRetry(API_URLS.pusatBuka)
        ]);

        // Update last updated time
        const lastUpdated = getElement('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = formatDate(new Date().toISOString());
        }

        // Process trend data
        if (trendMasukData && trendMasukData.data) {
            const masukTrend = processTrendData(trendMasukData.data);
            createChart('trendMasukChart', masukTrend.labels, [
                {
                    label: 'Mangsa Masuk',
                    data: masukTrend.mangsa,
                    borderColor: '#1a73e8',
                    tension: 0.1
                },
                {
                    label: 'Keluarga Masuk',
                    data: masukTrend.keluarga,
                    borderColor: '#34a853',
                    tension: 0.1
                }
            ], 'Trend Aliran Masuk');
        }

        if (trendBalikData && trendBalikData.data) {
            const balikTrend = processTrendData(trendBalikData.data);
            createChart('trendBalikChart', balikTrend.labels, [
                {
                    label: 'Mangsa Balik',
                    data: balikTrend.mangsa,
                    borderColor: '#ea4335',
                    tension: 0.1
                },
                {
                    label: 'Keluarga Balik',
                    data: balikTrend.keluarga,
                    borderColor: '#fbbc04',
                    tension: 0.1
                }
            ], 'Trend Aliran Balik');
        }

        // Calculate totals
        if (trendMasukData && trendMasukData.data) {
            const totalMasuk = trendMasukData.data.reduce((acc, item) => {
                acc.mangsa += parseInt(item.jumlah_mangsa) || 0;
                acc.keluarga += parseInt(item.jumlah_keluarga) || 0;
                return acc;
            }, { mangsa: 0, keluarga: 0 });

            const totalBalik = trendBalikData.data.reduce((acc, item) => {
                acc.mangsa += parseInt(item.jumlah_mangsa) || 0;
                acc.keluarga += parseInt(item.jumlah_keluarga) || 0;
                return acc;
            }, { mangsa: 0, keluarga: 0 });

            // Update statistics
            const elements = {
                totalMangsa: totalMasuk.mangsa,
                mangsaMasuk: totalMasuk.mangsa,
                mangsaBalik: totalBalik.mangsa,
                totalKeluarga: totalMasuk.keluarga,
                keluargaMasuk: totalMasuk.keluarga,
                keluargaBalik: totalBalik.keluarga
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = getElement(id);
                if (element) {
                    element.textContent = formatNumber(value);
                }
            });
        }

        // Process PPS data
        if (pusatBukaData && pusatBukaData.data) {
            const ppsStats = pusatBukaData.data.reduce((acc, item) => {
                if (item.status === 'Buka') acc.aktif++;
                else if (item.status === 'Tutup') acc.tutup++;
                return acc;
            }, { aktif: 0, tutup: 0 });

            const ppsElements = {
                totalPPS: ppsStats.aktif + ppsStats.tutup,
                ppsAktif: ppsStats.aktif,
                ppsTutup: ppsStats.tutup
            };

            Object.entries(ppsElements).forEach(([id, value]) => {
                const element = getElement(id);
                if (element) {
                    element.textContent = formatNumber(value);
                }
            });

            // Update PPS table
            const ppsTable = getElement('ppsTable');
            const tableBody = ppsTable?.getElementsByTagName('tbody')[0];
            if (tableBody) {
                tableBody.innerHTML = '';
                
                pusatBukaData.data.forEach(pps => {
                    const row = tableBody.insertRow();
                    row.insertCell(0).textContent = pps.negeri || '-';
                    row.insertCell(1).textContent = pps.daerah || '-';
                    row.insertCell(2).textContent = pps.nama_pps || '-';
                    row.insertCell(3).textContent = formatNumber(pps.jumlah_mangsa);
                    row.insertCell(4).textContent = formatNumber(pps.jumlah_keluarga);
                    const statusCell = row.insertCell(5);
                    statusCell.textContent = pps.status || '-';
                    statusCell.className = (pps.status || '').toLowerCase();
                });
            }
        }

    } catch (error) {
        console.error('Error updating dashboard:', error);
        document.querySelectorAll('.stat').forEach(stat => {
            if (stat) stat.textContent = 'Error loading data';
        });
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing dashboard...');
    updateDashboard().catch(error => {
        console.error('Error during initial dashboard update:', error);
    });
    // Update every 5 minutes
    setInterval(updateDashboard, 5 * 60 * 1000);
});
