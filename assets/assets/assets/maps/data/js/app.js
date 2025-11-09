let items = [];

fetch("data/items.json")
  .then(response => response.json())
  .then(data => {
    items = data;
    displayItems(items);
  });

function displayItems(list) {
  const ul = document.getElementById("item-list");
  ul.innerHTML = "";
  list.forEach(item => {
    let li = document.createElement("li");
    li.innerHTML = `${item.name} - ₹${item.price} (-${item.discount}%) 
    <button onclick="navigate('${item.location}')">Show Route</button>`;
    ul.appendChild(li);
  });
}

function searchItem() {
  let text = document.getElementById("search").value.toLowerCase();
  let filtered = items.filter(i => i.name.toLowerCase().includes(text));
  displayItems(filtered);
}

function sortItems(type) {
  let sorted = [...items].sort((a, b) => type === "asc" ? a.price - b.price : b.price - a.price);
  displayItems(sorted);
}

function navigate(floor) {
  document.getElementById("map").src = `assets/maps/${floor.toLowerCase().replace(" ", "")}.png`;
}

