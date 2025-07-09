import MSForecast from './mock-api.js';
import EmailService from './email-service.js';
import { initDB, saveClimateData, getClimateStats } from './db.js';

// Creamos las instancias aquí
const forecastAPI = new MSForecast();
const emailService = new EmailService();

// Configuración del gráfico
let chart;

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar DB
        await initDB();
        
        // Cargar configuración inicial
        emailService.updateConfig({
            email: document.getElementById('alert-email').value,
            tempThreshold: { 
                min: parseFloat(document.getElementById('min-temp-alert').value),
                max: parseFloat(document.getElementById('max-temp-alert').value)
            },
            humidityThreshold: { 
                min: parseFloat(document.getElementById('min-humidity-alert').value),
                max: parseFloat(document.getElementById('max-humidity-alert').value)
            }
        });

        // Inicializar gráfico
        initChart();
        
        // Primera carga de datos
        await updateReadings();
        
        // Configurar intervalos
        setInterval(async () => {
            await updateReadings();
            await checkConditionsAndAlert();
        }, 30000); // 30 segundos para pruebas (original: 5 * 60 * 1000)

        // Event listeners
        setupEventListeners();

    } catch (error) {
        console.error("Error inicializando la aplicación:", error);
    }
});

// Funciones principales
function initChart() {
    const ctx = document.getElementById('history-chart').getContext('2d');
    
    // Destruir gráfico existente si hay uno
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: { 
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Humedad (%)',
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Esto es clave para el ajuste
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'DD/MM HH:mm',
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'DD/MM'
                        }
                    },
                    adapters: {
                        date: {
                            locale: 'es'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tiempo'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y1: {
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humedad (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

async function updateReadings() {
    try {
        const tempResponse = forecastAPI.Read_Temp();
        const humidityResponse = forecastAPI.Read_Humity();
        
        if (tempResponse.success) {
            document.getElementById('current-temp').textContent = `${tempResponse.temperature}°C`;
            await saveClimateData({ type: 'temperature', value: tempResponse.temperature });
        }
        
        if (humidityResponse.success) {
            document.getElementById('current-humidity').textContent = `${humidityResponse.humidity}%`;
            await saveClimateData({ type: 'humidity', value: humidityResponse.humidity });
        }
        
        await updateStats();
        await updateChart();
    } catch (error) {
        console.error("Error actualizando lecturas:", error);
    }
}

async function updateStats() {
    const hours = parseInt(document.getElementById('time-range').value);
    const [tempStats, humidityStats] = await Promise.all([
        getClimateStats('temperature', hours),
        getClimateStats('humidity', hours)
    ]);

    // Actualizar UI de temperatura
    document.getElementById('min-temp').textContent = tempStats.min?.toFixed(1) + '°C' || '--°C';
    document.getElementById('max-temp').textContent = tempStats.max?.toFixed(1) + '°C' || '--°C';
    document.getElementById('avg-temp').textContent = tempStats.avg?.toFixed(1) + '°C' || '--°C';

    // Actualizar UI de humedad
    document.getElementById('min-humidity').textContent = humidityStats.min?.toFixed(1) + '%' || '--%';
    document.getElementById('max-humidity').textContent = humidityStats.max?.toFixed(1) + '%' || '--%';
    document.getElementById('avg-humidity').textContent = humidityStats.avg?.toFixed(1) + '%' || '--%';
}

async function updateChart() {
    const hours = parseInt(document.getElementById('time-range').value);
    const [tempStats, humidityStats] = await Promise.all([
        getClimateStats('temperature', hours),
        getClimateStats('humidity', hours)
    ]);

    chart.data.labels = tempStats.timestamps.map(ts => new Date(ts));
    chart.data.datasets[0].data = tempStats.values.map((val, i) => ({
        x: new Date(tempStats.timestamps[i]),
        y: val
    }));
    chart.data.datasets[1].data = humidityStats.values.map((val, i) => ({
        x: new Date(humidityStats.timestamps[i]),
        y: val
    }));
    
    chart.update();
}

async function checkConditionsAndAlert() {
    try {
        const [tempResponse, humidityResponse] = await Promise.all([
            forecastAPI.Read_Temp(),
            forecastAPI.Read_Humity()
        ]);
        
        const config = emailService.alertConfig;
        
        if (tempResponse.temperature < config.tempThreshold.min) {
            await emailService.sendAlert(
                "ALERTA: Temperatura baja",
                `Temperatura actual: ${tempResponse.temperature}°C (Mínima configurada: ${config.tempThreshold.min}°C)`
            );
        } else if (tempResponse.temperature > config.tempThreshold.max) {
            await emailService.sendAlert(
                "ALERTA: Temperatura alta",
                `Temperatura actual: ${tempResponse.temperature}°C (Máxima configurada: ${config.tempThreshold.max}°C)`
            );
        }
        
        if (humidityResponse.humidity < config.humidityThreshold.min) {
            await emailService.sendAlert(
                "ALERTA: Humedad baja",
                `Humedad actual: ${humidityResponse.humidity}% (Mínima configurada: ${config.humidityThreshold.min}%)`
            );
        } else if (humidityResponse.humidity > config.humidityThreshold.max) {
            await emailService.sendAlert(
                "ALERTA: Humedad alta",
                `Humedad actual: ${humidityResponse.humidity}% (Máxima configurada: ${config.humidityThreshold.max}%)`
            );
        }
    } catch (error) {
        console.error("Error verificando alertas:", error);
    }
}

function setupEventListeners() {
    // Control de temperatura
    document.getElementById('temp-up').addEventListener('click', async () => {
        await forecastAPI.Up_Temp(1);
        await updateReadings();
        await checkConditionsAndAlert();
    });

    document.getElementById('temp-down').addEventListener('click', async () => {
        await forecastAPI.Down_Temp(1);
        await updateReadings();
        await checkConditionsAndAlert();
    });

    // Control de humedad
    document.getElementById('humidity-up').addEventListener('click', async () => {
        await forecastAPI.Up_Humity(1);
        await updateReadings();
        await checkConditionsAndAlert();
    });

    document.getElementById('humidity-down').addEventListener('click', async () => {
        await forecastAPI.Down_Humity(1);
        await updateReadings();
        await checkConditionsAndAlert();
    });

    // Controles históricos
    document.getElementById('time-range').addEventListener('change', updateChart);
    document.getElementById('refresh-btn').addEventListener('click', updateReadings);

    // Configuración de alertas
    document.getElementById('save-alerts').addEventListener('click', () => {
        emailService.updateConfig({
            email: document.getElementById('alert-email').value,
            tempThreshold: { 
                min: parseFloat(document.getElementById('min-temp-alert').value),
                max: parseFloat(document.getElementById('max-temp-alert').value)
            },
            humidityThreshold: { 
                min: parseFloat(document.getElementById('min-humidity-alert').value),
                max: parseFloat(document.getElementById('max-humidity-alert').value)
            }
        });
        alert("Configuración guardada correctamente");
    });
}