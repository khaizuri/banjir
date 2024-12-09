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

    // API URL
    const API_URL = 'https://infobencanajkmv2.jkm.gov.my/api/data-dashboard-aliran-trend.php?a=0&b=1&seasonmain_id=208&seasonnegeri_id=';

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

    // Function to update the dashboard
    async function updateDashboard() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            // Update last updated time
            const lastUpdated = document.getElementById('lastUpdated');
            lastUpdated.textContent = formatDate(data.data[0].created_at);

            // Calculate totals
            let totalMangsa = 0;
            let totalPPS = 0;
            let totalKeluarga = 0;
            const locationData = {};

            data.data.forEach(item => {
                totalMangsa += parseInt(item.jumlah_mangsa) || 0;
                totalPPS += parseInt(item.jumlah_pps) || 0;
                totalKeluarga += parseInt(item.jumlah_keluarga) || 0;

                // Aggregate data by location
                if (!locationData[item.negeri]) {
                    locationData[item.negeri] = {
                        pps: 0,
                        mangsa: 0,
                        keluarga: 0
                    };
                }
                locationData[item.negeri].pps += parseInt(item.jumlah_pps) || 0;
                locationData[item.negeri].mangsa += parseInt(item.jumlah_mangsa) || 0;
                locationData[item.negeri].keluarga += parseInt(item.jumlah_keluarga) || 0;
            });

            // Update statistics
            document.getElementById('totalMangsa').textContent = formatNumber(totalMangsa);
            document.getElementById('totalPPS').textContent = formatNumber(totalPPS);
            document.getElementById('totalKeluarga').textContent = formatNumber(totalKeluarga);

            // Update table
            const tableBody = document.getElementById('locationTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = '';
            
            Object.entries(locationData).forEach(([location, stats]) => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = location;
                row.insertCell(1).textContent = formatNumber(stats.pps);
                row.insertCell(2).textContent = formatNumber(stats.mangsa);
                row.insertCell(3).textContent = formatNumber(stats.keluarga);
            });

            // Update chart
            updateChart(data.data);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to update the chart
    function updateChart(data) {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        // Process data for chart
        const chartData = data.reduce((acc, item) => {
            const date = new Date(item.created_at).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = {
                    mangsa: 0,
                    keluarga: 0,
                    pps: 0
                };
            }
            acc[date].mangsa += parseInt(item.jumlah_mangsa) || 0;
            acc[date].keluarga += parseInt(item.jumlah_keluarga) || 0;
            acc[date].pps += parseInt(item.jumlah_pps) || 0;
            return acc;
        }, {});

        // Create arrays for chart
        const labels = Object.keys(chartData);
        const mangsaData = labels.map(date => chartData[date].mangsa);
        const keluargaData = labels.map(date => chartData[date].keluarga);
        const ppsData = labels.map(date => chartData[date].pps);

        // Destroy existing chart if it exists
        if (window.myChart) {
            window.myChart.destroy();
        }

        // Create new chart
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Mangsa',
                        data: mangsaData,
                        borderColor: '#1a73e8',
                        tension: 0.1
                    },
                    {
                        label: 'Keluarga',
                        data: keluargaData,
                        borderColor: '#34a853',
                        tension: 0.1
                    },
                    {
                        label: 'PPS',
                        data: ppsData,
                        borderColor: '#ea4335',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Trend Banjir'
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

    // Initial update
    updateDashboard();

    // Update every 5 minutes
    setInterval(updateDashboard, 5 * 60 * 1000);
});
