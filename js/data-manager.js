window.DataManager = {
    // FIX: antes decía 'VolleyData' (con mayúscula), una llave distinta a
    // 'volleyData' que usa el resto de la app (AppDB, todos los módulos
    // admin/delegado). Esto hacía que programar-partido.html leyera/guardara
    // en una base de datos completamente separada e invisible para el resto
    // del sistema. Ahora usa la misma llave que todos.
    KEY: 'volleyData',
    getAppData: () => {
        const local = localStorage.getItem(window.DataManager.KEY);
        if (local) {
            return JSON.parse(local);
        }
        return window.VolleyAppData;
    },
    save: (data) => {
        localStorage.setItem(window.DataManager.KEY, JSON.stringify(data));
    }
};
window.getAppData = window.DataManager.getAppData;

// Mantenemos la compatibilidad
window.getAppData = window.DataManager.getAppData;
// Prueba de carga
console.log("DataManager cargado y listo. Buscando clave:", window.DataManager.KEY);
window.testSave = () => {
    localStorage.setItem(window.DataManager.KEY, JSON.stringify({test: "funciona"}));
    console.log("Prueba de guardado ejecutada.");
};