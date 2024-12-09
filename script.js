document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            targetSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Handle contact form submission
    const contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });

    // CTA button interaction
    const ctaButton = document.getElementById('cta-button');
    ctaButton.addEventListener('click', () => {
        document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
    });

    // API URLs
    const API_URLS = {
        trendMasuk: 'https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-aliran-trend-masuk.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id=',
        trendBalik: 'https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-aliran-trend-balik.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id=',
        tablePPS: 'https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-table-pps.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id=',
        pusatBuka: 'https://infobencanajkmv2.jkm.gov.my/api/pusat-buka.php?a=0&b=1'
    };

    // Function to format numbers with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Function to format date
    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        return new Date(dateString).toLocaleDateString('ms-MY', options);
    }

    // Function to create or update a chart
    function createChart(canvasId, labels, datasets, title) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
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
    }

    // Function to process trend data
    function processTrendData(data) {
        const chartData = data.reduce((acc, item) => {
            const date = new Date(item.created_at).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = {
                    mangsa: 0,
                    keluarga: 0
                };
            }
            acc[date].mangsa += parseInt(item.jumlah_mangsa) || 0;
            acc[date].keluarga += parseInt(item.jumlah_keluarga) || 0;
            return acc;
        }, {});

        return {
            labels: Object.keys(chartData),
            mangsa: Object.values(chartData).map(d => d.mangsa),
            keluarga: Object.values(chartData).map(d => d.keluarga)
        };
    }

    // Function to update dashboard
    async function updateDashboard() {
        try {
            // Fetch all data
            const responses = await Promise.all([
                fetch(API_URLS.trendMasuk),
                fetch(API_URLS.trendBalik),
                fetch(API_URLS.tablePPS),
                fetch(API_URLS.pusatBuka)
            ]);

            const [trendMasukData, trendBalikData, tablePPSData, pusatBukaData] = await Promise.all(
                responses.map(r => r.json())
            );

            // Update last updated time
            const lastUpdated = document.getElementById('lastUpdated');
            lastUpdated.textContent = formatDate(new Date().toISOString());

            // Process trend data
            const masukTrend = processTrendData(trendMasukData.data);
            const balikTrend = processTrendData(trendBalikData.data);

            // Update Masuk chart
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

            // Update Balik chart
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

            // Calculate totals
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
            document.getElementById('totalMangsa').textContent = formatNumber(totalMasuk.mangsa);
            document.getElementById('mangsaMasuk').textContent = formatNumber(totalMasuk.mangsa);
            document.getElementById('mangsaBalik').textContent = formatNumber(totalBalik.mangsa);

            document.getElementById('totalKeluarga').textContent = formatNumber(totalMasuk.keluarga);
            document.getElementById('keluargaMasuk').textContent = formatNumber(totalMasuk.keluarga);
            document.getElementById('keluargaBalik').textContent = formatNumber(totalBalik.keluarga);

            // Process PPS data
            const ppsStats = pusatBukaData.data.reduce((acc, item) => {
                if (item.status === 'Buka') acc.aktif++;
                else if (item.status === 'Tutup') acc.tutup++;
                return acc;
            }, { aktif: 0, tutup: 0 });

            document.getElementById('totalPPS').textContent = formatNumber(ppsStats.aktif + ppsStats.tutup);
            document.getElementById('ppsAktif').textContent = formatNumber(ppsStats.aktif);
            document.getElementById('ppsTutup').textContent = formatNumber(ppsStats.tutup);

            // Update PPS table
            const tableBody = document.getElementById('ppsTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = '';
            
            pusatBukaData.data.forEach(pps => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = pps.negeri;
                row.insertCell(1).textContent = pps.daerah;
                row.insertCell(2).textContent = pps.nama_pps;
                row.insertCell(3).textContent = formatNumber(pps.jumlah_mangsa);
                row.insertCell(4).textContent = formatNumber(pps.jumlah_keluarga);
                const statusCell = row.insertCell(5);
                statusCell.textContent = pps.status;
                statusCell.className = pps.status.toLowerCase();
            });

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Initial update
    updateDashboard();

    // Update every 5 minutes
    setInterval(updateDashboard, 5 * 60 * 1000);
});
