window.DataManager = {
    KEY: 'volleyData',
    getAppData: () => {
        const local = localStorage.getItem(window.DataManager.KEY);
        if (local) return JSON.parse(local);
        return window.VolleyAppData;
    },
    save: (data) => {
        localStorage.setItem(window.DataManager.KEY, JSON.stringify(data));
    }
};

// Alias global para compatibilidad con módulos que llaman getAppData() directamente
window.getAppData = window.DataManager.getAppData;
