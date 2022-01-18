var gastable;
var addgasfield;

function onLoad() {
    gastable = document.getElementById("gastable");
    addgasfield = document.getElementById("addgasfield");
}

function addToGastable() {
    gastable.insertAdjacentHTML('beforeend', `<tr id="gastable-` + addgasfield.value + `">
    <td>` + addgasfield.value + `</td>
    <td><input type="number" min="0" value="0" id="gastablemol-` + addgasfield.value + `"></input></td>
    <td><input type="submit" value="Remove" onclick="removeFromGastable('` + addgasfield.value + `');"></input></td></tr>`)
}

function removeFromGastable(name) {
    document.getElementById("gastable-" + name).outerHTML = "";
}