let libraryItems = JSON.parse(localStorage.getItem("libraryItems") || "[]");

function saveLibraryItems() { localStorage.setItem("libraryItems", JSON.stringify(libraryItems)); updateDashboardStats(); }

function renderLibrary() {
    const grid = document.getElementById("libraryItemsGrid");
    const search = document.getElementById("library-search");
    const filter = document.getElementById("library-category-filter");
    if (!grid) return;
    const term = (search?.value || "").toLowerCase();
    const cat = filter?.value || "all";
    const filtered = libraryItems.filter(item => {
        const matchSearch = item.title.toLowerCase().includes(term) || item.url.toLowerCase().includes(term) || (item.tags || "").toLowerCase().includes(term);
        const matchCat = cat === "all" || item.category === cat;
        return matchSearch && matchCat;
    });
    if (!filtered.length) {
        renderEmptyState(grid, 'No library items found. Add your first resource!', '📚');
        return;
    }
    grid.innerHTML = filtered.map(item => `
        <div class="library-item-card">
            <div class="lib-title">${item.title}</div>
            <a href="${item.url}" target="_blank" class="lib-url">${item.url}</a>
            ${item.tags ? `<div class="lib-tags">${item.tags.split(",").map(t => `<span class="lib-tag">${t.trim()}</span>`).join("")}</div>` : ''}
            <div class="lib-footer">
                <span class="lib-cat ${item.category}">${item.category}</span>
                <button class="lib-delete" onclick="deleteLibraryItem('${item.id}')">✕</button>
            </div>
        </div>
    `).join("");
}

function addLibraryItem() {
    const title = document.getElementById("library-title");
    const url = document.getElementById("library-url");
    const category = document.getElementById("library-category");
    const tags = document.getElementById("library-tags");
    if (!title?.value?.trim() || !url?.value?.trim()) return;
    libraryItems.push({ id: `lib_${Date.now()}`, title: title.value.trim(), url: url.value.trim(), category: category.value, tags: tags?.value?.trim() || "", createdAt: new Date().toISOString() });
    title.value = "";
    url.value = "";
    if (tags) tags.value = "";
    saveLibraryItems();
    renderLibrary();
}

function deleteLibraryItem(id) {
    libraryItems = libraryItems.filter(item => item.id !== id);
    saveLibraryItems();
    renderLibrary();
}
