class EmailService {
    constructor() {
        this.sentEmails = [];
        this.alertConfig = {
            email: 'admin@datacenter.com',
            tempThreshold: { min: 18, max: 25 },
            humidityThreshold: { min: 40, max: 60 }
        };
    }

    async sendAlert(subject, message) {
        console.log('=== ALERTA ENVIADA ===');
        console.log(`Para: ${this.alertConfig.email}`);
        console.log(`Asunto: ${subject}`);
        console.log(`Mensaje: ${message}`);
        console.log('======================');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const emailRecord = {
            to: this.alertConfig.email,
            subject,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.sentEmails.push(emailRecord);
        return { success: true, id: Date.now() };
    }

    updateConfig(newConfig) {
        this.alertConfig = { ...this.alertConfig, ...newConfig };
        console.log('Configuración actualizada:', this.alertConfig);
        return { success: true };
    }

    getSentEmails() {
        return this.sentEmails;
    }
}

export default EmailService;