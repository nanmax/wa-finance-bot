// Dashboard JavaScript
class FinanceDashboard {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.loadSummary();
        await this.loadTransactions();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addManualTransaction();
        });
    }

    async loadSummary() {
        try {
            const response = await fetch(`${this.apiBase}/summary`);
            const summary = await response.json();
            
            document.getElementById('totalBalance').textContent = this.formatCurrency(summary.balance);
            document.getElementById('totalIncome').textContent = this.formatCurrency(summary.totalIncome);
            document.getElementById('totalExpense').textContent = this.formatCurrency(summary.totalExpense);
            document.getElementById('totalTransactions').textContent = summary.totalTransactions;
            
        } catch (error) {
            console.error('Error loading summary:', error);
            this.showError('Gagal memuat ringkasan data');
        }
    }

    async loadTransactions() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/transactions?limit=50`);
            const transactions = await response.json();
            
            this.renderTransactions(transactions);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Gagal memuat data transaksi');
            this.showLoading(false);
        }
    }

    renderTransactions(transactions) {
        const tbody = document.getElementById('transactionsTable');
        
        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Belum ada transaksi</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(transaction => `
            <tr class="transaction-item ${transaction.type === 'income' ? 'table-success' : 'table-danger'}">
                <td>${transaction.id}</td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'bg-success' : 'bg-danger'}">
                        ${transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                </td>
                <td class="fw-bold">Rp ${this.formatCurrency(transaction.amount)}</td>
                <td>${transaction.description}</td>
                <td>${transaction.category}</td>
                <td>${transaction.author}</td>
                <td>${this.formatDate(transaction.timestamp)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async addManualTransaction() {
        const formData = {
            type: document.getElementById('transactionType').value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            author: document.getElementById('author').value
        };

        try {
            const response = await fetch(`${this.apiBase}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showSuccess('Transaksi berhasil ditambahkan');
                document.getElementById('transactionForm').reset();
                await this.loadSummary();
                await this.loadTransactions();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Gagal menambahkan transaksi');
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            this.showError('Gagal menambahkan transaksi');
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/transactions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Transaksi berhasil dihapus');
                await this.loadSummary();
                await this.loadTransactions();
            } else {
                this.showError('Gagal menghapus transaksi');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showError('Gagal menghapus transaksi');
        }
    }

    async clearAllTransactions() {
        if (!confirm('Apakah Anda yakin ingin menghapus semua transaksi? Tindakan ini tidak dapat dibatalkan!')) {
            return;
        }

        try {
            const transactions = await this.getAllTransactions();
            
            for (const transaction of transactions) {
                await fetch(`${this.apiBase}/transactions/${transaction.id}`, {
                    method: 'DELETE'
                });
            }

            this.showSuccess('Semua transaksi berhasil dihapus');
            await this.loadSummary();
            await this.loadTransactions();
        } catch (error) {
            console.error('Error clearing transactions:', error);
            this.showError('Gagal menghapus semua transaksi');
        }
    }

    async getAllTransactions() {
        const response = await fetch(`${this.apiBase}/transactions?limit=1000`);
        return await response.json();
    }

    async refreshData() {
        await this.loadSummary();
        await this.loadTransactions();
        this.showSuccess('Data berhasil diperbarui');
    }

    startAutoRefresh() {
        // Auto refresh every 30 seconds
        setInterval(() => {
            this.loadSummary();
        }, 30000);
    }

    showLoading(show) {
        const loading = document.querySelector('.loading');
        if (show) {
            loading.style.display = 'block';
        } else {
            loading.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Global functions for onclick handlers
function refreshData() {
    dashboard.refreshData();
}

function clearAllTransactions() {
    dashboard.clearAllTransactions();
}

// Initialize dashboard
const dashboard = new FinanceDashboard(); 