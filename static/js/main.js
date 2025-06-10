class SubHunterPro {
    constructor() {
        this.isScanning = false;
        this.currentResults = [];
        this.filteredResults = [];
        this.scanStartTime = null;
        this.currentSort = 'subdomain';
        this.totalDomains = 0;
        this.scannedDomains = 0;
        this.foundDomains = 0;
        this.vantaEffect = null;
        
        this.initializeVanta();
        this.bindEvents();
    }

    initializeVanta() {
        try {
            this.vantaEffect = VANTA.DOTS({
                el: "#vanta-bg",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 0.8,
                color: 0x00ffff,
                color2: 0xff00ff,
                backgroundColor: 0x0a0a0a,
                size: 3.0,
                spacing: 25.0,
                showLines: true
            });
        } catch (error) {
            console.warn('Vanta.js failed to initialize:', error);
        }
    }

    bindEvents() {
        const scanBtn = document.getElementById('scan-btn');
        const domainInput = document.getElementById('domain-input');
        const exportBtn = document.getElementById('export-btn');
        const filterBtn = document.getElementById('filter-btn');
        const sortBtn = document.getElementById('sort-btn');
        const searchFilter = document.getElementById('search-filter');
        const statusFilter = document.getElementById('status-filter');

        scanBtn.addEventListener('click', () => this.startAdvancedScan());
        domainInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startAdvancedScan();
        });
        
        // Export button event handler
        exportBtn.addEventListener('click', () => this.exportResults());
        
        // Filter and sort handlers
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.toggleFilters());
        }
        if (sortBtn) {
            sortBtn.addEventListener('click', () => this.sortResults());
        }
        if (searchFilter) {
            searchFilter.addEventListener('input', () => this.applyFilters());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        domainInput.focus();
    }

    async startAdvancedScan() {
        if (this.isScanning) return;

        const domain = document.getElementById('domain-input').value.trim();
        const threads = document.getElementById('threads').value;
        const timeout = document.getElementById('timeout').value;

        if (!domain) {
            this.showNotification('Please enter a domain', 'error');
            return;
        }

        this.isScanning = true;
        this.updateScanButton(true);
        this.showStatsSection();
        this.showProgressSection();

        try {
            const response = await fetch('/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    domain: domain,
                    threads: parseInt(threads),
                    timeout: parseInt(timeout)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.handleScanComplete(data);

        } catch (error) {
            console.error('Scan error:', error);
            this.showNotification('Scan failed. Please try again.', 'error');
        } finally {
            this.isScanning = false;
            this.updateScanButton(false);
            this.hideProgressSection();
        }
    }


    handleStreamingUpdate(data) {
        if (data.type === 'progress') {
            this.updateProgress(data);
        } else if (data.type === 'result') {
            this.addLiveResult(data);
        } else if (data.type === 'complete') {
            this.handleScanComplete(data);
        }
    }

    updateProgress(data) {
        this.scannedDomains = data.scanned || 0;
        this.totalDomains = data.total || 0;
        this.foundDomains = data.found || 0;

        const progress = this.totalDomains > 0 ? (this.scannedDomains / this.totalDomains) * 100 : 0;
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-percentage').textContent = `${Math.floor(progress)}%`;
        document.getElementById('domains-remaining').textContent = `${this.totalDomains - this.scannedDomains} remaining`;
        document.getElementById('scanned-count').textContent = this.scannedDomains.toLocaleString();
        document.getElementById('found-count').textContent = this.foundDomains.toLocaleString();
    }

    addLiveResult(result) {
        const liveResults = document.getElementById('live-results');
        const resultItem = document.createElement('div');
        resultItem.className = 'live-result-item';
        resultItem.innerHTML = `
            <span style="color: #00ff00">[FOUND]</span> 
            <span style="color: #00ffff">${result.subdomain}</span> 
            <span style="color: #ffff00">[${result.status_code}]</span>
        `;
        
        liveResults.insertBefore(resultItem, liveResults.firstChild);
        
        while (liveResults.children.length > 10) {
            liveResults.removeChild(liveResults.lastChild);
        }
    }

    handleScanComplete(data) {
        this.currentResults = data.subdomains || [];
        this.filteredResults = [...this.currentResults];

        document.getElementById('wordlist-count').textContent = data.wordlist_size?.toLocaleString() || '0';
        document.getElementById('scanned-count').textContent = data.total_checked?.toLocaleString() || '0';
        document.getElementById('found-count').textContent = data.found_count?.toLocaleString() || '0';
        
        const successRate = data.total_checked > 0 ? 
            ((data.found_count / data.total_checked) * 100).toFixed(2) : 0;
        document.getElementById('success-rate').textContent = `${successRate}%`;

        this.displayResults(data);
        this.showResultsSection();

        if (data.found_count > 0) {
            this.showNotification(`🎉 SubHunter found ${data.found_count} active subdomains!`, 'success');
        } else {
            this.showNotification('No active subdomains found', 'info');
        }
    }

    updateScanButton(scanning) {
        const scanBtn = document.getElementById('scan-btn');
        const btnText = scanBtn.querySelector('.btn-text');
        const btnLoader = scanBtn.querySelector('.btn-loader');
        const btnIcon = scanBtn.querySelector('.btn-icon');

        if (scanning) {
            btnText.textContent = 'Hunting...';
            btnLoader.style.display = 'inline-block';
            btnIcon.className = 'fas fa-spinner fa-spin btn-icon';
            scanBtn.disabled = true;
        } else {
            btnText.textContent = 'Start Hunt';
            btnLoader.style.display = 'none';
            btnIcon.className = 'fas fa-search btn-icon';
            scanBtn.disabled = false;
        }
    }

    showStatsSection() {
        document.getElementById('stats-section').style.display = 'grid';
    }

    showProgressSection() {
        document.getElementById('progress-section').style.display = 'block';
    }

    hideProgressSection() {
        document.getElementById('progress-section').style.display = 'none';
    }

    showResultsSection() {
        document.getElementById('results-section').style.display = 'block';
    }

    hideResultsSection() {
        document.getElementById('results-section').style.display = 'none';
    }

    clearLiveFeed() {
        document.getElementById('live-results').innerHTML = '';
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('results-container');
        const totalFound = document.getElementById('total-found');
        
        totalFound.textContent = `${data.found_count} active subdomains found`;
        resultsContainer.innerHTML = '';

        if (this.filteredResults.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #aaa;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No Results Found</h3>
                    <p>Try adjusting your filters or scanning a different domain.</p>
                </div>
            `;
            return;
        }

        this.filteredResults.forEach(result => {
            const card = this.createSubdomainCard(result);
            resultsContainer.appendChild(card);
        });
    }

    createSubdomainCard(result) {
        const card = document.createElement('div');
        card.className = 'subdomain-card';
        
        card.innerHTML = `
            <div class="subdomain-header">
                <a href="${result.url}" target="_blank" class="subdomain-url">
                    <i class="fas fa-external-link-alt"></i>
                    ${result.subdomain}
                </a>
                <span class="status-badge status-${result.status_code}">
                    <i class="fas fa-circle"></i>
                    ${result.status_code}
                </span>
            </div>
            <div class="subdomain-details">
                <div class="detail-item">
                    <div class="detail-label">Title</div>
                    <div class="detail-value">${result.title || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Server</div>
                    <div class="detail-value">${result.server || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Content Type</div>
                    <div class="detail-value">${result.content_type || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Response Time</div>
                    <div class="detail-value">${result.response_time ? (result.response_time * 1000).toFixed(0) + 'ms' : 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Content Length</div>
                    <div class="detail-value">${result.content_length ? result.content_length.toLocaleString() + ' bytes' : 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Final URL</div>
                    <div class="detail-value">${result.final_url || result.url}</div>
                </div>
            </div>
        `;

        return card;
    }

    toggleFilters() {
        const filterSection = document.getElementById('filter-section');
        filterSection.style.display = filterSection.style.display === 'none' ? 'block' : 'none';
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-filter')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';

        this.filteredResults = this.currentResults.filter(result => {
            const matchesSearch = result.subdomain.toLowerCase().includes(searchTerm) ||
                                (result.title && result.title.toLowerCase().includes(searchTerm));
            const matchesStatus = !statusFilter || result.status_code.toString() === statusFilter;
            
            return matchesSearch && matchesStatus;
        });

        this.displayResults({ found_count: this.filteredResults.length });
    }

    sortResults() {
        const sortOptions = ['subdomain', 'status_code', 'response_time', 'content_length'];
        const currentIndex = sortOptions.indexOf(this.currentSort);
        this.currentSort = sortOptions[(currentIndex + 1) % sortOptions.length];

        this.filteredResults.sort((a, b) => {
            switch (this.currentSort) {
                case 'subdomain':
                    return a.subdomain.localeCompare(b.subdomain);
                case 'status_code':
                    return a.status_code - b.status_code;
                case 'response_time':
                    return (a.response_time || 0) - (b.response_time || 0);
                case 'content_length':
                    return (a.content_length || 0) - (b.content_length || 0);
                default:
                    return 0;
            }
        });

        this.displayResults({ found_count: this.filteredResults.length });
        this.showNotification(`Sorted by ${this.currentSort.replace('_', ' ')}`, 'info');
    }

    // FIXED EXPORT FUNCTIONALITY
    exportResults() {
        if (this.currentResults.length === 0) {
            this.showNotification('No results to export', 'error');
            return;
        }

        try {
            const csvContent = this.generateCSV(this.filteredResults);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Create download link
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `subhunter-results-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            this.showNotification(`Exported ${this.filteredResults.length} results successfully`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed. Please try again.', 'error');
        }
    }

    generateCSV(results) {
        const headers = [
            'Subdomain', 
            'URL', 
            'Status Code', 
            'Title', 
            'Server', 
            'Content Type', 
            'Response Time (ms)', 
            'Content Length (bytes)',
            'Final URL'
        ];
        
        const csvRows = [headers.join(',')];

        results.forEach(result => {
            const row = [
                `"${result.subdomain || ''}"`,
                `"${result.url || ''}"`,
                result.status_code || '',
                `"${(result.title || '').replace(/"/g, '""')}"`,
                `"${result.server || ''}"`,
                `"${result.content_type || ''}"`,
                result.response_time ? Math.round(result.response_time * 1000) : '',
                result.content_length || '',
                `"${result.final_url || result.url || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) {
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.subHunterPro = new SubHunterPro();
});
