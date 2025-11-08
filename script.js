function showFloor(floor) {
  const maps = {
    floor1: "Floor 1: Entrance, Store Office, Billing Counter",
    floor2: "Floor 2: Grocery, Clothing",
    floor3: "Floor 3: Electronics, Movies",
    floor4: "Floor 4: Gaming Zone, Washroom, Exit"
  };

  document.getElementById("mapDisplay").innerHTML = maps[floor];
}
