class AdvancedSubdomainFinder {
    constructor() {
        this.isScanning = false;
        this.currentResults = [];
        this.filteredResults = [];
        this.scanStartTime = null;
        this.currentSort = 'subdomain';
        this.initializeVanta();
        this.bindEvents();
    }

    initializeVanta() {
        // Enhanced Vanta.js NET effect
        VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x00ffff,
            backgroundColor: 0x0a0a0a,
            points: 20.00,
            maxDistance: 30.00,
            spacing: 18.00,
            showDots: true
        });
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
        exportBtn.addEventListener('click', () => this.exportResults());
        filterBtn.addEventListener('click', () => this.toggleFilters());
        sortBtn.addEventListener('click', () => this.sortResults());
        
        if (searchFilter) {
            searchFilter.addEventListener('input', () => this.applyFilters());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        // Auto-focus domain input
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

        if (!this.isValidDomain(domain)) {
            this.showNotification('Please enter a valid domain', 'error');
            return;
        }

        this.isScanning = true;
        this.scanStartTime = Date.now();
        this.updateScanButton(true);
        this.showStatsSection();
        this.showProgressSection();
        this.hideResultsSection();

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
            this.handleScanResults(data);

        } catch (error) {
            console.error('Scan error:', error);
            this.showNotification('Advanced scan failed. Please try again.', 'error');
        } finally {
            this.isScanning = false;
            this.updateScanButton(false);
            this.hideProgressSection();
        }
    }

    isValidDomain(domain) {
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        return domainRegex.test(domain.replace(/^https?:\/\//, ''));
    }

    updateScanButton(scanning) {
        const scanBtn = document.getElementById('scan-btn');
        const btnText = scanBtn.querySelector('.btn-text');
        const btnLoader = scanBtn.querySelector('.btn-loader');
        const btnIcon = scanBtn.querySelector('.btn-icon');

        if (scanning) {
            btnText.textContent = 'Advanced Scanning...';
            btnLoader.style.display = 'inline-block';
            btnIcon.className = 'fas fa-spinner fa-spin btn-icon';
            scanBtn.disabled = true;
        } else {
            btnText.textContent = 'Start Advanced Scan';
            btnLoader.style.display = 'none';
            btnIcon.className = 'fas fa-search btn-icon';
            scanBtn.disabled = false;
        }
    }

    showStatsSection() {
        const statsSection = document.getElementById('stats-section');
        statsSection.style.display = 'grid';
    }

    showProgressSection() {
        const progressSection = document.getElementById('progress-section');
        progressSection.style.display = 'block';
        this.simulateAdvancedProgress();
    }

    hideProgressSection() {
        const progressSection = document.getElementById('progress-section');
        progressSection.style.display = 'none';
    }

    simulateAdvancedProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressPercentage = document.getElementById('progress-percentage');
        const currentStatus = document.getElementById('current-status');
        const eta = document.getElementById('eta');
        
        let progress = 0;
        let statusMessages = [
            'Loading massive wordlist...',
            'Initializing DNS resolvers...',
            'Starting multi-threaded scan...',
            'Probing HTTP/HTTPS endpoints...',
            'Validating SSL certificates...',
            'Analyzing response headers...',
            'Extracting page titles...',
            'Finalizing results...'
        ];
        let currentStatusIndex = 0;
        
        const interval = setInterval(() => {
            if (!this.isScanning) {
                clearInterval(interval);
                return;
            }
            
            progress += Math.random() * 12;
            if (progress > 95) progress = 95;
            
            // Update status message
            if (Math.random() > 0.7 && currentStatusIndex < statusMessages.length - 1) {
                currentStatusIndex++;
            }
            
            // Calculate ETA
            const elapsed = (Date.now() - this.scanStartTime) / 1000;
            const estimatedTotal = elapsed / (progress / 100);
            const remaining = Math.max(0, estimatedTotal - elapsed);
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = 'Advanced scanning in progress...';
            progressPercentage.textContent = `${Math.floor(progress)}%`;
            currentStatus.textContent = statusMessages[currentStatusIndex];
            eta.textContent = `ETA: ${Math.floor(remaining)}s`;
            
        }, 800);
    }

    handleScanResults(data) {
        this.currentResults = data.subdomains;
        this.filteredResults = [...this.currentResults];
        
        // Update stats
        document.getElementById('wordlist-count').textContent = data.wordlist_size.toLocaleString();
        document.getElementById('scanned-count').textContent = data.total_checked.toLocaleString();
        document.getElementById('found-count').textContent = data.found_count.toLocaleString();
        
        const successRate = data.total_checked > 0 ? ((data.found_count / data.total_checked) * 100).toFixed(2) : 0;
        document.getElementById('success-rate').textContent = `${successRate}%`;
        
        this.displayResults(data);
        this.showResultsSection();
        
        if (data.found_count > 0) {
            this.showNotification(`🎉 Found ${data.found_count} active subdomains with advanced scanning!`, 'success');
        } else {
            this.showNotification('No active subdomains found with current wordlist', 'info');
        }
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('results-container');
        const totalFound = document.getElementById('total-found');
        
        totalFound.textContent = `${data.found_count} active subdomains found`;
        resultsContainer.innerHTML = '';

        if (this.filteredResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 3rem; color: #aaa;">
                    <h3><i class="fas fa-search"></i> No results match your criteria</h3>
                    <p>Try adjusting your filters or scanning a different domain.</p>
                </div>
            `;
            return;
        }

        this.filteredResults.forEach(subdomain => {
            const card = this.createAdvancedSubdomainCard(subdomain);
            resultsContainer.appendChild(card);
        });
    }

    createAdvancedSubdomainCard(subdomain) {
        const card = document.createElement('div');
        card.className = 'subdomain-card';
        
        const statusClass = `status-${subdomain.status_code}`;
        const responseTime = subdomain.response_time ? `${(subdomain.response_time * 1000).toFixed(0)}ms` : 'N/A';
        
        card.innerHTML = `
            <div class="subdomain-header">
                <a href="${subdomain.url}" target="_blank" class="subdomain-url">
                    <i class="fas fa-external-link-alt"></i>
                    ${subdomain.subdomain}
                </a>
                <span class="status-badge ${statusClass}">
                    <i class="fas fa-circle"></i>
                    ${subdomain.status_code}
                </span>
            </div>
            <div class="subdomain-details">
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-clock"></i> Response Time</span>
                    <span class="detail-value">${responseTime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-database"></i> Content Length</span>
                    <span class="detail-value">${this.formatBytes(subdomain.content_length)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-server"></i> Server</span>
                    <span class="detail-value">${subdomain.server}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-file-alt"></i> Content Type</span>
                    <span class="detail-value">${subdomain.content_type || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-heading"></i> Page Title</span>
                    <span class="detail-value">${subdomain.title}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-link"></i> Final URL</span>
                    <span class="detail-value">${subdomain.final_url || subdomain.url}</span>
                </div>
            </div>
            ${subdomain.ssl_info ? this.createSSLInfo(subdomain.ssl_info) : ''}
        `;
        
        return card;
    }

    createSSLInfo(sslInfo) {
        if (!sslInfo || !sslInfo.subject) return '';
        
        return `
            <div class="ssl-info">
                <strong><i class="fas fa-lock"></i> SSL Certificate:</strong><br>
                Subject: ${sslInfo.subject.commonName || 'N/A'}<br>
                Issuer: ${sslInfo.issuer.organizationName || 'N/A'}<br>
                Expires: ${sslInfo.not_after || 'N/A'}
            </div>
        `;
    }

    toggleFilters() {
        const filterSection = document.getElementById('filter-section');
        const isVisible = filterSection.style.display !== 'none';
        filterSection.style.display = isVisible ? 'none' : 'block';
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-filter').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;
        
        this.filteredResults = this.currentResults.filter(subdomain => {
            const matchesSearch = !searchTerm || 
                subdomain.subdomain.toLowerCase().includes(searchTerm) ||
                subdomain.title.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || 
                subdomain.status_code.toString() === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        this.displayResults({
            found_count: this.filteredResults.length,
            subdomains: this.filteredResults
        });
    }

    sortResults() {
        const sortOptions = ['subdomain', 'status_code', 'response_time', 'content_length'];
        const currentSort = this.currentSort || 'subdomain';
        const nextSortIndex = (sortOptions.indexOf(currentSort) + 1) % sortOptions.length;
        const nextSort = sortOptions[nextSortIndex];
        
        this.filteredResults.sort((a, b) => {
            switch (nextSort) {
                case 'status_code':
                    return a.status_code - b.status_code;
                case 'response_time':
                    return (a.response_time || 0) - (b.response_time || 0);
                case 'content_length':
                    return b.content_length - a.content_length;
                default:
                    return a.subdomain.localeCompare(b.subdomain);
            }
        });
        
        this.currentSort = nextSort;
        this.displayResults({
            found_count: this.filteredResults.length,
            subdomains: this.filteredResults
        });
        
        this.showNotification(`Sorted by ${nextSort.replace('_', ' ')}`, 'info');
    }

    showResultsSection() {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideResultsSection() {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'none';
    }

    exportResults() {
        if (this.filteredResults.length === 0) {
            this.showNotification('No results to export', 'error');
            return;
        }

        const csvContent = this.generateAdvancedCSV(this.filteredResults);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `advanced_subdomains_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification(`📊 Exported ${this.filteredResults.length} results successfully!`, 'success');
    }

    generateAdvancedCSV(results) {
        const headers = [
            'Subdomain', 'URL', 'Status Code', 'Response Time (ms)', 
            'Content Length', 'Server', 'Content Type', 'Title', 'Final URL'
        ];
        
        const rows = results.map(item => [
            item.subdomain,
            item.url,
            item.status_code,
            item.response_time ? (item.response_time * 1000).toFixed(0) : 'N/A',
            item.content_length,
            item.server,
            item.content_type || 'Unknown',
            `"${item.title.replace(/"/g, '""')}"`,
            item.final_url || item.url
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            info: 'info-circle',
            warning: 'exclamation-circle'
        };
        return icons[type] || 'info-circle';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: '500',
            zIndex: '9999',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.4s ease',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            maxWidth: '400px'
        });

        const colors = {
            success: 'rgba(0, 255, 0, 0.9)',
            error: 'rgba(255, 0, 0, 0.9)',
            info: 'rgba(0, 255, 255, 0.9)',
            warning: 'rgba(255, 255, 0, 0.9)'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedSubdomainFinder();
});
