// graph.js - Knowledge Graph renderer

function renderKnowledgeGraph() {
    const container = document.getElementById('graphContainer');
    if (!container) return;

    // If cytoscape isn't loaded, wait a moment and try again
    if (typeof cytoscape === 'undefined') {
        console.warn('Cytoscape not loaded yet, retrying...');
        setTimeout(renderKnowledgeGraph, 500);
        return;
    }

    // 1. Build Nodes (Folders and Pages)
    const nodes = [];
    const edges = [];

    // Add Folders as nodes
    hubState.folders.forEach(folder => {
        nodes.push({
            data: {
                id: folder.id,
                label: folder.title,
                type: 'folder'
            }
        });
    });

    // Add Pages as nodes, and Folder->Page edges
    hubState.folders.forEach(folder => {
        folder.pageIds.forEach(pageId => {
            const page = hubState.pages[pageId];
            if (!page) return;

            nodes.push({
                data: {
                    id: pageId,
                    label: page.title,
                    type: 'page'
                }
            });

            edges.push({
                data: {
                    id: `edge-${folder.id}-${pageId}`,
                    source: folder.id,
                    target: pageId
                }
            });
        });
    });

    // Add Backlink Edges (scan for [[Page Title]] patterns)
    const backlinkEdges = new Set(); // Avoid duplicate edges

    hubState.folders.forEach(folder => {
        folder.pageIds.forEach(sourcePageId => {
            const sourcePage = hubState.pages[sourcePageId];
            if (!sourcePage) return;

            // Scan all blocks in this page for [[...]] references
            sourcePage.blocks.forEach(block => {
                if (!block.content) return;

                // Find all [[...]] patterns
                const linkPattern = /\[\[(.*?)\]\]/g;
                let match;

                while ((match = linkPattern.exec(block.content)) !== null) {
                    const referencedTitle = match[1].trim();

                    // Find the page with this title
                    let targetPageId = null;
                    hubState.folders.forEach(f => {
                        f.pageIds.forEach(pid => {
                            const p = hubState.pages[pid];
                            if (p && p.title.toLowerCase() === referencedTitle.toLowerCase()) {
                                targetPageId = pid;
                            }
                        });
                    });

                    // If we found a matching page, create a backlink edge
                    if (targetPageId && targetPageId !== sourcePageId) {
                        const edgeId = `backlink-${sourcePageId}-${targetPageId}`;
                        if (!backlinkEdges.has(edgeId)) {
                            backlinkEdges.add(edgeId);
                            edges.push({
                                data: {
                                    id: edgeId,
                                    source: sourcePageId,
                                    target: targetPageId,
                                    type: 'backlink'
                                }
                            });
                        }
                    }
                }
            });
        });
    });

    // If there are no pages yet, show a message
    if (nodes.length === 0) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:1.1rem;">Create some folders and pages in the Lessons view to see your graph!</div>`;
        return;
    }

    // 2. Initialize the Graph
    const cy = cytoscape({
        container: container,
        elements: { nodes, edges },
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'background-color': 'data(type) === "folder" ? "#7c6df0" : "#38bdf8"',
                    'color': '#ffffff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '12px',
                    'font-weight': '600',
                    'width': 'data(type) === "folder" ? 50 : 40',
                    'height': 'data(type) === "folder" ? 50 : 40',
                    'border-width': 2,
                    'border-color': 'rgba(255,255,255,0.2)',
                    'shadow-blur': 10,
                    'shadow-color': 'rgba(0,0,0,0.3)'
                }
            },
            {
                selector: 'node[type="folder"]',
                style: {
                    'shape': 'rectangle',
                    'background-color': '#7c6df0'
                }
            },
            {
                selector: 'node[type="page"]',
                style: {
                    'shape': 'ellipse',
                    'background-color': '#38bdf8'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#64748b',
                    'curve-style': 'bezier',
                    'target-arrow-color': '#64748b',
                    'target-arrow-shape': 'triangle',
                    'opacity': 0.7
                }
            },
            {
                selector: 'edge[type="backlink"]',
                style: {
                    'width': 2,
                    'line-color': '#a855f7',
                    'curve-style': 'bezier',
                    'target-arrow-color': '#a855f7',
                    'target-arrow-shape': 'triangle',
                    'opacity': 0.6,
                    'line-style': 'dashed'
                }
            }
        ],
        layout: {
            name: 'cose',
            idealEdgeLength: 120,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 30,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 450000,
            edgeElasticity: 100,
            nestingFactor: 0.1,
            gravity: 0.25,
            numIter: 1000,
            tile: true
        }
    });

    // 3. Click on a Node -> Open the Page
    cy.on('tap', 'node', function(evt) {
        const nodeId = evt.target.id();
        const page = hubState.pages[nodeId];

        if (page) {
            // It's a page! Switch to the Lessons view and open it
            hubState.activePageId = nodeId;
            refreshWorkspace();        // Updates the lessons editor
            switchView('lessons-view'); // Jumps to the view
        } else {
            // It's a folder - show a toast with the name
            const label = evt.target.data('label');
            showToast(`📁 Folder: ${label}`, 'info');
        }
    });

    // 4. Handle window resize so the graph fits perfectly
    const resizeHandler = () => {
        if (cy) cy.fit();
    };
    window.removeEventListener('resize', resizeHandler); // avoid duplicates
    window.addEventListener('resize', resizeHandler);

    // Store the cytoscape instance on the container for cleanup if needed
    container._cy = cy;
}
