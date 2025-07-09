class MSForecast {
    constructor() {
        this.currentTemp = 22;
        this.currentHumidity = 45;
    }
    
    Up_Temp(x) {
        this.currentTemp += x;
        return { success: true, newTemp: this.currentTemp };
    }
    
    Down_Temp(x) {
        this.currentTemp -= x;
        return { success: true, newTemp: this.currentTemp };
    }
    
    Up_Humity(x) {
        this.currentHumidity += x;
        return { success: true, newHumidity: this.currentHumidity };
    }
    
    Down_Humity(x) {
        this.currentHumidity -= x;
        return { success: true, newHumidity: this.currentHumidity };
    }
    
    Read_Temp() {
        const variation = (Math.random() * 0.4) - 0.2;
        this.currentTemp += variation;
        return { 
            success: true, 
            temperature: parseFloat(this.currentTemp.toFixed(1)) 
        };
    }
    
    Read_Humity() {
        const variation = (Math.random() * 1) - 0.5;
        this.currentHumidity += variation;
        this.currentHumidity = Math.max(0, Math.min(100, this.currentHumidity));
        return { 
            success: true, 
            humidity: parseFloat(this.currentHumidity.toFixed(1)) 
        };
    }
}

export default MSForecast;