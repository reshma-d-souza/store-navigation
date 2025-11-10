document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const state = {
        isShopkeeperMode: false,
        products: [],
        selectedProductIds: new Set(),
        path: [],
        isCheckoutModalOpen: false,
        isQrModalOpen: false,
        sortKey: 'name',
        sortDirection: 'asc',
    };

    // --- CONSTANTS & DATA ---
    const MAP_WIDTH = 40;
    const MAP_HEIGHT = 30;
    const GRID_CELL_SIZE = 16;
    const START_POINT = { x: 2, y: 15 };

    const SHOPS = [
        { id: 1, name: 'Fresh Produce', x: 3, y: 3, width: 8, height: 6, entrance: { x: 4, y: 6 }, color: 'bg-green-200 dark:bg-green-800' },
        { id: 2, name: 'Bakery', x: 14, y: 3, width: 6, height: 8, entrance: { x: 3, y: 8 }, color: 'bg-yellow-200 dark:bg-yellow-800' },
        { id: 3, name: 'Dairy & Cheese', x: 23, y: 3, width: 10, height: 5, entrance: { x: 5, y: 5 }, color: 'bg-blue-200 dark:bg-blue-800' },
        { id: 4, name: 'Butcher Shop', x: 3, y: 18, width: 7, height: 7, entrance: { x: 3, y: 0 }, color: 'bg-red-200 dark:bg-red-800' },
        { id: 5, name: 'Frozen Foods', x: 13, y: 18, width: 12, height: 6, entrance: { x: 6, y: 0 }, color: 'bg-cyan-200 dark:bg-cyan-800' },
        { id: 6, name: 'Checkout', x: 30, y: 16, width: 7, height: 10, entrance: { x: 0, y: 5 }, color: 'bg-purple-200 dark:bg-purple-800' },
    ];

    const INITIAL_PRODUCTS = [
        { id: 1, name: 'Organic Apples', price: 3.50, rating: 4.8, shopId: 1, discount: 10 },
        { id: 2, name: 'Avocados', price: 1.75, rating: 4.9, shopId: 1 },
        { id: 3, name: 'Sourdough Bread', price: 5.20, rating: 4.7, shopId: 2 },
        { id: 4, name: 'Croissants', price: 2.50, rating: 4.6, shopId: 2 },
        { id: 5, name: 'Cheddar Cheese', price: 8.00, rating: 4.5, shopId: 3 },
        { id: 6, name: 'Whole Milk (1L)', price: 2.10, rating: 4.4, shopId: 3 },
        { id: 7, name: 'Organic Greek Yogurt', price: 4.50, rating: 4.8, shopId: 3, discount: 15 },
        { id: 8, name: 'Ribeye Steak (lb)', price: 15.99, rating: 5.0, shopId: 4 },
        { id: 9, name: 'Ground Beef (lb)', price: 6.50, rating: 4.3, shopId: 4 },
        { id: 10, name: 'Frozen Pizza', price: 7.99, rating: 4.1, shopId: 5 },
        { id: 11, name: 'Mixed Berries (frozen)', price: 6.25, rating: 4.7, shopId: 5 },
        { id: 12, name: 'Ice Cream Tub', price: 5.50, rating: 4.9, shopId: 5 },
    ];

    // --- DOM Elements ---
    const headerContainer = document.getElementById('header-container');
    const mapContainer = document.getElementById('map-container');
    const itemListContainer = document.getElementById('item-list-container');
    const cartWrapper = document.getElementById('cart-wrapper');
    const cartContainer = document.getElementById('cart-container');
    const modalContainer = document.getElementById('modal-container');

    // --- DIJKSTRA'S ALGORITHM ---
    class PriorityQueue {
        constructor() { this.nodes = []; }
        enqueue(point, priority) { this.nodes.push({ point, priority }); this.sort(); }
        dequeue() { return this.nodes.shift()?.point || null; }
        isEmpty() { return !this.nodes.length; }
        sort() { this.nodes.sort((a, b) => a.priority - b.priority); }
    }

    const dijkstra = (() => {
        const grid = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(1));
        SHOPS.forEach(shop => {
            for (let y = shop.y; y < shop.y + shop.height; y++) {
                for (let x = shop.x; x < shop.x + shop.width; x++) {
                    grid[y][x] = 0;
                }
            }
            grid[shop.y + shop.entrance.y][shop.x + shop.entrance.x] = 1;
        });

        const findPath = (start, end) => {
            const distances = {};
            const previous = {};
            const pq = new PriorityQueue();
            const path = [];
            
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    const key = `${x},${y}`;
                    distances[key] = (x === start.x && y === start.y) ? 0 : Infinity;
                    previous[key] = null;
                }
            }
            pq.enqueue(start, 0);

            while (!pq.isEmpty()) {
                const smallest = pq.dequeue();
                if (!smallest) break;

                if (smallest.x === end.x && smallest.y === end.y) {
                    let currentKey = `${end.x},${end.y}`;
                    while (previous[currentKey]) {
                        const [x, y] = currentKey.split(',').map(Number);
                        path.unshift({ x, y });
                        currentKey = previous[currentKey];
                    }
                    path.unshift(start);
                    break;
                }

                const neighbors = [
                    { x: smallest.x + 1, y: smallest.y }, { x: smallest.x - 1, y: smallest.y },
                    { x: smallest.x, y: smallest.y + 1 }, { x: smallest.x, y: smallest.y - 1 },
                ];

                for (const neighbor of neighbors) {
                    if (neighbor.x >= 0 && neighbor.x < MAP_WIDTH && neighbor.y >= 0 && neighbor.y < MAP_HEIGHT && grid[neighbor.y][neighbor.x] === 1) {
                        const smallestKey = `${smallest.x},${smallest.y}`;
                        const neighborKey = `${neighbor.x},${neighbor.y}`;
                        const candidate = distances[smallestKey] + 1;
                        if (candidate < distances[neighborKey]) {
                            distances[neighborKey] = candidate;
                            previous[neighborKey] = smallestKey;
                            pq.enqueue(neighbor, candidate);
                        }
                    }
                }
            }
            return path;
        };

        return (start, targets) => {
            if (!targets.length) return [];
            let fullPath = [];
            let currentStart = start;
            let remainingTargets = [...targets];

            while (remainingTargets.length > 0) {
                let nearestTarget = null;
                let shortestDist = Infinity;
                for (const target of remainingTargets) {
                    const dist = Math.hypot(target.x + target.entrance.x - currentStart.x, target.y + target.entrance.y - currentStart.y);
                    if (dist < shortestDist) {
                        shortestDist = dist;
                        nearestTarget = target;
                    }
                }
                if (nearestTarget) {
                    const targetPoint = { x: nearestTarget.x + nearestTarget.entrance.x, y: nearestTarget.y + nearestTarget.entrance.y };
                    const segment = findPath(currentStart, targetPoint);
                    if (segment.length > 0) {
                        fullPath = fullPath.concat(segment.slice(1));
                        currentStart = targetPoint;
                    }
                    remainingTargets = remainingTargets.filter(t => t.id !== nearestTarget.id);
                } else { break; }
            }
            if (fullPath.length > 0) fullPath.unshift(start);
            return fullPath;
        };
    })();

    // --- RENDER FUNCTIONS ---
    const renderHeader = () => {
        headerContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 shadow-md">
              <div class="container mx-auto px-4 lg:px-6 py-4 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 13V7m6 10V7m0 0l-6-3m6 3l6-3"></path></svg>
                    <h1 class="text-2xl font-bold text-gray-800 dark:text-white">In-Store Navigator</h1>
                </div>
                <div class="flex items-center space-x-4">
                  <button id="qr-code-btn" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Show QR Code">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6.364 1.636l-.707.707M20 12h-1M18.364 18.364l-.707-.707M12 20v-1m-6.364-1.636l.707-.707M4 12h1m1.636-6.364l.707.707" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h1v1H4V4zm2 0h1v1H6V4zm2 0h1v1H8V4zM4 6h1v1H4V6zm2 0h1v1H6V6zm2 0h1v1H8V6zM4 8h1v1H4V8zm2 0h1v1H6V8zm2 0h1v1H8V8z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" /></svg>
                  </button>
                  <div id="mode-toggle" class="flex items-center cursor-pointer">
                    <span class="mr-3 font-medium ${!state.isShopkeeperMode ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}">Shopper</span>
                    <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" ${state.isShopkeeperMode ? 'checked' : ''} class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                      <label class="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${state.isShopkeeperMode ? 'bg-green-400' : 'bg-gray-300'}"></label>
                    </div>
                    <span class="font-medium ${state.isShopkeeperMode ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}">Shopkeeper</span>
                  </div>
                </div>
              </div>
            </div>`;
    };

    const renderFloorMap = () => {
        const pathData = state.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2} ${p.y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2}`).join(' ');
        
        mapContainer.innerHTML = `
            <svg width="100%" viewBox="0 0 ${MAP_WIDTH * GRID_CELL_SIZE} ${MAP_HEIGHT * GRID_CELL_SIZE}" class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <defs>
                <pattern id="grid" width="${GRID_CELL_SIZE}" height="${GRID_CELL_SIZE}" patternUnits="userSpaceOnUse"><path d="M ${GRID_CELL_SIZE} 0 L 0 0 0 ${GRID_CELL_SIZE}" fill="none" stroke="rgba(229, 231, 235, 0.5)" stroke-width="0.5" /></pattern>
                <pattern id="grid-dark" width="${GRID_CELL_SIZE}" height="${GRID_CELL_SIZE}" patternUnits="userSpaceOnUse"><path d="M ${GRID_CELL_SIZE} 0 L 0 0 0 ${GRID_CELL_SIZE}" fill="none" stroke="rgba(75, 85, 99, 0.5)" stroke-width="0.5" /></pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" class="dark:hidden" /><rect width="100%" height="100%" fill="url(#grid-dark)" class="hidden dark:block" />
              ${SHOPS.map(shop => `
                <g>
                  <rect x="${shop.x * GRID_CELL_SIZE}" y="${shop.y * GRID_CELL_SIZE}" width="${shop.width * GRID_CELL_SIZE}" height="${shop.height * GRID_CELL_SIZE}" class="${shop.color} opacity-70" />
                  <rect x="${(shop.x + shop.entrance.x) * GRID_CELL_SIZE}" y="${(shop.y + shop.entrance.y) * GRID_CELL_SIZE}" width="${GRID_CELL_SIZE}" height="${GRID_CELL_SIZE}" class="fill-white dark:fill-gray-600" />
                  <text x="${(shop.x + shop.width / 2) * GRID_CELL_SIZE}" y="${(shop.y + shop.height / 2) * GRID_CELL_SIZE}" text-anchor="middle" alignment-baseline="central" class="text-xs sm:text-sm font-bold fill-current text-gray-800 dark:text-white pointer-events-none">${shop.name}</text>
                </g>`).join('')}
              ${pathData ? `<path d="${pathData}" fill="none" stroke="rgb(59 130 246)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: dash 1s linear forwards" stroke-dasharray="1000" stroke-dashoffset="1000" />` : ''}
              <g transform="translate(${START_POINT.x * GRID_CELL_SIZE}, ${START_POINT.y * GRID_CELL_SIZE})">
                <circle cx="${GRID_CELL_SIZE/2}" cy="${GRID_CELL_SIZE/2}" r="${GRID_CELL_SIZE*0.75}" class="fill-blue-500 opacity-20" />
                <circle cx="${GRID_CELL_SIZE/2}" cy="${GRID_CELL_SIZE/2}" r="${GRID_CELL_SIZE*0.4}" class="fill-blue-500" />
                <text x="${GRID_CELL_SIZE/2}" y="${GRID_CELL_SIZE/2}" text-anchor="middle" alignment-baseline="central" class="text-xs font-bold fill-white">You</text>
              </g>
            </svg>`;
    };

    const renderItemList = () => {
        const sortedProducts = [...state.products].sort((a, b) => {
            let comparison = 0;
            if (a[state.sortKey] > b[state.sortKey]) comparison = 1;
            else if (a[state.sortKey] < b[state.sortKey]) comparison = -1;
            return state.sortDirection === 'desc' ? comparison * -1 : comparison;
        });

        const sortIcon = (key) => {
            if (state.sortKey !== key) return `<span class="text-gray-400">↕</span>`;
            return state.sortDirection === 'asc' ? `<span>↑</span>` : `<span>↓</span>`;
        };

        const createItemCardHTML = (product) => {
            const isSelected = state.selectedProductIds.has(product.id);
            if (state.isShopkeeperMode) {
                return `
                    <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 grid grid-cols-5 gap-2 items-center text-sm" data-product-id="${product.id}">
                        <span class="col-span-2 font-medium">${product.name}</span>
                        <span class="text-center">$${product.price.toFixed(2)}</span>
                        <span class="text-center">${product.rating.toFixed(1)} ★</span>
                        <button data-action="edit" class="bg-blue-500 text-white rounded px-2 py-1 justify-self-end">Edit</button>
                    </div>`;
            }
            const discountedPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;
            return `
                <div data-action="toggle" data-product-id="${product.id}" class="rounded-lg p-3 grid grid-cols-5 gap-2 items-center cursor-pointer transition-all ${isSelected ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}">
                    <div class="col-span-2 pointer-events-none">
                        <p class="font-medium text-gray-800 dark:text-white">${product.name}</p>
                        ${product.discount ? `<span class="text-xs text-green-600 dark:text-green-400">-${product.discount}%</span>` : ''}
                    </div>
                    <div class="text-center pointer-events-none">
                        <p class="font-semibold ${product.discount ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}">$${discountedPrice.toFixed(2)}</p>
                        ${product.discount ? `<p class="text-xs text-gray-500 line-through">$${product.price.toFixed(2)}</p>` : ''}
                    </div>
                    <div class="text-center text-yellow-500 flex items-center justify-center gap-1 pointer-events-none">
                        <span>${product.rating.toFixed(1)}</span>
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    </div>
                    <div class="flex justify-end pointer-events-none">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} readonly class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </div>
                </div>`;
        };

        itemListContainer.innerHTML = `
            <h2 class="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">${state.isShopkeeperMode ? 'Manage Products' : 'Available Items'}</h2>
            <div class="grid grid-cols-5 gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-4">
                <div class="col-span-2 cursor-pointer" data-sort="name">Product ${sortIcon('name')}</div>
                <div class="text-center cursor-pointer" data-sort="price">Price ${sortIcon('price')}</div>
                <div class="text-center cursor-pointer" data-sort="rating">Rating ${sortIcon('rating')}</div>
                <div class="text-right">${state.isShopkeeperMode ? 'Action' : 'Select'}</div>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
                ${sortedProducts.map(createItemCardHTML).join('')}
            </div>
        `;
    };
    
    const renderCart = () => {
        const selectedProducts = state.products.filter(p => state.selectedProductIds.has(p.id));
        if (selectedProducts.length === 0) {
            cartWrapper.classList.add('hidden');
            return;
        }
        
        cartWrapper.classList.remove('hidden');
        const totalCost = selectedProducts.reduce((sum, p) => sum + (p.discount ? p.price * (1 - p.discount / 100) : p.price), 0);

        cartContainer.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300">Your List</h3>
                <button id="clear-cart-btn" class="text-sm text-gray-500 hover:text-red-500 transition-colors">Clear All</button>
            </div>
            <ul class="space-y-1 mb-4 max-h-40 overflow-y-auto pr-2">
                ${selectedProducts.map(p => `
                    <li class="flex justify-between text-sm">
                        <span>${p.name}</span>
                        <span>$${(p.discount ? p.price * (1 - p.discount / 100) : p.price).toFixed(2)}</span>
                    </li>`).join('')}
            </ul>
            <div class="border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between items-center font-bold">
                <span>Total</span>
                <span>$${totalCost.toFixed(2)}</span>
            </div>
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button id="find-route-btn" class="w-full text-white font-semibold py-2 px-4 rounded-lg transition-colors ${state.path.length > 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}">
                    ${state.path.length > 0 ? 'Route Found!' : 'Find Route'}
                </button>
                <button id="checkout-btn" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Checkout</button>
            </div>`;
    };

    const renderModals = () => {
        const selectedProducts = state.products.filter(p => state.selectedProductIds.has(p.id));
        const totalCost = selectedProducts.reduce((sum, p) => sum + (p.discount ? p.price * (1 - p.discount / 100) : p.price), 0);

        const generateQrCodeSvg = () => {
            const size = 200, boxSize = 10; let path = '';
            for (let i = 0; i < size / boxSize; i++) for (let j = 0; j < size / boxSize; j++) if (Math.random() > 0.5) path += `M${i*boxSize},${j*boxSize}h${boxSize}v${boxSize}h-${boxSize}z `;
            return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
        };

        modalContainer.innerHTML = `
            <div id="checkout-modal" class="modal ${state.isCheckoutModalOpen ? 'is-open' : ''}">
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                <button data-action="close-modal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                <h2 class="text-2xl font-bold text-center mb-2 text-gray-800 dark:text-white">Checkout</h2>
                <p class="text-center text-gray-500 dark:text-gray-400 mb-6">Thank you for shopping with us!</p>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div class="flex justify-between items-center mb-2"><span class="text-gray-600 dark:text-gray-300">Items (${selectedProducts.length})</span><span class="font-medium">$${totalCost.toFixed(2)}</span></div>
                  <div class="flex justify-between items-center text-lg font-bold"><span class="text-gray-800 dark:text-white">Total Amount</span><span class="text-indigo-600 dark:text-indigo-400">$${totalCost.toFixed(2)}</span></div>
                </div>
                <div class="text-center"><h3 class="font-semibold mb-3 text-gray-700 dark:text-gray-300">Payment Method</h3><p class="text-sm text-gray-400 dark:text-gray-500 mt-4">(Payment system is a placeholder)</p></div>
                <button data-action="close-modal" class="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">Confirm Purchase</button>
              </div>
            </div>

            <div id="qr-modal" class="modal ${state.isQrModalOpen ? 'is-open' : ''}">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-8 relative">
                    <button data-action="close-modal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    <h2 class="text-2xl font-bold text-center mb-4 text-gray-800 dark:text-white">Share App Link</h2>
                    <div class="flex justify-center mb-4"><div class="p-2 bg-white rounded-lg">${generateQrCodeSvg()}</div></div>
                    <p class="text-center text-gray-600 dark:text-gray-400 text-sm">Scan this code to open on another device.</p>
                    <input type="text" readonly value="${window.location.href}" class="w-full mt-4 bg-gray-100 dark:bg-gray-700 border rounded-lg p-2 text-center text-xs" onfocus="this.select()" />
                </div>
            </div>
        `;
    };

    const render = () => {
        renderHeader();
        renderFloorMap();
        renderItemList();
        renderCart();
        renderModals();
        document.body.classList.toggle('modal-open', state.isCheckoutModalOpen || state.isQrModalOpen);
    };

    // --- EVENT HANDLERS ---
    const handleToggleMode = () => {
        state.isShopkeeperMode = !state.isShopkeeperMode;
        render();
    };

    const handleSort = (key) => {
        if (state.sortKey === key) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortKey = key;
            state.sortDirection = 'asc';
        }
        renderItemList();
    };

    const handleToggleProduct = (productId) => {
        if (state.selectedProductIds.has(productId)) {
            state.selectedProductIds.delete(productId);
        } else {
            state.selectedProductIds.add(productId);
        }
        state.path = [];
        render();
    };
    
    const handleFindRoute = () => {
        const selectedProducts = state.products.filter(p => state.selectedProductIds.has(p.id));
        const targetShopIds = new Set(selectedProducts.map(p => p.shopId));
        const targetShops = SHOPS.filter(s => targetShopIds.has(s.id));
        state.path = dijkstra(START_POINT, targetShops);
        render();
    };

    const handleClearCart = () => {
        state.selectedProductIds.clear();
        state.path = [];
        render();
    };
    
    const handleModal = (modal, open) => {
        if (modal === 'checkout') state.isCheckoutModalOpen = open;
        if (modal === 'qr') state.isQrModalOpen = open;
        render();
    };

    // --- INITIALIZATION ---
    const setupEventListeners = () => {
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action], [data-sort], #mode-toggle, #qr-code-btn, #find-route-btn, #clear-cart-btn, #checkout-btn');
            if (!target) return;

            // Header buttons
            if (target.id === 'mode-toggle') handleToggleMode();
            if (target.id === 'qr-code-btn') handleModal('qr', true);

            // Item list
            const sortKey = target.dataset.sort;
            if (sortKey) handleSort(sortKey);

            const itemAction = target.dataset.action;
            const productId = parseInt(target.closest('[data-product-id]')?.dataset.productId, 10);
            if (itemAction === 'toggle' && productId) handleToggleProduct(productId);
            // Add edit/save logic for shopkeeper mode here if needed

            // Cart buttons
            if (target.id === 'find-route-btn') handleFindRoute();
            if (target.id === 'clear-cart-btn') handleClearCart();
            if (target.id === 'checkout-btn') handleModal('checkout', true);
            
            // Modals
            if (itemAction === 'close-modal' || target.classList.contains('modal')) {
                handleModal('checkout', false);
                handleModal('qr', false);
            }
        });
    };

    const init = () => {
        state.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
        setupEventListeners();
        render();
    };

    init();
});
