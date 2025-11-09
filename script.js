function showFloor(floor) {
  const maps = {
    floor1: "Floor 1: Entrance, Store Office, Billing Counter",
    floor2: "Floor 2: Grocery, Clothing",
    floor3: "Floor 3: Electronics, Movies",
    floor4: "Floor 4: Gaming Zone, Washroom, Exit"
  };

  const mapDisplay = document.getElementById("mapDisplay");
  mapDisplay.classList.remove("slide"); // reset animation
  void mapDisplay.offsetWidth; // restart animation trick
  mapDisplay.innerHTML = maps[floor];
  mapDisplay.classList.add("slide"); // trigger animation
}
