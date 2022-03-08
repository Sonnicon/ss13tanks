const gastable = document.getElementById("gastable");
const addgasfield = document.getElementById("addgasfield");
const tempfield = document.getElementById("tempfield");
const volumefield = document.getElementById("volumefield");
const gastablechart = document.getElementById("gastablechart");
var gastablechartChart;

function onLoad() {
    gastablechartChart = new Chart(gastablechart, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                label: 'Gas mix',
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: "right",
                    align: "start"
                }
            }

        }
    });
}

function addToGastable() {
    var selected = addgasfield.value.toLowerCase();
    addgasfield.value = "Choose gas";
    var gas;

    if (selected == "custom") {
        selected = prompt("Enter name.");
        if (selected == null) {
            return;
        } else if (selected in GASSES) {
            alert("A gas with this name already exists.");
            return;
        }
        var hcapacity = parseInt(prompt("Enter heat capacity."));
        if (isNaN(hcapacity)) {
            alert("Not a valid number.");
            return;
        }
        gas = new Gas(selected, hcapacity, '#'+Math.random().toString(16).slice(-6))
    } else {
        gas = GASSES[selected];
    }

    if (document.getElementById("gastablemol-" + selected) == null) {
        gastable.insertAdjacentHTML('beforeend', `<tr id="gastable-` + selected + `">
        <td>` + selected + `</td>
        <td><input type="number" min="0" value="0" id="gastablemol-` + selected + `" onchange="editGastable('` + selected + `')"></input></td>
        <td><input type="submit" value="Remove" onclick="removeFromGastable('` + selected + `');"></input></td></tr>`);
    } else {
        alert("Gas already added to list.");
    }

    gastablechartChart.data.labels.push(selected);
    var dataset = gastablechartChart.data.datasets[0];
    dataset.data.push(0)
    dataset.backgroundColor.push(gas.color)
    gastablechartChart.update();
}

function editGastable(name) {
    var index = gastablechartChart.data.labels.indexOf(name);
    gastablechartChart.data.datasets[0].data[index] = document.getElementById("gastablemol-" + name).value;
    gastablechartChart.update();
}

function removeFromGastable(name) {
    document.getElementById("gastable-" + name).outerHTML = "";
    if (!GASSES[name].stopDelete) {
        delete GASSES[name];
    }
    var index = gastablechartChart.data.labels.indexOf(name);
    var dataset = gastablechartChart.data.datasets[0];
    gastablechartChart.data.labels.splice(index, 1);
    dataset.data.splice(index, 1)
    dataset.backgroundColor.splice(index, 1)
    gastablechartChart.update()
}

function getGastable() {
    var result = {};
    for (const [key, value] of Object.entries(GASSES)) {
        result[value.name] = 0;
    }
    for (let i = 1; i < gastable.rows.length; i++) {
        var cells = gastable.rows[i].cells;
        result[cells[0].innerText.toLowerCase()] = +cells[1].children[0].value;
    }
    return result;
}

Number.prototype.toFixedNumber = function(digits, base) {
    var pow = Math.pow(base || 10, digits);
    return Math.round(this * pow) / pow;
}

// Simulation stuff

const TPS = 0.5;
const DYN_EX_SCALE = 0.5;
const MOLAR_ACCURACY = 4;

const MAX_INTEGRITY = 500;
const INTEGRITY_FAILURE = 0.5;

const TANK_MELT_TEMPERATURE = 1000000;
const TANK_LEAK_PRESSURE = 3039.75;
const TANK_RUPTURE_PRESSURE = 3546.375;
const TANK_FRAGMENT_PRESSURE = 4053;
const TANK_FRAGMENT_SCALE = 8511.3;

const PLASMA_OXYGEN_FULLBURN = 10;
const OXYGEN_BURN_RATE_BASE = 1.4;
const PLASMA_MINIMUM_BURN_TEMPERATURE = 373.15;
const FIRE_MINIMUM_TEMPERATURE_TO_EXIST = 373.15;
const PLASMA_UPPER_TEMPERATURE = 1643.15;
const SUPER_SATURATION_THRESHOLD = 96;
const PLASMA_BURN_RATE_DELTA = 9;
const MINIMUM_HEAT_CAPACITY = 0.0003;
const FIRE_PLASMA_ENERGY_RELEASED = 3000000;
const MINIMUM_MOLE_COUNT = 0.01;
const TRITIUM_BURN_OXY_FACTOR = 100;
const TRITIUM_BURN_TRIT_FACTOR = 10;
const MINIMUM_TRIT_OXYBURN_ENERGY = 2000000;
const HYDROGEN_BURN_OXY_FACTOR = 100;
const HYDROGEN_BURN_H2_FACTOR = 10;
const MINIMUM_H2_OXYBURN_ENERGY = 2000000;
const FIRE_HYDROGEN_ENERGY_RELEASED = 2800000;
const FIRE_HYDROGEN_ENERGY_WEAK = 280000;

function testGas() {
    var gasmix = getGastable(), volume = volumefield.value;
    var temp = +tempfield.value;
    var time = 0, integrity = MAX_INTEGRITY, leaking = false;

    document.getElementById("temporary").innerHTML = `${time}s: Beginning test.<br>`;

    while (true) {
        var active = false;

        [active, gasmix, temp] = gasReact(gasmix, temp);

        var pressure = getPressure(gasmix, temp, volume);

        var [a, i] = handleTolerances(pressure, temp, integrity);
        active |= a;
        if (a) {
            integrity = i;

            if (!leaking && integrity <= INTEGRITY_FAILURE * MAX_INTEGRITY) {
                leaking = true;
                document.getElementById("temporary").innerHTML += `${time}s: Started leaking.<br>`;
            }

            if (integrity <= 0) {
                if (pressure > TANK_FRAGMENT_PRESSURE) {
                    [ignored, gasmix, temp] = gasReact(gasmix, temp);
                    pressure = getPressure(gasmix, temp, volume);
                    var power = volume * (pressure - TANK_FRAGMENT_PRESSURE) / TANK_FRAGMENT_SCALE;
                    var range = Math.round((2 * power) ** DYN_EX_SCALE);
                    //todo output
                    document.getElementById("temporary").innerHTML += `${time}s: Exploded with ${Math.round(range * 0.25)}, ${Math.round(range * 0.5)}, ${Math.round(range)}.<br>`;
                } else {
                    // todo output
                    document.getElementById("temporary").innerHTML += `${time}s: Tank broke.<br>`;
                }
                return;
            }
        }


        active |= leaking;

        if (!active || getTotalMoles(gasmix) < MOLAR_ACCURACY) {
            // todo output
            document.getElementById("temporary").innerHTML += `${time}s: Finished.<br>`;
            return;
        }

        if (leaking) {
            for (const [key, value] of Object.entries(gasmix)) {
                gasmix[key] = value * 0.75;
            }
        }

        time += 1 / TPS;
    }
}

function gasReact(gasmix, temperature){
    var active = false;

    // trit burn
    if (gasmix["oxygen"] >= MINIMUM_MOLE_COUNT && gasmix["tritium"] >= MINIMUM_MOLE_COUNT && temperature > FIRE_MINIMUM_TEMPERATURE_TO_EXIST) {
        var energyReleased = 0, burnedFuel = 0, oldHeatCapacity = getHeatCapacity(gasmix);

        if (gasmix["oxygen"] < gasmix["tritium"] || MINIMUM_TRIT_OXYBURN_ENERGY > temperature * oldHeatCapacity) {
            burnedFuel = gasmix["oxygen"] / TRITIUM_BURN_OXY_FACTOR;
            gasmix["tritium"] -= burnedFuel;
            gasmix["water_vapor"] += burnedFuel / TRITIUM_BURN_OXY_FACTOR;

            energyReleased += FIRE_HYDROGEN_ENERGY_WEAK * burnedFuel;
        } else {
            burnedFuel = gasmix["tritium"];

            gasmix["tritium"] -= burnedFuel / TRITIUM_BURN_TRIT_FACTOR;
            gasmix["oxygen"] -= burnedFuel;

            gasmix["water_vapor"] += burnedFuel / TRITIUM_BURN_TRIT_FACTOR;

            energyReleased += FIRE_HYDROGEN_ENERGY_RELEASED * burnedFuel;
        }

        if(energyReleased > 0) {
            var newHeatCapacity = getHeatCapacity(gasmix);
            if (newHeatCapacity > MINIMUM_HEAT_CAPACITY) {
                temperature = (temperature * oldHeatCapacity + energyReleased) / newHeatCapacity;
            }
        }
        active = true;
    }



    // plasmafire
    if (gasmix["oxygen"] >= MINIMUM_MOLE_COUNT && gasmix["plasma"] >= MINIMUM_MOLE_COUNT && temperature > FIRE_MINIMUM_TEMPERATURE_TO_EXIST) {
        var energyReleased = 0, plasmaBurnRate = 0, oxygenBurnRate = 0, temperatureScale = 0, oldHeatCapacity = getHeatCapacity(gasmix);
        temperatureScale = temperature > PLASMA_UPPER_TEMPERATURE ? 1 : (temperature - PLASMA_MINIMUM_BURN_TEMPERATURE) / (PLASMA_UPPER_TEMPERATURE-PLASMA_MINIMUM_BURN_TEMPERATURE);
        if (temperatureScale > 0) {
            oxygenBurnRate = OXYGEN_BURN_RATE_BASE - temperatureScale;
            var superSaturation = gasmix["oxygen"] / gasmix["plasma"] > SUPER_SATURATION_THRESHOLD;
            if (gasmix["oxygen"] > gasmix["plasma"] * PLASMA_OXYGEN_FULLBURN) {
                plasmaBurnRate = (gasmix["plasma"] * temperatureScale) / PLASMA_BURN_RATE_DELTA;
            } else {
                plasmaBurnRate = (temperatureScale * (gasmix["oxygen"] / PLASMA_OXYGEN_FULLBURN)) / PLASMA_BURN_RATE_DELTA;
            }

            if (plasmaBurnRate > MINIMUM_HEAT_CAPACITY) {
                plasmaBurnRate = Math.min(plasmaBurnRate, gasmix["plasma"], gasmix["oxygen"] / oxygenBurnRate);
                gasmix["plasma"] = (gasmix["plasma"] - plasmaBurnRate).toFixedNumber(MOLAR_ACCURACY);
                gasmix["oxygen"] = (gasmix["oxygen"] - (plasmaBurnRate * oxygenBurnRate)).toFixedNumber(MOLAR_ACCURACY);

                if (superSaturation) {
                    gasmix["tritium"] += plasmaBurnRate;
                } else {
                    gasmix["carbon_dioxide"] += plasmaBurnRate * 0.75;
                    gasmix["water_vapor"] += plasmaBurnRate * 0.25;
                }
                energyReleased += FIRE_PLASMA_ENERGY_RELEASED * plasmaBurnRate;
                active = true;
            }
        }
        if (energyReleased > 0) {
            var newHeatCapacity = getHeatCapacity(gasmix);
            if(newHeatCapacity > MINIMUM_HEAT_CAPACITY) {
                temperature = (temperature * oldHeatCapacity + energyReleased) / newHeatCapacity;
            }
        }
    }

    // h2fire
    if (gasmix["oxygen"] >= MINIMUM_MOLE_COUNT && gasmix["hydrogen"] >= MINIMUM_MOLE_COUNT && temperature > FIRE_MINIMUM_TEMPERATURE_TO_EXIST) {
        var energyReleased = 0, burnedFuel = 0, oldHeatCapacity = getHeatCapacity(gasmix);
        if (gasmix["oxygen"] < gasmix["hydrogen"] || MINIMUM_H2_OXYBURN_ENERGY > temperature * oldHeatCapacity) {
            burnedFuel = gasmix["oxygen"] / HYDROGEN_BURN_OXY_FACTOR;
            gasmix["hydrogen"] -= burnedFuel;
            gasmix["water_vapor"] += burnedFuel / HYDROGEN_BURN_OXY_FACTOR;
            energyReleased += FIRE_HYDROGEN_ENERGY_WEAK * burnedFuel;
        } else {
            burnedFuel = gasmix["hydrogen"];
            gasmix["hydrogen"] -= burnedFuel / HYDROGEN_BURN_H2_FACTOR;
            gasmix["oxygen"] -= burnedFuel;
            gasmix["water_vapor"] += burnedFuel / HYDROGEN_BURN_H2_FACTOR;
            energyReleased += FIRE_HYDROGEN_ENERGY_RELEASED * burnedFuel;
        }

        if (energyReleased > 0) {
            var newHeatCapacity = getHeatCapacity(gasmix);
            if (newHeatCapacity > MINIMUM_HEAT_CAPACITY) {
                temperature = (temperature*oldHeatCapacity + energyReleased) / newHeatCapacity;
            }
        }
        active = true;
    }
    return [active, gasmix, temperature];
}

function getPressure(gasmix, temp, volume) {
    return getTotalMoles(gasmix) * 8.31 * temp / volume;
}

function getTotalMoles(gasmix) {
    return Object.values(gasmix).reduce((a, c) => a + c);
}

function getHeatCapacity(gasmix) {
    var sum = 0;
    for (const [key, value] of Object.entries(gasmix)) {
        sum += GASSES[key].heatCapacity * value;
    }
    return sum;
}

function handleTolerances(pressure, temp, integrity) {
    var ratio;
    if (temp >= TANK_MELT_TEMPERATURE) {
        ratio = (temp - TANK_MELT_TEMPERATURE) / temp;
    }else if(pressure >= TANK_LEAK_PRESSURE) {
        ratio = (pressure - TANK_LEAK_PRESSURE) / (TANK_RUPTURE_PRESSURE - TANK_LEAK_PRESSURE)
    }
    return [ratio != null, integrity -= MAX_INTEGRITY * ratio / TPS];
}