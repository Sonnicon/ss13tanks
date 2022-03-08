class Gas {
    name;
    heatCapacity;
    color;
    stopDelete;

    constructor(name, heatCapacity, color, stopDelete = false) {
        this.name = name;
        this.heatCapacity = heatCapacity;
        this.color = color;
        this.stopDelete = stopDelete;
        GASSES[name] = this;
    }
}

const GASSES = {}

new Gas("oxygen", 20, "#2786e5", true);
new Gas("plasma", 200, "#f62800", true);
new Gas("tritium", 10, "#3fcd40", true);
new Gas("hydrogen", 15, "#bdc2c0", true);
new Gas("carbon_dioxide", 30, "#4e4c48", true);
new Gas("water_vapor", 40, "#4c4e4d", true);